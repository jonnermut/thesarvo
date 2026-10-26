import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Climb } from '#/guide/model/types'
import { ClimbBlock, parsePitch } from './ClimbBlock'

const climb: Climb = { type: 'climb', id: '7', name: 'Farmer Henry', number: '', grade: '13', extra: '', length: '15m', stars: '', fa: '', text: '' }

it('shows nothing in the number column of an unnumbered climb', () => {
  const { container } = render(<ClimbBlock climb={climb} anchor="c-7" />)
  expect(container.querySelector('a[href="#c-7"]')).toBeNull()
  expect(container.textContent).not.toContain('#')
})

it('links a numbered climb to itself', () => {
  const { container } = render(<ClimbBlock climb={{ ...climb, number: '8' }} anchor="c-7" />)
  expect(container.querySelector('a[href="#c-7"]')).toHaveTextContent('8')
})

describe('parsePitch', () => {
  it('splits a numbered pitch into label and text', () => {
    expect(parsePitch('1. 20m 18 Corner')).toEqual({ label: '1.', text: '20m 18 Corner' })
  })
  it('leaves plain lines alone', () => {
    expect(parsePitch('Traverse left')).toEqual({ label: '', text: 'Traverse left' })
  })
})
