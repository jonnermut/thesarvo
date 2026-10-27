// @vitest-environment node
import { expect, it } from 'vitest'
import { cacheControl, contentType, md5, plan } from './deploy'

const file = (key: string, body = key) => ({ key, md5: md5(Buffer.from(body)) })
const there = (key: string, body = key) => ({ key, etag: md5(Buffer.from(body)) })

it('uploads only what is new or different', () => {
  const local = [file('g/a/index.html'), file('g/b/index.html', 'new'), file('g/c/index.html')]
  const remote = [there('g/a/index.html'), there('g/b/index.html', 'old')]
  expect(plan(local, remote, null).upload).toEqual(['g/b/index.html', 'g/c/index.html'])
})

it('removes what a full build no longer has, but keeps old bundles and search files', () => {
  const remote = [there('g/gone/index.html'), there('g-data/guide/9.json'), there('assets/old.js'), there('g-data/search/old.json'), there('g/a/index.html')]
  expect(plan([file('g/a/index.html')], remote, null).remove).toEqual(['g/gone/index.html', 'g-data/guide/9.json'])
})

it('removes only the pages an incremental build names, and only if they are there', () => {
  const remote = [there('g/a/index.html'), there('g/b/index.html')]
  expect(plan([], remote, ['g/b/index.html', 'g/never/index.html'])).toEqual({ upload: [], remove: ['g/b/index.html'] })
})

it('caches bundles and search files for a year and everything else not at all', () => {
  expect(cacheControl('assets/main-abc.js')).toContain('immutable')
  expect(cacheControl('g-data/search/pack.1.json')).toContain('immutable')
  expect(cacheControl('g-data/guide/1.json')).toBe('no-cache')
  expect(cacheControl('g/a/index.html')).toBe('no-cache')
})

it('gives each file its type', () => {
  expect(contentType('g/a/index.html')).toBe('text/html; charset=utf-8')
  expect(contentType('assets/x.js')).toBe('text/javascript; charset=utf-8')
  expect(contentType('g-data/kml/1.kml')).toBe('application/vnd.google-earth.kml+xml; charset=utf-8')
  expect(contentType('favicon.svg')).toBe('image/svg+xml')
  expect(contentType('assets/blob')).toBe('application/octet-stream')
})
