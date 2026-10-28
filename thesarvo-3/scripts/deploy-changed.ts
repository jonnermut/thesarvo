/**
 * Uploads what differs between dist/site and the bucket (compared by MD5 against the objects' ETags), in parallel,
 * and removes what a full build no longer has. Called by scripts/deploy-site.sh.
 *
 *   tsx scripts/deploy-changed.ts [--dist dist/site] [--dry-run]
 *
 * Credentials: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (the publish Action), else the AWS_PROFILE's through the CLI.
 */
import { spawnSync } from 'node:child_process'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { cacheControl, contentType, md5, plan } from '../src/aws/deploy'
import type { LocalFile, RemoteFile } from '../src/aws/deploy'
import { credentialsFromEnv, deleteObject, listObjects, putObject } from '../src/aws/s3'
import type { Credentials } from '../src/aws/s3'

const dist = process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist/site'
const bucket = { name: process.env.BUCKET ?? 'thesarvo-content', region: process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2' }
const dry = process.argv.includes('--dry-run')
/** The site's own prefixes: nothing else in the bucket (images/, uploads/, confluence/) is ever touched. */
const prefixes = ['assets/', 'g/', 'g-data/', 'auth/', 'account/', 'index.html', 'favicon.svg', 'robots.txt', 'sitemap.xml']
const PARALLEL = 16

function credentials(): Credentials {
  const env = credentialsFromEnv()
  if (env) return env
  const out = spawnSync('aws', ['configure', 'export-credentials', '--format', 'process'], { encoding: 'utf8' })
  const c = JSON.parse(out.stdout) as { AccessKeyId: string; SecretAccessKey: string; SessionToken?: string }
  return { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretAccessKey, sessionToken: c.SessionToken }
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(path.join(dist, dir), { withFileTypes: true }).catch(() => [])
  const files = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(`${dir}${e.name}/`) : [`${dir}${e.name}`])))
  return files.flat()
}

async function inParallel<T>(items: T[], work: (item: T) => Promise<void>) {
  const queue = [...items]
  await Promise.all(Array.from({ length: PARALLEL }, async () => { for (let item = queue.pop(); item !== undefined; item = queue.pop()) await work(item) }))
}

const started = Date.now()
const c = credentials()
const deploy = JSON.parse(await readFile(path.join(dist, 'deploy.json'), 'utf8')) as { incremental: boolean; remove: string[] }

const keys = (await Promise.all(prefixes.map((p) => (p.endsWith('/') ? walk(p) : stat(path.join(dist, p)).then(() => [p], () => []))))).flat()
const bodies = new Map(await Promise.all(keys.map(async (k) => [k, await readFile(path.join(dist, k))] as const)))
const local: LocalFile[] = keys.map((key) => ({ key, md5: md5(bodies.get(key) ?? Buffer.alloc(0)) }))
const remote: RemoteFile[] = (await Promise.all(prefixes.map((p) => listObjects(bucket, c, p)))).flat().map(({ key, etag }) => ({ key, etag }))
const { upload, remove } = plan(local, remote, deploy.incremental ? deploy.remove : null)

if (dry) console.log([...upload.map((k) => `(dry run) upload ${k}`), ...remove.map((k) => `(dry run) remove ${k}`)].join('\n'))
else {
  await inParallel(upload, (key) => putObject(bucket, c, key, bodies.get(key) ?? Buffer.alloc(0), { contentType: contentType(key), cacheControl: cacheControl(key) }))
  await inParallel(remove, (key) => deleteObject(bucket, c, key))
}
console.log(`${dry ? '(dry run) ' : ''}${upload.length} of ${local.length} files differ: uploaded ${upload.length}, removed ${remove.length} (${Date.now() - started} ms)`)
