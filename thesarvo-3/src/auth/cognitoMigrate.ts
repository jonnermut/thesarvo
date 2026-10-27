import { verifyConfluencePassword } from './confluenceHash'
import { cognitoKey } from './importUsers'

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
 * Cognito creates the user with that password, so nobody has to reset. Throwing means "no such user".
 * The pool uses the email as the user name.
 */
export const migrateUser = (table: Record<string, string>, pepper: string) => async (event: MigrateUserEvent) => {
  const credential = table[cognitoKey(pepper, event.userName)]
  const signingIn = event.triggerSource === 'UserMigration_Authentication'
  if (!credential || (signingIn && !verifyConfluencePassword(credential, event.request.password ?? '')))
    throw new Error('Incorrect username or password.')
  event.response = {
    userAttributes: { email: event.userName.trim().toLowerCase(), email_verified: 'true' },
    finalUserStatus: signingIn ? 'CONFIRMED' : 'RESET_REQUIRED',
    messageAction: 'SUPPRESS',
  }
  return event
}
