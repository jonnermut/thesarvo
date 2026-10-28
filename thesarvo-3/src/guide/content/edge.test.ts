import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

type Res = { statusCode?: number; headers?: { location: { value: string } }; uri?: string }
const entries: Record<string, string> = { 't:thesarvo/apsley edge': '/g/east/apsley-edge/', 'p:7': '/g/east/', 'a:7': '1' }

async function run(uri: string, query: Record<string, { value: string }> = {}): Promise<Res> {
  // The file is a CloudFront Function module: run it with the `cloudfront` import stubbed.
  const src = (await readFile('scripts/edge/viewer-request.js', 'utf8')).replace("import cf from 'cloudfront'", '')
  const cf = { kvs: () => ({ get: async (k: string) => entries[k] ?? Promise.reject(new Error('KeyNotFound')) }) }
  const handler = new Function('cf', `${src}\nreturn handler`)(cf) as (e: unknown) => Promise<Res>
  return handler({ request: { uri, querystring: query } })
}

it('redirects old addresses to the new ones', async () => {
  expect((await run('/confluence/display/thesarvo/Apsley+Edge')).headers?.location.value).toBe('/g/east/apsley-edge/')
  expect((await run('/confluence/display/THESARVO/apsley%20edge')).statusCode).toBe(301)
  expect((await run('/confluence/pages/viewpage.action', { pageId: { value: '7' } })).headers?.location.value).toBe('/g/east/')
  expect((await run('/confluence/download/attachments/7/topo%201.jpg')).headers?.location.value).toBe('/images/7/topo%201.jpg')
  expect((await run('/confluence/download/attachments/8/x.jpg')).headers?.location.value).toBe('/g/')
  expect((await run('/confluence/display/thesarvo/Nothing+Here')).headers?.location.value).toBe('/g/')
})

it('leaves the sync stubs and ordinary pages alone', async () => {
  expect((await run('/confluence/plugins/servlet/guide/index/1')).uri).toBe('/legacy-app/index.json')
  expect((await run('/confluence/plugins/servlet/guide/sync/1/2')).uri).toBe('/legacy-app/sync.xml')
  expect((await run('/g/east/')).uri).toBe('/g/east/index.html')
  expect((await run('/g/east')).uri).toBe('/g/east/index.html')
  expect((await run('/assets/app.js')).uri).toBe('/assets/app.js')
})
