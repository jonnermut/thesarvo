import { cognitoEntry } from './importUsers'
import type { CognitoTable } from './importUsers'

/** The parts of Cognito's pre-sign-up trigger event this uses. */
export type PreSignUpEvent = {
  triggerSource: 'PreSignUp_SignUp' | 'PreSignUp_AdminCreateUser' | 'PreSignUp_ExternalProvider'
  request: { userAttributes: Record<string, string> }
  response: Record<string, unknown>
}

/** Throwaway inbox services that the old site's spam sign-ups came from, and the like. */
const DISPOSABLE = new Set([
  '10minutemail.com', 'dispostable.com', 'emailondeck.com', 'getnada.com', 'guerrillamail.com', 'mailinator.com', 'maildrop.cc', 'mintemail.com',
  'mohmal.com', 'sharklasers.com', 'temp-mail.org', 'tempmail.com', 'tempmailo.com', 'throwawaymail.com', 'trashmail.com', 'yopmail.com',
])

export const OLD_ACCOUNT = 'This email already has a thesarvo account from the old site. Sign in with your old password, or use Forgot password'
export const DISPOSABLE_EMAIL = 'Please use an email address you keep: throwaway inboxes can’t be used for a thesarvo account'

/**
 * Cognito calls this before creating a user who signed up on the login page. A Confluence user who has not signed
 * in yet is not in the pool, so signing up would give them a second, empty account: send them to sign in instead,
 * which migrates the old one. Throwaway inboxes are refused. Throwing shows the message on the sign-up form, after
 * "PreSignUp failed with error" and with a full stop added, so the messages end without one.
 */
export const preSignUp = (table: CognitoTable, pepper: string) => async (event: PreSignUpEvent) => {
  if (event.triggerSource !== 'PreSignUp_SignUp') return event
  const email = event.request.userAttributes.email ?? ''
  if (cognitoEntry(table, pepper, email)) throw new Error(OLD_ACCOUNT)
  if (DISPOSABLE.has(email.split('@').pop()?.trim().toLowerCase() ?? '')) throw new Error(DISPOSABLE_EMAIL)
  return event
}
