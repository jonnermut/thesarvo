/**
 * The two S3 calls the API needs, signed with AWS Signature V4 using the Lambda role's credentials
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

/** The `Authorization` and `x-amz-*` headers for a request with no body. */
export function signedHeaders(method: string, url: URL, region: string, c: Credentials, now = new Date()): Record<string, string> {
  const date = amzDate(now)
  const payload = sha256('')
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
