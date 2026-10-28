import { groupsFor } from './groups'
import type { GroupTable } from './groups'

/** The parts of Cognito's pre-token-generation (V1) trigger event this uses. */
export type PreTokenEvent = {
  request: { userAttributes: Record<string, string>; groupConfiguration?: { groupsToOverride?: string[] } }
  response: { claimsOverrideDetails?: { groupOverrideDetails?: { groupsToOverride: string[] } } }
}

/**
 * Cognito calls this each time it makes tokens (a sign-in or a refresh). The user's groups in the token become their
 * Cognito groups plus the ones the membership table (groups.ts) lists for their email, so a Confluence member who has
 * just signed in for the first time is in `cct-members` at once, with no per-user step. Only a verified email counts.
 * A failure to read the table leaves the groups as they were: a lookup problem must never stop anyone signing in.
 */
export const preToken = (load: () => Promise<GroupTable>) => async (event: PreTokenEvent) => {
  const { email, email_verified: verified } = event.request.userAttributes
  if (!email || verified !== 'true') return event
  let listed: string[]
  try {
    listed = groupsFor(await load(), email)
  } catch (e) {
    console.error('groups table unreadable', e)
    return event
  }
  const own = event.request.groupConfiguration?.groupsToOverride ?? []
  const groups = [...new Set([...own, ...listed])]
  if (groups.length) event.response.claimsOverrideDetails = { groupOverrideDetails: { groupsToOverride: groups } }
  return event
}

/** Re-reads the table at most this often, so a busy hour is one S3 read a minute per Lambda instance, and a change takes at most this long to apply. */
export const cachedTable = (read: () => Promise<GroupTable>, ttlMs = 60_000, now: () => number = Date.now) => {
  let cached: { at: number; table: GroupTable } | undefined
  return async () => {
    if (!cached || now() - cached.at >= ttlMs) cached = { at: now(), table: await read() }
    return cached.table
  }
}
