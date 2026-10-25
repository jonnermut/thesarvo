import { describe, expect, it } from 'vitest'
import { parsePitch } from './ClimbBlock'

describe('parsePitch', () => {
  it('splits a numbered pitch into label and text', () => {
    expect(parsePitch('1. 20m 18 Corner')).toEqual({ label: '1.', text: '20m 18 Corner' })
  })
  it('leaves plain lines alone', () => {
    expect(parsePitch('Traverse left')).toEqual({ label: '', text: 'Traverse left' })
  })
})
