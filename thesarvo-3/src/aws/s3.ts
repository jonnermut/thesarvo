/**
 * The S3 calls the API and the site deploy need, signed with AWS Signature V4 using the Lambda role's credentials
 * (from the environment). Hand-written to keep the AWS SDK out of the function bundle.
 */
import { createHash, createHmac } from 'node:crypto'

export type Credentials = { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
export type Bucket = { name: string; region: string }

const hmac = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest()
const sha256 = (data: string) => createHash('sha256').update(data).digest('hex')

/** The key that signs one day's requests to one service in one region. */
export const signingKey = (secret: string, date: string, region: string, service: string) =>
  hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), 'aws4_request')

/** `20261027T040809Z` */
export const amzDate = (now: Date) => now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')

export const credentialsFromEnv = (env = process.env): Credentials | null =>
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY, sessionToken: env.AWS_SESSION_TOKEN }
    : null

export const bucketUrl = (b: Bucket) => `https://${b.name}.s3.${b.region}.amazonaws.com/`

export type PresignedPost = { url: string; fields: Record<string, string> }

/**
 * A browser form upload of exactly one object: S3 refuses any other key, a size outside `maxBytes`,
 * or a content type that does not start with `typePrefix`, and refuses everything after `expiresIn` seconds.
 */
export function presignedPost(
  b: Bucket,
  c: Credentials,
  o: { key: string; maxBytes: number; typePrefix: string; expiresIn: number; cacheControl?: string; now?: Date },
): PresignedPost {
  const now = o.now ?? new Date()
  const date = amzDate(now)
  const credential = `${c.accessKeyId}/${date.slice(0, 8)}/${b.region}/s3/aws4_request`
  const fields: Record<string, string> = {
    key: o.key,
    ...(o.cacheControl && { 'Cache-Control': o.cacheControl }),
    'x-amz-algorithm': 'AWS4-HMAC-SHA256',
    'x-amz-credential': credential,
    'x-amz-date': date,
    ...(c.sessionToken && { 'x-amz-security-token': c.sessionToken }),
  }
  const policy = Buffer.from(
    JSON.stringify({
      expiration: new Date(now.getTime() + o.expiresIn * 1000).toISOString(),
      conditions: [
        { bucket: b.name },
        ...Object.entries(fields).map(([k, v]) => ({ [k]: v })),
        ['content-length-range', 1, o.maxBytes],
        ['starts-with', '$Content-Type', o.typePrefix],
      ],
    }),
  ).toString('base64')
  const signature = hmac(signingKey(c.secretAccessKey, date.slice(0, 8), b.region, 's3'), policy).toString('hex')
  return { url: bucketUrl(b), fields: { ...fields, policy, 'x-amz-signature': signature } }
}

