import { describe, expect, it } from 'vitest'
import { legendBreak } from './TopoFigure'

describe('legendBreak', () => {
  it('moves a legend onto the photo once it shows at 80% of its own size, capped at 512px', () => {
    expect(legendBreak(1200)[0]).toBe(512)
    expect(legendBreak(500)[0]).toBe(384)
    expect(legendBreak(330)[0]).toBe(256)
  })
  it('always keeps a small photo’s legend on it', () => {
    expect(legendBreak(250)).toEqual([0, 'block!', 'hidden'])
  })
})
