import { describe, expect, it } from 'vitest'
import { avatarFile, emailKey, isBuiltInPicture, parseAvatars } from './keys'

describe('avatar keys', () => {
  it('keys an email case-insensitively without exposing it', async () => {
    const k = await emailKey(' Jon@Example.com ')
    expect(k).toBe(await emailKey('jon@example.com'))
    expect(k).toMatch(/^email:[0-9a-f]{16}$/)
    expect(k).not.toContain('jon')
  })
  it('finds the first id with a picture', () => {
    expect(avatarFile({ b: 'b.jpg', c: 'c.jpg' }, ['a', 'b', 'c'])).toBe('b.jpg')
    expect(avatarFile({}, ['a'])).toBeUndefined()
  })
  it('recognises built-in pictures', () => {
    for (const n of ['', 'NULL', '/images/icons/profilepics/Avatar-3.png', 'user-avatar']) expect(isBuiltInPicture(n)).toBe(true)
    expect(isBuiltInPicture('me-1-pp-me.jpg')).toBe(false)
  })
  it('keeps only plain file names', () => {
    expect(parseAvatars({ a: 'a.jpg', b: '../x', c: 3 })).toEqual({ a: 'a.jpg' })
    expect(parseAvatars(null)).toEqual({})
  })
})
