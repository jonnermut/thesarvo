import { GUIDE_PREFIX, MAX_IMAGE_BYTES } from '#/guide/content/paths'

/** Longest edge kept when a photo is shrunk before upload; plenty for a topo on any screen. */
const MAX_EDGE = 3200

/** iPhones shoot HEIC; most browsers (not Safari) cannot show it, so it is always converted. */
export const isHeicFile = (file: Pick<File, 'type' | 'name'>) => /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)

/** Photos carry their rotation as an EXIF tag that other software ignores, so JPEG and HEIC are always re-drawn upright. */
export const needsRecode = (file: Pick<File, 'type' | 'name'>) => isHeicFile(file) || /^image\/jpe?g$/i.test(file.type)

async function decode(file: File): Promise<ImageBitmap> {
  try {
    // Applies the EXIF rotation. Safari also decodes HEIC here.
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (e) {
    if (!isHeicFile(file)) throw e
    // libheif applies the HEIC rotation itself. Loaded on demand: it is a large WebAssembly bundle.
    const { heicTo } = await import('heic-to')
    return heicTo({ blob: file, type: 'bitmap' })
  }
}

/** Makes a phone photo ready to upload: upright, JPEG, and no bigger than needed. Other images pass through. */
export async function prepareImage(file: File): Promise<File> {
  const heic = isHeicFile(file)
  if (!needsRecode(file) && (file.type === 'image/gif' || file.size <= MAX_IMAGE_BYTES / 4)) return file
  try {
    const bitmap = await decode(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) throw new Error('Could not convert the image')
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch (e) {
    // A HEIC the browser cannot read is useless on the server, so report it; anything else goes up as it is.
    if (heic) throw new Error('This HEIC photo could not be converted. Try sharing it as JPEG.')
    if (e instanceof Error && file.size > MAX_IMAGE_BYTES) throw e
    return file
  }
}

/** Uploads one image, reporting progress from 0 to 1. Resolves with the stored name. */
export function uploadImage(guideId: string, file: File, onProgress: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${GUIDE_PREFIX}/upload?guide=${encodeURIComponent(guideId)}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      const body = JSON.parse(xhr.responseText || '{}') as { name?: string; error?: string }
      if (xhr.status === 200 && body.name) resolve(body.name)
      else reject(new Error(body.error ?? `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}
