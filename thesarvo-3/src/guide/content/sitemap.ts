/** `sitemap.xml` for the public pages (addresses are `<site>/g/<path>/`); null without a site address, as a sitemap needs absolute ones. */
export function sitemapXml(site: string | undefined, urls: readonly string[]): string | null {
  if (!site) return null
  const base = site.replace(/\/$/, '')
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const items = urls.map((u) => `<url><loc>${esc(base + u)}/</loc></url>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>\n`
}

/** `robots.txt`: everything but the API may be crawled; points at the sitemap when there is one. */
export function robotsTxt(site: string | undefined): string {
  return `User-agent: *\nDisallow: /g/api/\nDisallow: /auth/\nDisallow: /account/\n${site ? `Sitemap: ${site.replace(/\/$/, '')}/sitemap.xml\n` : ''}`
}
