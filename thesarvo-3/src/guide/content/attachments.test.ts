import { describe, expect, it } from 'vitest'
import { contentTypeOf, indexStoredFiles, latestFiles, parseAttachments } from './attachments'

const tsv = [
  'CONTENTID\tTITLE\tPAGEID\tVERSION\tPREVVER\tCONTENT_STATUS',
  '859\tcol.jpg\t1107\t3\t900\tcurrent',
  '900\tcol.jpg\t1107\t5\tNULL\tcurrent',
  '901\tcol.jpg\t1107\t1\t900\tcurrent',
  '7\tx.png\t8\t1\tNULL\tcurrent',
].join('\n')

describe('latestFiles', () => {
  const stored = indexStoredFiles(['v4/1/2/900/900.5', 'v4/1/2/900/900.1', 'v4/3/4/7/7.1', 'v4/1/2/900/900.1.extracted_text'])

  it('picks the highest version that exists on disk, looking in the head folder for old rows', () => {
    const latest = latestFiles(parseAttachments(tsv), stored)
    expect(latest.get('1107/col.jpg')).toBe('v4/1/2/900/900.5')
    expect(latest.get('8/x.png')).toBe('v4/3/4/7/7.1')
  })

  it('skips attachments with no stored file', () => {
    expect(latestFiles(parseAttachments(tsv), new Map()).size).toBe(0)
  })
})

it('guesses content types from the name', () => {
  expect(contentTypeOf('A.JPG')).toBe('image/jpeg')
  expect(contentTypeOf('noext')).toBe('application/octet-stream')
})
