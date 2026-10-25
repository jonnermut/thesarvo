import { JsonContentSource } from './json'

let source: JsonContentSource | undefined

/** Build time only: the content repo checkout the static site is rendered from. */
export const staticSource = () => (source ??= new JsonContentSource(process.env.CONTENT_DIR ?? '../../thesarvo-content'))
