import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { IndexNode } from '#/guide/content/types'
import { PagePicker } from './PagePicker'

const node = (title: string, path: string, isGuide = true, children: IndexNode[] = []): IndexNode => ({ id: path || '0', title, path, isGuide, children })
const tree = node('Guides', '', false, [node('South Arm', 'south-arm'), node('Introduction', 'intro', false)])

vi.mock('#/guide/server', () => ({
  fetchTree: async () => tree,
  fetchGuide: async () => ({ nodes: [{ type: 'climb', id: '173', name: 'Zig', number: '3', grade: '18', extra: '', length: '', stars: '', fa: '', text: '' }] }),
}))

afterEach(cleanup)

const type = (text: string) => fireEvent.change(screen.getByLabelText('Find a page'), { target: { value: text } })

it('picks a page by title, with its title as the link text', async () => {
  const onPick = vi.fn()
  render(<PagePicker onPick={onPick} />)
  await act(async () => {})
  type('arm')
  fireEvent.click(screen.getByRole('button', { name: 'South Arm' }))
  expect(onPick).toHaveBeenCalledWith('/g/south-arm', 'South Arm')
})

it('offers the climbs of a guide, but not of a plain page', async () => {
  const onPick = vi.fn()
  render(<PagePicker onPick={onPick} />)
  await act(async () => {})
  type('intro')
  expect(screen.queryByRole('button', { name: /A climb or topo in/ })).toBeNull()
  type('south')
  fireEvent.click(screen.getByRole('button', { name: 'A climb or topo in South Arm' }))
  await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: /3 Zig 18/ }))
  expect(onPick).toHaveBeenCalledWith('/g/south-arm#c-173', '3 Zig 18')
})
