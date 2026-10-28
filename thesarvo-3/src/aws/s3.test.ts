// @vitest-environment node
import { createHash, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { amzDate, presignedGet, presignedPost, signedHeaders, signingKey } from './s3'

// The example keys from the AWS Signature V4 documentation.
const creds = { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }

describe('signature v4', () => {
  it('derives the documented signing key', () => {
    expect(signingKey('wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', '20120215', 'us-east-1', 'iam').toString('hex')).toBe(
      'f4780e2d9f65fa895f9c67b32ce1baf0b0d8a43505a000a1a9e090d414db404d',
    )
  })

  it('signs the documented bucket listing', () => {
    const url = new URL('https://examplebucket.s3.amazonaws.com/?max-keys=2&prefix=J')
    const h = signedHeaders('GET', url, 'us-east-1', creds, new Date('2013-05-24T00:00:00Z'))
    expect(h.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7',
    )
    expect(h['x-amz-date']).toBe('20130524T000000Z')
  })

  it('signs the session token too', () => {
    const url = new URL('https://b.s3.ap-southeast-2.amazonaws.com/?list-type=2&prefix=images/1/')
    const h = signedHeaders('GET', url, 'ap-southeast-2', { ...creds, sessionToken: 'tok' })
    expect(h['x-amz-security-token']).toBe('tok')
    expect(h.authorization).toContain('SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token,')
  })

  it('formats dates without separators or milliseconds', () => {
    expect(amzDate(new Date('2026-10-27T04:08:09.123Z'))).toBe('20261027T040809Z')
  })
})

describe('presignedPost', () => {
  const now = new Date('2026-10-27T00:00:00Z')
  const post = presignedPost({ name: 'thesarvo-content', region: 'ap-southeast-2' }, { ...creds, sessionToken: 'tok' }, {
    key: 'images/123/a.jpg',
    maxBytes: 100,
    typePrefix: 'image/',
    expiresIn: 300,
    cacheControl: 'public, max-age=31536000',
    now,
  })
  const policy = JSON.parse(Buffer.from(post.fields.policy, 'base64').toString()) as { expiration: string; conditions: unknown[] }

  it('posts to the bucket with every signed field', () => {
    expect(post.url).toBe('https://thesarvo-content.s3.ap-southeast-2.amazonaws.com/')
    expect(post.fields).toMatchObject({
      key: 'images/123/a.jpg',
      'x-amz-credential': 'AKIAIOSFODNN7EXAMPLE/20261027/ap-southeast-2/s3/aws4_request',
      'x-amz-security-token': 'tok',
    })
  })

  it('pins the key, size, type and expiry in the policy', () => {
    expect(policy.expiration).toBe('2026-10-27T00:05:00.000Z')
    expect(policy.conditions).toContainEqual({ bucket: 'thesarvo-content' })
    expect(policy.conditions).toContainEqual({ key: 'images/123/a.jpg' })
    expect(policy.conditions).toContainEqual({ 'x-amz-security-token': 'tok' })
    expect(policy.conditions).toContainEqual(['content-length-range', 1, 100])
    expect(policy.conditions).toContainEqual(['starts-with', '$Content-Type', 'image/'])
  })

  it('signs the policy with the day key', () => {
    const key = signingKey(creds.secretAccessKey, '20261027', 'ap-southeast-2', 's3')
    expect(post.fields['x-amz-signature']).toBe(createHmac('sha256', key).update(post.fields.policy).digest('hex'))
  })
})

describe('uploads', () => {
  it('signs the hash of the body it sends', () => {
    const url = new URL('https://examplebucket.s3.amazonaws.com/test%24file.text')
    const body = 'Welcome to Amazon S3.'
    const h = signedHeaders('PUT', url, 'us-east-1', creds, new Date('2013-05-24T00:00:00Z'), createHash('sha256').update(body).digest('hex'))
    expect(h['x-amz-content-sha256']).toBe('44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072')
    expect(h.authorization).toContain('SignedHeaders=host;x-amz-content-sha256;x-amz-date,')
  })
})

describe('presignedGet', () => {
  const keys = { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
  const bucket = { name: 'examplebucket', region: 'us-east-1' }
  const now = new Date('2013-05-24T00:00:00Z')

  it('signs the canonical request the way S3 documents for query-string auth', () => {
    const link = new URL(presignedGet(bucket, keys, 'private/images/12/a b.jpg', 86400, now))
    const signature = link.searchParams.get('X-Amz-Signature')
    link.searchParams.delete('X-Amz-Signature')
    const query = [...link.searchParams].map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).sort().join('&')
    const canonical = ['GET', '/private/images/12/a%20b.jpg', query, 'examplebucket.s3.us-east-1.amazonaws.com'.replace(/^/, 'host:') + '\n', 'host', 'UNSIGNED-PAYLOAD'].join('\n')
    const toSign = ['AWS4-HMAC-SHA256', '20130524T000000Z', '20130524/us-east-1/s3/aws4_request', createHash('sha256').update(canonical).digest('hex')].join('\n')
    expect(signature).toBe(createHmac('sha256', signingKey(keys.secretAccessKey, '20130524', 'us-east-1', 's3')).update(toSign).digest('hex'))
    expect(link.searchParams.get('X-Amz-Expires')).toBe('86400')
    expect(link.searchParams.get('X-Amz-Credential')).toBe('AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request')
  })

  it('carries a session token, which changes the signature', () => {
    const plain = presignedGet(bucket, keys, 'k', 60, now)
    const withToken = presignedGet(bucket, { ...keys, sessionToken: 'tok/en' }, 'k', 60, now)
    expect(withToken).toContain('X-Amz-Security-Token=tok%2Fen')
    expect(withToken.split('X-Amz-Signature=')[1]).not.toBe(plain.split('X-Amz-Signature=')[1])
  })
})
