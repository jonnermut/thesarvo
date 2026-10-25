import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONTENT_DIR } from '#/guide/content/defaultDir'
import { guideFromXml, guideToXml } from './xml'

const dir = process.env.CONTENT_DIR ?? DEFAULT_CONTENT_DIR

// Every downloaded guide must survive a save: the editor must never lose or reshuffle content.
describe.skipIf(!existsSync(dir))('every downloaded guide', () => {
  const ids = existsSync(dir) ? readdirSync(dir).filter((f) => /^\d+\.xml$/.test(f)).map((f) => f.slice(0, -4)) : []

  it('round-trips through the model', () => {
    const failures: string[] = []
    for (const id of ids) {
      const model = guideFromXml(id, readFileSync(path.join(dir, `${id}.xml`), 'utf8'))
      const xml = guideToXml(model)
      const again = guideFromXml(id, xml)
      if (JSON.stringify(again) !== JSON.stringify(model) || guideToXml(again) !== xml) failures.push(id)
    }
    expect(ids.length).toBeGreaterThan(100)
    expect(failures).toEqual([])
  })
})
