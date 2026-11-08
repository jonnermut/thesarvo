/**
 * Writes the forum's home feeds (`g-data/forum-recent.json`, `g-data/forum-notices.json`) from the forum in the bucket: run once after the
 * Lambda that writes them on every change is first deployed, or to put them right after a failed write.
 *
 *   tsx scripts/publish-forum-feeds.ts
 *
 * Credentials: the AWS_PROFILE's through the CLI (the agent profile may write the bucket), or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.
 */
import { spawnSync } from 'node:child_process'
import { credentialsFromEnv } from '../src/aws/s3'
import type { Credentials } from '../src/aws/s3'
import { publishFeeds } from '../src/forum/service'
import { bucketForum } from '../src/forum/store'

function credentials(): Credentials {
  const env = credentialsFromEnv()
  if (env) return env
  const out = spawnSync('aws', ['configure', 'export-credentials', '--format', 'process'], { encoding: 'utf8' })
  const c = JSON.parse(out.stdout) as { AccessKeyId: string; SecretAccessKey: string; SessionToken?: string }
  return { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretAccessKey, sessionToken: c.SessionToken }
}

const bucket = { name: process.env.BUCKET ?? 'thesarvo-content', region: process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2' }
const store = bucketForum(bucket, credentials())
const failed = await publishFeeds(store)
console.log(failed ? 'failed (see above)' : `published forum-recent.json and forum-notices.json to ${bucket.name}/g-data/`)
process.exit(failed ? 1 : 0)
