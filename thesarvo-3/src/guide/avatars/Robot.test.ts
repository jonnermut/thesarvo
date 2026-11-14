import { describe, expect, it } from 'vitest'
import { botFor } from './Robot'

describe('botFor', () => {
  it('finds the robot for the site bots by sub, and none for people', () => {
    expect(botFor(['thesarvo-bot'])).toBe('climber')
    expect(botFor(['abc-123', 'thecrag-sync'])).toBe('sync')
    expect(botFor(['abc-123', 'email:0011'])).toBeUndefined()
  })
})
