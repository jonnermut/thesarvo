import { describe, expect, it, vi } from 'vitest'
import { cachedTable, preToken } from './cognitoPreToken'
import type { PreTokenEvent } from './cognitoPreToken'

const event = (attrs: Record<string, string>, own?: string[]): PreTokenEvent => ({ request: { userAttributes: attrs, groupConfiguration: { groupsToOverride: own } }, response: {} })
const table = { 'cct-members': ['ann@x.com'], editors: ['bob@x.com'] }

describe('preToken', () => {
  it('adds the listed groups to the ones Cognito already has', async () => {
    const out = await preToken(async () => table)(event({ email: 'Ann@x.com', email_verified: 'true' }, ['admins']))
    expect(out.response.claimsOverrideDetails?.groupOverrideDetails?.groupsToOverride).toEqual(['admins', 'cct-members'])
  })

  it('leaves the token alone for someone not listed, or with an unverified email', async () => {
    const t = preToken(async () => table)
    expect((await t(event({ email: 'who@x.com', email_verified: 'true' }))).response).toEqual({})
    expect((await t(event({ email: 'ann@x.com', email_verified: 'false' }))).response).toEqual({})
    expect((await t(event({}))).response).toEqual({})
  })

  it('keeps Cognito groups when nothing is listed, and survives an unreadable table', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const kept = await preToken(async () => table)(event({ email: 'who@x.com', email_verified: 'true' }, ['admins']))
    expect(kept.response.claimsOverrideDetails?.groupOverrideDetails?.groupsToOverride).toEqual(['admins'])
    const failed = await preToken(() => Promise.reject(new Error('S3 down')))(event({ email: 'ann@x.com', email_verified: 'true' }))
    expect(failed.response).toEqual({})
  })
})

describe('cachedTable', () => {
  it('reads again only after the ttl', async () => {
    let t = 0
    const read = vi.fn(async () => table)
    const get = cachedTable(read, 1000, () => t)
    await get()
    t = 999
    await get()
    expect(read).toHaveBeenCalledTimes(1)
    t = 1000
    await get()
    expect(read).toHaveBeenCalledTimes(2)
  })
})
