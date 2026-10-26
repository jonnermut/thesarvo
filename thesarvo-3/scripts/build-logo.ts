/**
 * Renders the logo's web files from brand/thesarvo-logo.svg (drawn from brand/thesarvo-logo.ai):
 * public/favicon.svg, and PNGs in src/brand that the app imports so their names carry a hash.
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

await writeFile('public/favicon.svg', svg)
await writeFile('src/brand/apple-touch-icon.png', png(square, 180))
await writeFile('src/brand/icon-512.png', png(square, 512))
console.log('wrote public/favicon.svg and src/brand/*.png')
