/**
 * After `npm run build`: readers must never download the editor. Text that only editor code contains
 * has to sit in the Editor chunk alone, and nothing may import that chunk except by a lazy `import()`.
 *
 *   npm run build && npm run check-bundle [assets dir]
 */
import { readdir, readFile } from 'node:fs/promises'

/** `npm run build` writes here; for a static site build pass dist/client/assets. */
const DIR = process.argv[2] ?? '.output/public/assets'
/** Strings from src/guide/edit that no public page has. */
const EDITOR_ONLY = ['Loading the latest version', 'Drawing a route: click the photo', 'Auto number climbs']
/** Strings only the rich text editor (src/rte) has, which must sit in its own chunk. */
const RTE_ONLY = ['Only YouTube and Vimeo addresses can be embedded']

const files = (await readdir(DIR)).filter((f) => f.endsWith('.js'))
const text = new Map(await Promise.all(files.map(async (f) => [f, await readFile(`${DIR}/${f}`, 'utf8')] as const)))
const problems: string[] = []

for (const needle of EDITOR_ONLY) {
  const holders = files.filter((f) => text.get(f)!.includes(needle))
  if (!holders.length) problems.push(`"${needle}" is in no chunk: update EDITOR_ONLY in scripts/check-bundle.ts`)
  for (const f of holders) if (!f.startsWith('Editor-')) problems.push(`"${needle}" is in ${f}, which readers download`)
}
for (const needle of RTE_ONLY) {
  const holders = files.filter((f) => text.get(f)!.includes(needle))
  if (!holders.length) problems.push(`"${needle}" is in no chunk: update RTE_ONLY in scripts/check-bundle.ts`)
  for (const f of holders) if (!f.startsWith('RichEditor-')) problems.push(`"${needle}" is in ${f}, which readers download`)
}
for (const f of files) {
  if (f.startsWith('Editor-') || f.startsWith('RichEditor-')) continue
  // Static imports, as opposed to import("./Editor-….js"), and tags that load the chunk up front.
  if (/(?:from|import)\s*["'`]\.\/(?:Rich)?Editor-/.test(text.get(f)!)) problems.push(`${f} imports an editor chunk directly`)
}

if (problems.length) {
  console.error(`Editor code leaks into the public bundle:\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log(`ok: editor code is only in ${files.filter((f) => /^(?:Rich)?Editor-/.test(f)).join(', ')}`)
