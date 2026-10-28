import { publicJsonSource } from './json'
import type { ContentSource } from './types'

let source: ContentSource | undefined

/** Build time only: the content repo checkout the static site is rendered from, without its private pages. */
export const staticSource = () => (source ??= publicJsonSource(process.env.CONTENT_DIR ?? '../../thesarvo-content'))
