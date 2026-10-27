import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Climb } from '#/guide/model/types'
import { ClimbDialog } from './NodeForms'

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
