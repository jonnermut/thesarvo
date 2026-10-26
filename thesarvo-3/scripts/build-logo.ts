/**
 * Renders the logo's web files from brand/thesarvo-logo.svg (drawn from brand/thesarvo-logo.ai):
 * public/favicon.svg, and PNGs in src/brand (touch icons, the social card) that the app imports so their names carry a hash.
 *
 *   npx tsx scripts/build-logo.ts
 */
import { readFile, writeFile } from 'node:fs/promises'
import { Resvg } from '@resvg/resvg-js'

const BRAND_BLUE = '#1b1464'
const svg = await readFile('brand/thesarvo-logo.svg', 'utf8')

const png = (source: string, size: number) => new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng()

// Home screens crop icons to their own shape, so these fill a square with the disc's blue and drop the ring.
const square = svg.replace(/<circle [^>]*\/>/, `<rect width="48" height="48" fill="${BRAND_BLUE}"/>`)

// The picture shown when a link is shared and the page has none of its own: the logo on the brand blue, 1200x630.
const logo = svg.replace(/<svg [^>]*>/, '<svg x="480" y="165" width="240" height="240" viewBox="0 0 48 48">')
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${BRAND_BLUE}"/>${logo}</svg>`

await writeFile('public/favicon.svg', svg)
await writeFile('src/brand/og-image.png', png(card, 1200))
await writeFile('src/brand/apple-touch-icon.png', png(square, 180))
await writeFile('src/brand/icon-512.png', png(square, 512))
console.log('wrote public/favicon.svg and src/brand/*.png')
