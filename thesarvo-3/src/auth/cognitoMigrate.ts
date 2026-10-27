import { verifyConfluencePassword } from './confluenceHash'
import { cognitoEntry } from './importUsers'
import type { CognitoTable } from './importUsers'

/** The parts of Cognito's "migrate user" trigger event this uses. */
export type MigrateUserEvent = {
  triggerSource: 'UserMigration_Authentication' | 'UserMigration_ForgotPassword'
  userName: string
  request: { password?: string }
  response: Record<string, unknown>
}

/**
 * Cognito calls this when someone signs in, or asks for a password reset, with an email the pool does not
 * know yet. If the email is in the table (and, for a sign-in, the password matches the Confluence hash),
 * Cognito creates the user with that password and their Confluence name, so nobody has to reset. Throwing means "no such user".
 * The pool uses the email as the user name.
 */
export const migrateUser = (table: CognitoTable, pepper: string) => async (event: MigrateUserEvent) => {
  const old = cognitoEntry(table, pepper, event.userName)
  const signingIn = event.triggerSource === 'UserMigration_Authentication'
  if (!old || (signingIn && !verifyConfluencePassword(old.credential, event.request.password ?? '')))
    throw new Error('Incorrect username or password.')
  // The email must be exactly what was typed, case included, or Cognito refuses the user; the pool ignores case anyway.
  event.response = {
    userAttributes: { email: event.userName, email_verified: 'true', ...(old.name && { name: old.name }) },
    finalUserStatus: signingIn ? 'CONFIRMED' : 'RESET_REQUIRED',
    messageAction: 'SUPPRESS',
  }
  return event
}
