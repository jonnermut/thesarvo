import { readFileSync } from 'node:fs'
import { migrateUser } from './cognitoMigrate'
import type { MigrateUserEvent } from './cognitoMigrate'
import { preSignUp } from './cognitoPreSignUp'
import type { PreSignUpEvent } from './cognitoPreSignUp'

/**
 * The deployed Lambda, for the pool's migrate-user and pre-sign-up triggers: `users.json` (from
 * `npm run auth-import -- … --to cognito`) sits beside it in the zip.
 */
const table = JSON.parse(readFileSync(new URL('./users.json', import.meta.url), 'utf8')) as Record<string, string>
const pepper = process.env.AUTH_PEPPER
if (!pepper) throw new Error('AUTH_PEPPER is not set')

const migrate = migrateUser(table, pepper)
const signUp = preSignUp(table, pepper)

const isSignUp = (event: MigrateUserEvent | PreSignUpEvent): event is PreSignUpEvent => event.triggerSource.startsWith('PreSignUp_')

export const handler = (event: MigrateUserEvent | PreSignUpEvent) => (isSignUp(event) ? signUp(event) : migrate(event))
