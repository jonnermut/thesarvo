/**
 * Guide photos in the content bucket (`images/<guideId>/<name>`), for the static site's API on Lambda.
 * The browser uploads straight to S3 with a presigned form, so photos never pass through the function
 * (whose request body is capped at 6 MB).
 */
import { credentialsFromEnv, listKeys, presignedPost } from '#/aws/s3'
import type { Bucket, Credentials, PresignedPost } from '#/aws/s3'
import { freeName, MAX_IMAGE_BYTES, uploadName } from './paths'

/** Set on the Lambda (scripts/deploy-lambda.sh); without it the API answers 501. */
export function imageBucket(env = process.env): { bucket: Bucket; creds: Credentials } | null {
  const creds = credentialsFromEnv(env)
  return env.IMAGE_BUCKET && creds ? { bucket: { name: env.IMAGE_BUCKET, region: env.AWS_REGION ?? 'ap-southeast-2' }, creds } : null
}

/** Photos of a private guide are under `private/`, which the bucket does not serve publicly: they are read through signed links (see src/routes/g.api.private.tsx). */
const prefix = (guideId: string, hidden = false) => `${hidden ? 'private/' : ''}images/${guideId}/`

export async function bucketImageNames(b: Bucket, c: Credentials, guideId: string, hidden = false): Promise<string[]> {
  return (await listKeys(b, c, prefix(guideId, hidden))).map((k) => k.slice(prefix(guideId, hidden).length)).filter((n) => n && !n.includes('/'))
}

export type UploadTicket = PresignedPost & { name: string }

/** A one-off form for uploading `fileName` under a name no other photo of the guide has. Throws a message for the user. */
export async function uploadTicket(b: Bucket, c: Credentials, guideId: string, fileName: string, size: number, hidden = false): Promise<UploadTicket> {
  const name = uploadName(fileName)
  if (!/^\d+$/.test(guideId) || !name) throw new Error('Not a supported image (JPEG, PNG or GIF)')
  if (!(size > 0 && size <= MAX_IMAGE_BYTES)) throw new Error('Image is over 25 MB')
  const taken = new Set((await bucketImageNames(b, c, guideId, hidden)).map((n) => n.toLowerCase()))
  const stored = freeName(name, taken)
  const post = presignedPost(b, c, {
    key: prefix(guideId, hidden) + stored,
    maxBytes: MAX_IMAGE_BYTES,
    typePrefix: 'image/',
    expiresIn: 600,
    // A stored name is never reused, so the photo can be cached for good.
    cacheControl: `${hidden ? 'private' : 'public'}, max-age=31536000, immutable`,
  })
  return { ...post, name: stored }
}
