import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Climb, TextBlock } from '#/guide/model/types'
import { ClimbDialog, CragMarks, TextForm } from './NodeForms'

afterEach(cleanup)

const climb: Climb = { type: 'climb', id: '4', name: 'First Test', number: '1.', grade: '14', extra: '', length: '15m', stars: '*', fa: '', text: '' }

it('edits every field of the climb in a popup, stars from a list, and closes on Escape or Done', () => {
  const onChange = vi.fn()
  const onClose = vi.fn()
  render(<ClimbDialog node={climb} onChange={onChange} onClose={onClose} />)
  expect(screen.getByRole('dialog', { name: 'Climb details' })).toBeTruthy()
  for (const label of ['No.', 'Name', 'Length', 'Grade', 'Extra', 'Description', 'First ascent']) expect(screen.getByLabelText(label)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Stars'), { target: { value: '***' } })
  expect(onChange).toHaveBeenCalledWith({ stars: '***' })
  fireEvent.change(screen.getByLabelText('First ascent'), { target: { value: 'A. Climber, 2026' } })
  expect(onChange).toHaveBeenCalledWith({ fa: 'A. Climber, 2026' })
  fireEvent.keyDown(window, { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(onClose).toHaveBeenCalledTimes(2)
})

it('lets an editor drop a theCrag mark once the text is their own', () => {
  const onChange = vi.fn()
  render(<CragMarks other={{ thecrag: '5', thecragContent: 'text' }} onChange={onChange} />)
  fireEvent.click(screen.getByText('It is my own now'))
  expect(onChange).toHaveBeenCalledWith({ thecrag: '5' })
})

it('shows no theCrag marks for a node without any', () => {
  expect(render(<CragMarks other={{ thecrag: '5' }} onChange={() => {}} />).container).toBeEmptyDOMElement()
})

it('offers the side heading and the other legacy text styles, keeping the block on its own', () => {
  const onChange = vi.fn()
  const node: TextBlock = { type: 'text', id: 't', cls: 'indentedHeader', text: 'Access: walk in', other: {} }
  render(<TextForm node={node} onChange={onChange} />)
  const select = screen.getByLabelText<HTMLSelectElement>('Style')
  const values = Array.from(select.options).map((o) => o.value)
  expect(values).toEqual(['text', 'heading1', 'heading2', 'heading3', 'indentedHeader', 'intro', 'access', 'description', 'Discussion', 'DiscussionNoIndents', 'noPrint', 'pagebreak'])
  expect(select.value).toBe('indentedHeader')
  fireEvent.change(select, { target: { value: 'heading2' } })
  expect(onChange).toHaveBeenCalledWith({ cls: 'heading2' })
})
