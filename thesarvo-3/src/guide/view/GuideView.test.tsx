import { readFileSync } from 'node:fs'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { guideFromXml } from '#/guide/convert/xml'
import { GuideView } from './GuideView'

const guide = guideFromXml('167', readFileSync('fixtures/167.xml', 'utf8'))

it('renders the header, climbs and topo lines', () => {
  const { container } = render(<GuideView guide={guide} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Lowdina' })).toBeInTheDocument()
  expect(container.querySelectorAll('article[id^="climb-"]').length).toBeGreaterThan(50)
  expect(container.querySelectorAll('figure svg path').length).toBeGreaterThan(10)
})

it('highlights a climb while its route is hovered', () => {
  const { container } = render(<GuideView guide={guide} />)
  const route = container.querySelector('figure svg g.cursor-pointer')!
  fireEvent.pointerEnter(route)
  expect(container.querySelectorAll('article.ring-2')).toHaveLength(0) // climbs highlight on their own hover
  expect(container.querySelector('figure svg g[opacity="0.3"]')).not.toBeNull() // other routes dim
})