/** The `Authorization` and `x-amz-*` headers for a request; `payload` is the SHA-256 (hex) of its body, empty by default. */
export function signedHeaders(method: string, url: URL, region: string, c: Credentials, now = new Date(), payload = sha256('')): Record<string, string> {
  const date = amzDate(now)
  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': payload,
    'x-amz-date': date,
    ...(c.sessionToken && { 'x-amz-security-token': c.sessionToken }),
  }
  const names = Object.keys(headers).sort()
  const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`)
  const query = [...url.searchParams].map(([k, v]) => `${enc(k)}=${enc(v)}`).sort().join('&')
  // Each header line ends in a newline, so the header block is followed by a blank line.
  const request = [method, url.pathname, query, names.map((n) => `${n}:${headers[n]}\n`).join(''), names.join(';'), payload].join('\n')
  const scope = `${date.slice(0, 8)}/${region}/s3/aws4_request`
  const toSign = ['AWS4-HMAC-SHA256', date, scope, sha256(request)].join('\n')
  const signature = hmac(signingKey(c.secretAccessKey, date.slice(0, 8), region, 's3'), toSign).toString('hex')
  const { host: _host, ...rest } = headers
  return { ...rest, authorization: `AWS4-HMAC-SHA256 Credential=${c.accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}` }
}

/** The keys under `prefix` (at most 1,000, which is far more than any guide has photos). */
export async function listKeys(b: Bucket, c: Credentials, prefix: string): Promise<string[]> {
  const url = new URL(bucketUrl(b))
  url.searchParams.set('list-type', '2')
  url.searchParams.set('prefix', prefix)
  const res = await fetch(url, { headers: signedHeaders('GET', url, b.region, c) })
  if (!res.ok) throw new Error(`S3 list failed (${res.status})`)
  return [...(await res.text()).matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => unescapeXml(m[1]))
}

const unescapeXml = (s: string) =>
  s.replace(/&(lt|gt|quot|apos|amp);/g, (_, e: string) => ({ lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' })[e] ?? '')

export type Listed = { key: string; etag: string }

/** Every object under `prefix` with its ETag, which for a single-part upload is the MD5 of its content. */
export async function listObjects(b: Bucket, c: Credentials, prefix: string): Promise<Listed[]> {
  const found: Listed[] = []
  for (let token = ''; ; ) {
    const url = new URL(bucketUrl(b))
    url.searchParams.set('list-type', '2')
    url.searchParams.set('prefix', prefix)
    if (token) url.searchParams.set('continuation-token', token)
    const res = await fetch(url, { headers: signedHeaders('GET', url, b.region, c) })
    if (!res.ok) throw new Error(`S3 list failed (${res.status})`)
    const xml = await res.text()
    for (const m of xml.matchAll(/<Contents>.*?<Key>([^<]*)<\/Key>.*?<ETag>([^<]*)<\/ETag>.*?<\/Contents>/gs)) found.push({ key: unescapeXml(m[1]), etag: unescapeXml(m[2]).replaceAll('"', '') })
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? (/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(xml)?.[1] ?? '') : ''
    if (!token) return found
  }
}

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/')

export async function putObject(b: Bucket, c: Credentials, key: string, body: Buffer, o: { contentType: string; cacheControl: string }): Promise<void> {
  const url = new URL(`${bucketUrl(b)}${encodeKey(key)}`)
  const headers = { ...signedHeaders('PUT', url, b.region, c, new Date(), createHash('sha256').update(body).digest('hex')), 'content-type': o.contentType, 'cache-control': o.cacheControl }
  const res = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(body) })
  if (!res.ok) throw new Error(`S3 put ${key} failed (${res.status})`)
}

export async function deleteObject(b: Bucket, c: Credentials, key: string): Promise<void> {
  const url = new URL(`${bucketUrl(b)}${encodeKey(key)}`)
  const res = await fetch(url, { method: 'DELETE', headers: signedHeaders('DELETE', url, b.region, c) })
  if (!res.ok) throw new Error(`S3 delete ${key} failed (${res.status})`)
}

/** The object's bytes, or null when there is no such key. */
export async function getObject(b: Bucket, c: Credentials, key: string): Promise<Buffer | null> {
  const url = new URL(`${bucketUrl(b)}${encodeKey(key)}`)
  const res = await fetch(url, { headers: signedHeaders('GET', url, b.region, c) })
  if (res.status === 404 || res.status === 403) return null
  if (!res.ok) throw new Error(`S3 get ${key} failed (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

/** The object's bytes and its ETag, or null when there is no such key. */
export async function getObjectTagged(b: Bucket, c: Credentials, key: string): Promise<{ body: Buffer; etag: string } | null> {
  const url = new URL(`${bucketUrl(b)}${encodeKey(key)}`)
  const res = await fetch(url, { headers: signedHeaders('GET', url, b.region, c) })
  if (res.status === 404 || res.status === 403) return null
  if (!res.ok) throw new Error(`S3 get ${key} failed (${res.status})`)
  return { body: Buffer.from(await res.arrayBuffer()), etag: res.headers.get('etag') ?? '' }
}

/**
 * Writes an object only if nobody changed it since `etag` was read (`null`: only if it does not exist yet). False when someone
 * did (S3 answers 412, or 409 for a write racing another); the caller reads again and retries.
 */
export async function putObjectIf(b: Bucket, c: Credentials, key: string, body: Buffer, etag: string | null, o: { contentType: string; cacheControl: string }): Promise<boolean> {
  const url = new URL(`${bucketUrl(b)}${encodeKey(key)}`)
  const headers = {
    ...signedHeaders('PUT', url, b.region, c, new Date(), createHash('sha256').update(body).digest('hex')),
    'content-type': o.contentType,
    'cache-control': o.cacheControl,
    ...(etag === null ? { 'if-none-match': '*' } : { 'if-match': etag }),
  }
  const res = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(body) })
  if (res.status === 412 || res.status === 409) return false
  if (!res.ok) throw new Error(`S3 put ${key} failed (${res.status})`)
  return true
}

/** A link that lets anyone holding it read one object until `expiresIn` seconds pass: for photos in a prefix the bucket does not serve publicly. */
export function presignedGet(b: Bucket, c: Credentials, key: string, expiresIn: number, now = new Date()): string {
  const date = amzDate(now)
  const scope = `${date.slice(0, 8)}/${b.region}/s3/aws4_request`
  const url = new URL(`${bucketUrl(b)}${encodeKey(key)}`)
  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${c.accessKeyId}/${scope}`,
    'X-Amz-Date': date,
    'X-Amz-Expires': String(expiresIn),
    ...(c.sessionToken && { 'X-Amz-Security-Token': c.sessionToken }),
    'X-Amz-SignedHeaders': 'host',
  }
  const enc = (v: string) => encodeURIComponent(v).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`)
  const query = Object.entries(params).sort(([a], [b2]) => (a < b2 ? -1 : 1)).map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&')
  const request = ['GET', url.pathname, query, `host:${url.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
  const signature = hmac(signingKey(c.secretAccessKey, date.slice(0, 8), b.region, 's3'), ['AWS4-HMAC-SHA256', date, scope, sha256(request)].join('\n')).toString('hex')
  return `${url.origin}${url.pathname}?${query}&X-Amz-Signature=${signature}`
}
