import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Climb, Header, TextBlock } from '#/guide/model/types'
import { ClimbDialog, CragMarks, HeaderForm, TextForm } from './NodeForms'

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
  expect(values).toEqual(['text', 'heading1', 'heading2', 'heading3', 'indentedHeader', 'rich', 'note', 'warning', 'intro', 'access', 'description', 'Discussion', 'DiscussionNoIndents', 'noPrint', 'pagebreak'])
  expect(select.value).toBe('indentedHeader')
  fireEvent.change(select, { target: { value: 'heading2' } })
  expect(onChange).toHaveBeenCalledWith({ cls: 'heading2' })
})

it('converts the text when the style moves between plain and formatted, so nothing is lost', () => {
  const onChange = vi.fn()
  const node: TextBlock = { type: 'text', id: 't', cls: 'text', text: 'Walk in.\n\nThen up.', other: {} }
  render(<TextForm node={{ ...node, text: 'Walk in.<br/><br/>Then **up**.' }} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('Style'), { target: { value: 'rich' } })
  expect(onChange).toHaveBeenCalledWith({ cls: 'rich', text: '<p>Walk in.</p><p>Then <strong>up</strong>.</p>' })
  cleanup()
  onChange.mockClear()
  render(<TextForm node={{ ...node, cls: 'note', text: '<p>Walk in.</p><ul><li>one</li><li>two</li></ul>' }} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('Style'), { target: { value: 'warning' } })
  expect(onChange).toHaveBeenCalledWith({ cls: 'warning' })
  fireEvent.change(screen.getByLabelText('Style'), { target: { value: 'text' } })
  expect(onChange).toHaveBeenLastCalledWith({ cls: 'text', text: expect.stringContaining('• one') as string })
})

describe('HeaderForm', () => {
  const header: Header = { type: 'header', id: 'h', name: 'Bruny', rock: '', sun: '', walk: '', access: 'Park here.<br/><br/>Walk in.', camping: '', acknowledgement: '', intro: '', history: '', autonumber: '' }

  it('turns a plain field into formatted text on request, keeping its words, and marks it', () => {
    const onChange = vi.fn()
    render(<HeaderForm node={header} onChange={onChange} />)
    fireEvent.click(screen.getAllByRole('button', { name: /Add formatting/ })[3])
    expect(onChange).toHaveBeenCalledWith({ rich: ['access'], access: '<p>Park here.</p><p>Walk in.</p>' })
  })
  it('edits the steward email and adds and removes notices', () => {
    const onChange = vi.fn()
    const { rerender } = render(<HeaderForm node={header} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Crag Steward email'), { target: { value: 'bruny@climbersclubtas.org.au' } })
    expect(onChange).toHaveBeenCalledWith({ stewardEmail: 'bruny@climbersclubtas.org.au' })
    fireEvent.click(screen.getByRole('button', { name: 'Add a notice' }))
    expect(onChange).toHaveBeenCalledWith({ notices: [{ kind: 'warning', html: '' }] })
    rerender(<HeaderForm node={{ ...header, notices: [{ kind: 'note', html: '<p>x</p>' }] }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'warning' } })
    expect(onChange).toHaveBeenLastCalledWith({ notices: [{ kind: 'warning', html: '<p>x</p>' }] })
    fireEvent.click(screen.getByRole('button', { name: 'Remove notice' }))
    expect(onChange).toHaveBeenLastCalledWith({ notices: undefined })
  })
})
