import { describe, expect, it } from 'vitest'
import type { ForumStore } from '#/forum/store'
import { AVATAR_MAX_BYTES, BadPicture, jpegOf, removeAvatar, saveAvatar } from './upload'

const url = (bytes: number[]) => `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]

function memory() {
  const files = new Map<string, string>()
  const puts: string[] = []
  const map: ForumStore = {
    async read(name) {
      const t = files.get(name)
      return t === undefined ? null : { value: JSON.parse(t) as unknown, tag: String(t.length) + t }
    },
    async write(name, value, tag) {
      const t = files.get(name)
      if ((t === undefined ? null : String(t.length) + t) !== tag) return false
      files.set(name, JSON.stringify(value))
      return true
    },
  }
  return { store: { map, put: async (f: string) => void puts.push(f) }, files, puts }
}

describe('avatar upload', () => {
  it('accepts a small JPEG and refuses the rest', () => {
    expect(jpegOf(url(JPEG))).toHaveLength(JPEG.length)
    expect(() => jpegOf(url([1, 2, 3, 4, 5]))).toThrow(BadPicture)
    expect(() => jpegOf('data:image/png;base64,AAAA')).toThrow(BadPicture)
    expect(() => jpegOf(url([0xff, 0xd8, 0xff, ...new Array<number>(AVATAR_MAX_BYTES).fill(0)]))).toThrow('too big')
    expect(() => jpegOf(42)).toThrow(BadPicture)
  })

  it('saves a picture under a name that carries its hash, points the sub at it, and removes it again', async () => {
    const { store, files, puts } = memory()
    const file = await saveAvatar(store, 'abc-123', url(JPEG))
    expect(file).toMatch(/^abc_123\.[0-9a-f]{10}\.jpg$/)
    expect(puts).toEqual([file])
    expect(JSON.parse(files.get('uploaded.json')!)).toEqual({ 'abc-123': file })
    await saveAvatar(store, 'other', url([...JPEG, 9]))
    await removeAvatar(store, 'abc-123')
    expect(Object.keys(JSON.parse(files.get('uploaded.json')!) as object)).toEqual(['other'])
  })
})
