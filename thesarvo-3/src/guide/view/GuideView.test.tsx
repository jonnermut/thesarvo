import { readFileSync } from 'node:fs'
import { fireEvent, render, screen } from '@testing-library/react'
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
