import { readFileSync } from 'node:fs'
import { credentialsFromEnv, getObject } from '#/aws/s3'
import { cachedTable, preToken } from './cognitoPreToken'
import type { PreTokenEvent } from './cognitoPreToken'
import { migrateUser } from './cognitoMigrate'
import type { MigrateUserEvent } from './cognitoMigrate'
import { preSignUp } from './cognitoPreSignUp'
import type { PreSignUpEvent } from './cognitoPreSignUp'
import { GROUPS_KEY, parseGroups } from './groups'
import type { CognitoTable } from './importUsers'

/**
 * The deployed Lambda, for the pool's migrate-user, pre-sign-up and pre-token-generation triggers: `users.json` (from
 * `npm run auth-import -- … --to cognito`) sits beside it in the zip, and the group members are read from the bucket.
 */
const table = JSON.parse(readFileSync(new URL('./users.json', import.meta.url), 'utf8')) as CognitoTable
const pepper = process.env.AUTH_PEPPER
if (!pepper) throw new Error('AUTH_PEPPER is not set')

const migrate = migrateUser(table, pepper)
const signUp = preSignUp(table, pepper)

const bucket = { name: process.env.GROUPS_BUCKET ?? 'thesarvo-content', region: process.env.AWS_REGION ?? 'ap-southeast-2' }
const tokens = preToken(
  cachedTable(async () => {
    const creds = credentialsFromEnv()
    if (!creds) throw new Error('No AWS credentials')
    return parseGroups((await getObject(bucket, creds, GROUPS_KEY))?.toString('utf8') ?? null)
  }),
)

type TriggerEvent = MigrateUserEvent | PreSignUpEvent | PreTokenEvent & { triggerSource: string }

const isSignUp = (event: TriggerEvent): event is PreSignUpEvent => event.triggerSource.startsWith('PreSignUp_')
const isTokens = (event: TriggerEvent): event is PreTokenEvent & { triggerSource: string } => event.triggerSource.startsWith('TokenGeneration_')

export const handler = (event: TriggerEvent) => (isTokens(event) ? tokens(event) : isSignUp(event) ? signUp(event) : migrate(event))
