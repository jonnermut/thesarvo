// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bucketImageNames, imageBucket, uploadTicket } from './bucketImages'
import { freeName } from './paths'

const bucket = { name: 'thesarvo-content', region: 'ap-southeast-2' }
const creds = { accessKeyId: 'AKID', secretAccessKey: 'secret', sessionToken: 'tok' }

/** S3 answers a listing of images/123/ with these keys. */
const listing = (...keys: string[]) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(`<ListBucketResult>${keys.map((k) => `<Key>${k}</Key>`).join('')}</ListBucketResult>`))

afterEach(() => void vi.restoreAllMocks())

describe('freeName', () => {
  it('keeps a free name and numbers a taken one', () => {
    expect(freeName('a.jpg', new Set())).toBe('a.jpg')
    expect(freeName('a.jpg', new Set(['a.jpg', 'a-2.jpg']))).toBe('a-3.jpg')
  })
})

describe('bucket images', () => {
  it('is set up only with a bucket and credentials', () => {
    expect(imageBucket({ IMAGE_BUCKET: 'b' })).toBeNull()
    expect(imageBucket({ IMAGE_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's', AWS_REGION: 'us-east-1' })?.bucket).toEqual({ name: 'b', region: 'us-east-1' })
  })

  it('lists a guide’s photos by name, signed', async () => {
    const fetch = listing('images/123/A Topo.jpg', 'images/123/b&amp;c.png', 'images/123/sub/x.jpg')
    expect(await bucketImageNames(bucket, creds, '123')).toEqual(['A Topo.jpg', 'b&c.png'])
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit]
    expect(url.searchParams.get('prefix')).toBe('images/123/')
    expect((init.headers as Record<string, string>).authorization).toMatch(/^AWS4-HMAC-SHA256 /)
  })

  it('gives an upload a name no other photo has, case aside', async () => {
    listing('images/123/Topo.jpg')
    const t = await uploadTicket(bucket, creds, '123', 'C:\\pics\\topo.JPG', 1000)
    expect(t.name).toBe('topo-2.jpg')
    expect(t.fields.key).toBe('images/123/topo-2.jpg')
    expect(t.fields['Cache-Control']).toContain('immutable')
  })

  it('refuses what cannot be a photo of a guide', async () => {
    listing()
    await expect(uploadTicket(bucket, creds, '123', 'notes.txt', 10)).rejects.toThrow('Not a supported image')
    await expect(uploadTicket(bucket, creds, '../x', 'a.jpg', 10)).rejects.toThrow('Not a supported image')
    await expect(uploadTicket(bucket, creds, '123', 'a.jpg', 26 * 1024 * 1024)).rejects.toThrow('over 25 MB')
    await expect(uploadTicket(bucket, creds, '123', 'a.jpg', 0)).rejects.toThrow('over 25 MB')
  })
})
