import { randomBytes } from 'node:crypto'
import type { CognitoApi } from './cognitoApi'
import { cognitoEntry } from './importUsers'
import type { CognitoTable } from './importUsers'

/** The parts of Cognito's pre-sign-up trigger event this uses. */
export type PreSignUpEvent = {
  triggerSource: 'PreSignUp_SignUp' | 'PreSignUp_AdminCreateUser' | 'PreSignUp_ExternalProvider'
  userName?: string
  userPoolId?: string
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

export const GOOGLE_ACCOUNT = 'This email is used by a thesarvo account that signs in with Google. Use Continue with Google'
export const LINK_FAILED = 'Could not join your Google sign-in to your existing thesarvo account. Please try again, or sign in with your password'

type PoolUser = { Username: string; UserStatus?: string; Attributes?: { Name: string; Value: string }[] }

/** Cognito's filter strings quote the value and escape `\` and `"`. */
const filterValue = (s: string) => s.replace(/[\\"]/g, (c) => `\\${c}`)

async function usersWithEmail(api: CognitoApi, pool: string, email: string): Promise<PoolUser[]> {
  const found: PoolUser[] = []
  for (const e of new Set([email, email.toLowerCase()])) {
    const res = await api('ListUsers', { UserPoolId: pool, Filter: `email = "${filterValue(e)}"` })
    found.push(...((res.Users as PoolUser[] | undefined) ?? []))
  }
  return found
}

const verified = (u: PoolUser) => u.Attributes?.some((a) => a.Name === 'email_verified' && a.Value === 'true') ?? false

/**
 * A Google sign-in whose verified email already belongs to a password account (or to an old Confluence one that has
 * not signed in yet, which is created first) is joined to it, so the person lands in the same account, with the
 * same name, avatar and groups, whichever way they sign in. Only a verified email on both sides counts. If joining
 * fails the sign-in is refused, since carrying on would leave a second, empty account.
 */
async function linkGoogle(event: PreSignUpEvent, table: CognitoTable, pepper: string, api: CognitoApi) {
  const sub = /^Google_(.+)$/.exec(event.userName ?? '')?.[1]
  const pool = event.userPoolId
  const attrs = event.request.userAttributes
  const email = attrs.email ?? ''
  if (!sub || !pool || !email || attrs.email_verified !== 'true') return
  try {
    let target = (await usersWithEmail(api, pool, email)).find((u) => u.UserStatus !== 'EXTERNAL_PROVIDER' && verified(u))?.Username
    const old = target ? undefined : cognitoEntry(table, pepper, email)
    if (!target && old) {
      // The pool's user name is the email, written as the old site had it.
      await api('AdminCreateUser', {
        UserPoolId: pool, Username: email, MessageAction: 'SUPPRESS',
        UserAttributes: [{ Name: 'email', Value: email }, { Name: 'email_verified', Value: 'true' }, ...(old.name ? [{ Name: 'name', Value: old.name }] : [])],
      })
      // A user nobody has a password for sits in FORCE_CHANGE_PASSWORD; a random one settles it, and "Forgot password" sets a real one.
      await api('AdminSetUserPassword', { UserPoolId: pool, Username: email, Password: `${randomBytes(24).toString('base64url')}aA1!`, Permanent: true })
      target = email
    }
    if (!target) return
    await api('AdminLinkProviderForUser', {
      UserPoolId: pool,
      DestinationUser: { ProviderName: 'Cognito', ProviderAttributeValue: target },
      SourceUser: { ProviderName: 'Google', ProviderAttributeName: 'Cognito_Subject', ProviderAttributeValue: sub },
    })
  } catch (e) {
    console.error('Linking Google failed', e)
    throw new Error(LINK_FAILED)
  }
}

/**
 * Cognito calls this before creating a user who signed up on the login page. A Confluence user who has not signed
 * in yet is not in the pool, so signing up would give them a second, empty account: send them to sign in instead,
 * which migrates the old one. Throwaway inboxes are refused, and so is an email that already signs in with Google
 * (the form would make a second account). A first Google sign-in is joined to a matching account (`linkGoogle`).
 * Throwing shows the message on the sign-up form, after "PreSignUp failed with error" and with a full stop added,
 * so the messages end without one.
 */
export const preSignUp = (table: CognitoTable, pepper: string, api?: CognitoApi) => async (event: PreSignUpEvent) => {
  const email = event.request.userAttributes.email ?? ''
  if (event.triggerSource === 'PreSignUp_ExternalProvider') {
    if (api) await linkGoogle(event, table, pepper, api)
    return event
  }
  if (event.triggerSource !== 'PreSignUp_SignUp') return event
  if (cognitoEntry(table, pepper, email)) throw new Error(OLD_ACCOUNT)
  if (DISPOSABLE.has(email.split('@').pop()?.trim().toLowerCase() ?? '')) throw new Error(DISPOSABLE_EMAIL)
  // Only a lookup that worked can refuse; one that failed lets the sign-up through.
  const google = event.userPoolId && api ? await usersWithEmail(api, event.userPoolId, email).catch(() => []) : []
  if (google.some((u) => u.UserStatus === 'EXTERNAL_PROVIDER')) throw new Error(GOOGLE_ACCOUNT)
  return event
}
