import { describe, expect, it } from 'vitest'
import { isHeicFile, needsRecode } from './upload'

describe('phone photo handling', () => {
  it('spots HEIC by type or by name (some browsers give no type)', () => {
    expect(isHeicFile({ type: 'image/heic', name: 'a' })).toBe(true)
    expect(isHeicFile({ type: '', name: 'IMG_0001.HEIC' })).toBe(true)
    expect(isHeicFile({ type: 'image/jpeg', name: 'a.jpg' })).toBe(false)
  })
  it('re-draws JPEG and HEIC to bake in rotation, but not PNG', () => {
    expect(needsRecode({ type: 'image/jpeg', name: 'a.jpg' })).toBe(true)
    expect(needsRecode({ type: '', name: 'a.heif' })).toBe(true)
    expect(needsRecode({ type: 'image/png', name: 'a.png' })).toBe(false)
  })
})
