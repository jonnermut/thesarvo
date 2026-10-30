import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Climb } from '#/guide/model/types'
import { ClimbBlock, parsePitch, splitPitches, withNote } from './ClimbBlock'

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

describe('splitPitches', () => {
  it('puts each pitch of run-together text on its own line', () => {
    expect(splitPitches('Start up the wall. 1. 45m 18. Climb cracks. Belay 2. 30m 20. Traverse R. 3. 45m 22. Step R.')).toBe('Start up the wall.<br>1. 45m 18. Climb cracks. Belay<br>2. 30m 20. Traverse R.<br>3. 45m 22. Step R.')
  })
  it('leaves text with one pitch or none alone', () => {
    expect(splitPitches('Climb the crack. 1. 45m 18. Up.')).toBe('Climb the crack. 1. 45m 18. Up.')
    expect(splitPitches('Follow the 2. 5 m ledge')).toBe('Follow the 2. 5 m ledge')
  })
  it('shows the pitch numbers in their own column', () => {
    const { container } = render(<ClimbBlock climb={{ ...climb, text: 'Start. 1. 45m 18. Climb. 2. 30m 20. Traverse.<br><br>Rack: lots.' }} />)
    expect([...container.querySelectorAll('span.font-bold')].map((e) => e.textContent)).toEqual(expect.arrayContaining(['1. 45m 18', '2. 30m 20']))
  })
})

describe('withNote', () => {
  it('moves a bracketed note off a length or grade', () => {
    expect(withNote('160m (approx)')).toEqual({ main: '160m', note: '(approx)' })
    expect(withNote('25 or 22 (variant)')).toEqual({ main: '25 or 22', note: '(variant)' })
    expect(withNote('18')).toEqual({ main: '18', note: '' })
    expect(withNote('(approx)')).toEqual({ main: '(approx)', note: '' })
  })
  it('shows the note in the last column', () => {
    const { container } = render(<ClimbBlock climb={{ ...climb, length: '160m (approx)', grade: '14', extra: '' }} />)
    expect(container.textContent).toContain('(approx)')
    expect(container.querySelector('span.font-bold.whitespace-nowrap')).toHaveTextContent('160m')
  })
})
