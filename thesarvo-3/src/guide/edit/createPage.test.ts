import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitForPage } from './createPage'

const server = vi.hoisted(() => ({ fetchGuide: vi.fn(), fetchPageBody: vi.fn(), fetchTree: vi.fn(), refreshManifest: vi.fn() }))
vi.mock('#/guide/server', () => server)

const tree = (isGuide: boolean) => ({ id: '1', title: 'Guides', path: '', isGuide: false, children: [{ id: '9000000002', title: 'New', path: 'new', isGuide, children: [] }] })
const instant = () => Promise.resolve()

describe('waitForPage', () => {
  beforeEach(() => Object.values(server).forEach((f) => f.mockReset()))

  it('waits for the guide of a guide', async () => {
    server.fetchTree.mockResolvedValue(tree(true))
    server.fetchGuide.mockResolvedValueOnce(null).mockResolvedValue({ id: '9000000002' })
    expect(await waitForPage('9000000002', instant)).toBe('new')
    expect(server.fetchGuide).toHaveBeenCalledTimes(2)
    expect(server.fetchPageBody).not.toHaveBeenCalled()
  })

  it('waits for the body of a prose page', async () => {
    server.fetchTree.mockResolvedValue(tree(false))
    server.fetchPageBody.mockResolvedValueOnce(null).mockResolvedValue('<p></p>')
    expect(await waitForPage('9000000002', instant)).toBe('new')
    expect(server.fetchGuide).not.toHaveBeenCalled()
  })

  it('gives up when the page never appears', async () => {
    server.fetchTree.mockResolvedValue(tree(false))
    server.fetchPageBody.mockResolvedValue(null)
    let t = 0
    expect(await waitForPage('9000000002', instant, () => (t += 60_000))).toBeNull()
  })
})
