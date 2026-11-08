import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Header, TextBlock as TextModel } from '#/guide/model/types'
import { guideDescription } from '#/guide/seo'
import { HeaderBlock } from './HeaderBlock'
import { StewardNote } from './StewardNote'
import { TextBlock } from './TextBlock'
import { isRich, isRichCls, stripTags } from './richText'
import { routeStats } from './routeStats'

afterEach(cleanup)

const header: Header = { type: 'header', id: 'h', name: 'Bruny', rock: '', sun: '', walk: '', access: '', camping: '', acknowledgement: '', intro: '', history: '', autonumber: '' }
const stats = routeStats([])
const text = (cls: string, t: string): TextModel => ({ type: 'text', id: '1', cls, text: t })

describe('HeaderBlock with rich text', () => {
  it('shows notices as banners above the sections, a warning announced as an alert', () => {
    render(<HeaderBlock header={{ ...header, intro: 'Hello', notices: [{ kind: 'warning', html: '<p>Closed until <strong>May</strong></p>' }, { kind: 'note', html: '<p>Bring a rope</p>' }] }} stats={stats} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('WarningClosed until May')
    expect(within(alert).getByText('May').tagName).toBe('STRONG')
    expect(screen.getByRole('note')).toHaveTextContent('Bring a rope')
    expect(alert.compareDocumentPosition(screen.getByRole('heading', { name: 'Introduction' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('shows no box for an empty notice', () => {
    const { container } = render(<HeaderBlock header={{ ...header, notices: [{ kind: 'note', html: '' }, { kind: 'warning', html: '<p> </p>' }] }} stats={stats} />)
    expect(container.querySelector('aside')).toBeNull()
  })
  it('shows a rich field as HTML and a plain field as text with line breaks', () => {
    const { container } = render(<HeaderBlock header={{ ...header, rich: ['intro'], intro: '<p>One</p><ul><li>two</li></ul>', access: 'a<br/>b' }} stats={stats} />)
    expect(container.querySelector('.guide-rich ul li')).toHaveTextContent('two')
    expect(screen.getByRole('heading', { name: 'Access' }).parentElement?.querySelectorAll('br')).toHaveLength(1)
  })
  it('does not run markup in a plain field', () => {
    const { container } = render(<HeaderBlock header={{ ...header, intro: '<img src=x onerror=alert(1)>' }} stats={stats} />)
    expect(container.querySelector('img')).toBeNull()
  })
  it('shows the standard steward text around the crag email, or own wording when there is some', () => {
    const { container, rerender } = render(<HeaderBlock header={{ ...header, stewardEmail: 'bruny@climbersclubtas.org.au' }} stats={stats} />)
    expect(screen.getByRole('heading', { name: 'Crag Steward' })).toBeInTheDocument()
    expect(container.querySelector('a[href="mailto:bruny@climbersclubtas.org.au"]')).not.toBeNull()
    expect(container.querySelectorAll('a[href="mailto:cct@climbersclubtas.org.au"]')).toHaveLength(2)
    rerender(<HeaderBlock header={{ ...header, stewardEmail: 'bruny@climbersclubtas.org.au', steward: 'Ask Jon.' }} stats={stats} />)
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(container).toHaveTextContent('Ask Jon.')
  })
})

describe('StewardNote', () => {
  it('names the regional steward and the committee', () => {
    const { container } = render(<StewardNote email="x@y.test" />)
    expect(container).toHaveTextContent('Cliff Steward (x@y.test)')
  })
})

describe('TextBlock rich styles', () => {
  it('renders rich text as HTML', () => {
    const { container } = render(<TextBlock block={text('rich', '<p>a <em>b</em></p><ol><li>c</li></ol>')} />)
    expect(container.querySelector('em')).toHaveTextContent('b')
    expect(container.querySelector('ol li')).toHaveTextContent('c')
  })
  it('boxes notes and warnings', () => {
    render(<TextBlock block={text('warning', '<p>Loose rock</p>')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Loose rock')
    cleanup()
    render(<TextBlock block={text('note', '<p>Dry in summer</p>')} />)
    expect(screen.getByRole('note')).toHaveTextContent('Dry in summer')
  })
  it('still shows plain text with line breaks', () => {
    const { container } = render(<TextBlock block={text('text', 'a<br/>b')} />)
    expect(container.querySelectorAll('br')).toHaveLength(1)
  })
})

describe('helpers', () => {
  it('knows the rich styles and fields', () => {
    expect(['rich', 'note', 'warning'].every(isRichCls)).toBe(true)
    expect(isRichCls('text')).toBe(false)
    expect(isRich({ ...header, rich: ['intro'] }, 'intro')).toBe(true)
    expect(isRich(header, 'intro')).toBe(false)
  })
  it('strips tags to text with spaces between blocks', () => {
    expect(stripTags('<p>One</p><p>two <b>three</b></p>')).toBe('One two three')
  })
  it('describes a guide from rich intro text without its tags', () => {
    const guide = { id: '1', guideStars: '', nodes: [{ ...header, rich: ['intro' as const], intro: '<p>A <strong>fine</strong> crag.</p><p>Walk in.</p>' }] }
    expect(guideDescription(guide, { title: 'Bruny', count: 0 })).toBe('Bruny climbing guide. A fine crag. Walk in.')
  })
})
