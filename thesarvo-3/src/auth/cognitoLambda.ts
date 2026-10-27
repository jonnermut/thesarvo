import { readFileSync } from 'node:fs'
import { migrateUser } from './cognitoMigrate'

/** The deployed Lambda: `users.json` (from `npm run auth-import -- … --to cognito`) sits beside it in the zip. */
const table = JSON.parse(readFileSync(new URL('./users.json', import.meta.url), 'utf8')) as Record<string, string>
const pepper = process.env.AUTH_PEPPER
if (!pepper) throw new Error('AUTH_PEPPER is not set')

export const handler = migrateUser(table, pepper)
