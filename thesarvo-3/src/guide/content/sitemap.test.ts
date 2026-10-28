import { describe, expect, it } from 'vitest'
import { robotsTxt, sitemapXml } from './sitemap'

describe('sitemap', () => {
  it('lists absolute addresses', () => {
    expect(sitemapXml('https://thesarvo.com/', ['/g', '/g/a&b'])).toContain('<loc>https://thesarvo.com/g/a&amp;b/</loc>')
  })
  it('needs a site address', () => {
    expect(sitemapXml(undefined, ['/g'])).toBeNull()
  })
  it('robots points at the sitemap only when there is one', () => {
    expect(robotsTxt('https://x.org')).toContain('Sitemap: https://x.org/sitemap.xml')
    expect(robotsTxt(undefined)).not.toContain('Sitemap')
  })
})
