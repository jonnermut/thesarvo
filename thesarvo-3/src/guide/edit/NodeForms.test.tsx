import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Climb, Header, TextBlock } from '#/guide/model/types'
import { ClimbDialog, CragMarks, HeaderForm, richWith, TextForm } from './NodeForms'

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

  it('opens every field with text as a formatted box (older plain text as paragraphs) and leaves the empty ones as one "Add" line', async () => {
    const onChange = vi.fn()
    render(<HeaderForm node={header} onChange={onChange} />)
    const box = await screen.findByRole('textbox', { name: 'Access' })
    expect(box.innerHTML).toBe('<p>Park here.</p><p>Walk in.</p>')
    expect(screen.queryByText(/Add formatting/)).toBeNull()
    for (const label of ['acknowledgement', 'introduction', 'history', 'camping']) expect(screen.getByRole('button', { name: `+ Add ${label}` })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'History' })).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
  it('opens an empty field in a box when it is asked for', async () => {
    render(<HeaderForm node={header} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add history' }))
    expect(await screen.findByRole('textbox', { name: 'History' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '+ Add history' })).toBeNull()
  })
  it('keeps what is typed as HTML and marks the field, and unmarks it when it is emptied', () => {
    expect(richWith(header, 'access', '<p>Hi</p>')).toEqual({ rich: ['access'], access: '<p>Hi</p>' })
    expect(richWith({ ...header, rich: ['intro', 'access'] }, 'access', '<p>Hi again</p>')).toEqual({ rich: ['intro', 'access'], access: '<p>Hi again</p>' })
    expect(richWith({ ...header, rich: ['intro', 'access'] }, 'access', '')).toEqual({ rich: ['intro'], access: '' })
  })
  it('shows no notice box until one is added', () => {
    render(<HeaderForm node={header} onChange={vi.fn()} />)
    expect(screen.queryByLabelText('Kind')).toBeNull()
    expect(screen.queryByText(/Notices \(shown/)).toBeNull()
  })
  it('edits the steward email and adds and removes notices', () => {
    const onChange = vi.fn()
    const { rerender } = render(<HeaderForm node={header} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Crag Steward email'), { target: { value: 'bruny@climbersclubtas.org.au' } })
    expect(onChange).toHaveBeenCalledWith({ stewardEmail: 'bruny@climbersclubtas.org.au' })
    fireEvent.click(screen.getByRole('button', { name: /Add a notice/ }))
    expect(onChange).toHaveBeenCalledWith({ notices: [{ kind: 'warning', html: '' }] })
    rerender(<HeaderForm node={{ ...header, notices: [{ kind: 'note', html: '<p>x</p>' }] }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'warning' } })
    expect(onChange).toHaveBeenLastCalledWith({ notices: [{ kind: 'warning', html: '<p>x</p>' }] })
    fireEvent.click(screen.getByRole('button', { name: 'Remove notice' }))
    expect(onChange).toHaveBeenLastCalledWith({ notices: undefined })
  })
})
