import { readFileSync } from 'node:fs'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { guideFromXml } from '#/guide/convert/xml'
import { GuideView } from './GuideView'

const guide = guideFromXml('167', readFileSync('fixtures/167.xml', 'utf8'))

it('renders the header, climbs and topo lines', () => {
  const { container } = render(<GuideView guide={guide} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Lowdina' })).toBeInTheDocument()
  expect(container.querySelectorAll('.anchor[id^="c-"]').length).toBeGreaterThan(50)
  expect(container.querySelectorAll('figure svg path').length).toBeGreaterThan(10)
})

it('lists the guide\'s contents with links to its blocks', () => {
  const { container } = render(<GuideView guide={guide} />)
  const links = [...container.querySelectorAll('aside[aria-label="On this page"] a')]
  expect(links[0]).toHaveAttribute('href', '#intro')
  for (const a of links) expect(container.querySelector(a.getAttribute('href')!)).not.toBeNull()
})

it('highlights a climb while its route is hovered', () => {
  const { container } = render(<GuideView guide={guide} />)
  const route = [...container.querySelectorAll('figure svg g.cursor-pointer')].find((g) => g.querySelector('circle'))!
  fireEvent.pointerOver(route)
  expect(container.querySelector('figure svg g[opacity="0.3"]')).not.toBeNull() // other routes dim
})

it('shows the crag steward with the other header sections, when there is one', () => {
  const steward = (el: HTMLElement) => within(el.querySelector('header')!).queryByRole('heading', { name: 'Crag Steward' })
  const withSteward = { ...guide, nodes: guide.nodes.map((n) => (n.type === 'header' ? { ...n, steward: 'The Tasmanian Climbing Club' } : n)) }
  const a = render(<GuideView guide={withSteward} />)
  expect(steward(a.container)).toBeInTheDocument()
  expect(within(a.container).getByText('The Tasmanian Climbing Club')).toBeInTheDocument()
  expect(steward(render(<GuideView guide={guide} />).container)).toBeNull()
})

it('leaves out a topo that has no photo', () => {
  const topo = guide.nodes.find((n) => n.type === 'image')!
  const bare = { ...guide, nodes: [...guide.nodes, { ...topo, id: 'bare', src: '', paths: [], rects: [], otherShapes: [], legend: [] }] }
  const count = (g: typeof guide) => render(<GuideView guide={g} />).container.querySelectorAll('figure').length
  expect(count(bare)).toBe(count(guide))
})
