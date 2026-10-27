// @vitest-environment node
import { createHash, pbkdf2Sync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { migrateUser } from './cognitoMigrate'
import type { MigrateUserEvent } from './cognitoMigrate'
import { confluenceCredential, parseConfluenceHash, toPhc, verifyConfluencePassword } from './confluenceHash'
import type { ConfluenceUser } from './importUsers'
import { cognitoKey, onePerEmail, parseUsersTsv, toAuth0, toCognitoTable, toWorkos } from './importUsers'

const salt = Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex')
const modern = confluenceCredential('crimp hard', salt)
const legacy = createHash('sha512').update('old secret').digest('base64')
const user = (patch: Partial<ConfluenceUser>): ConfluenceUser => ({ username: 'alice', email: 'Alice@Example.com', displayName: 'Alice', credential: modern, lastLogin: '2026-01-01 10:00:00', ...patch })

describe('confluence hashes', () => {
  it('verifies the PBKDF2 format', () => {
    expect(modern.startsWith('{PKCS5S2}')).toBe(true)
    expect(verifyConfluencePassword(modern, 'crimp hard')).toBe(true)
    expect(verifyConfluencePassword(modern, 'crimp soft')).toBe(false)
  })

  it('verifies the legacy unsalted SHA-512 format', () => {
    expect(parseConfluenceHash(legacy)?.kind).toBe('sha512')
    expect(verifyConfluencePassword(legacy, 'old secret')).toBe(true)
    expect(verifyConfluencePassword(legacy, 'nope')).toBe(false)
  })

  it('rejects anything else', () => {
    expect(parseConfluenceHash('')).toBeNull()
    expect(verifyConfluencePassword('{PKCS5S2}abc', 'x')).toBe(false)
  })

  it('converts to a PHC string that describes the same key', () => {
    const hash = parseConfluenceHash(modern)
    if (hash?.kind !== 'pbkdf2') throw new Error('expected pbkdf2')
    const phc = toPhc(hash)
    expect(phc).toMatch(/^\$pbkdf2-sha1\$i=10000,l=32\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/)
    const [, , params, s, k] = phc.split('$')
    expect(params).toBe('i=10000,l=32')
    expect(Buffer.from(k, 'base64')).toEqual(pbkdf2Sync('crimp hard', Buffer.from(s, 'base64'), 10_000, 32, 'sha1'))
  })
})

describe('importing users', () => {
  it('reads the export', () => {
    const tsv = 'user_name\temail\tdisplay_name\tcredential\tlast_login\nbob\tbob@x.org\tBob\tabc\tNULL\n'
    expect(parseUsersTsv(tsv)).toEqual([{ username: 'bob', email: 'bob@x.org', displayName: 'Bob', credential: 'abc', lastLogin: '' }])
  })

  it('keeps the most recently used account per email', () => {
    const users = onePerEmail([
      user({ username: 'old', lastLogin: '2015-01-01 00:00:00' }),
      user({ username: 'new', email: 'alice@example.com ' }),
      user({ username: 'never', lastLogin: '' }),
      user({ username: 'nomail', email: '' }),
    ])
    expect(users.map((u) => [u.username, u.email])).toEqual([['new', 'alice@example.com']])
  })

  it('carries PBKDF2 hashes to Auth0 and WorkOS, and leaves legacy ones to reset', () => {
    expect(toAuth0(user({})).custom_password_hash?.hash.value).toMatch(/^\$pbkdf2-sha1\$/)
    expect(toWorkos(user({})).password_hash).toMatch(/^\$pbkdf2-sha1\$/)
    expect(toAuth0(user({ credential: legacy }))).not.toHaveProperty('custom_password_hash')
    expect(toWorkos(user({ credential: legacy }))).not.toHaveProperty('password_hash')
  })

  it('keys the Cognito table by an HMAC of the email, without legacy hashes', () => {
    const table = toCognitoTable([user({}), user({ email: 'b@x.org', credential: legacy })], 'pepper')
    expect(Object.keys(table)).toEqual([cognitoKey('pepper', 'alice@example.com')])
    expect(JSON.stringify(table)).not.toContain('alice')
    expect(cognitoKey('other', 'alice@example.com')).not.toBe(Object.keys(table)[0])
  })
})

describe('Cognito migrate-user trigger', () => {
  const handler = migrateUser(toCognitoTable([user({})], 'pepper'), 'pepper')
  const event = (triggerSource: MigrateUserEvent['triggerSource'], userName: string, password?: string): MigrateUserEvent => ({
    triggerSource, userName, request: { password }, response: {},
  })

  it('creates a confirmed user when the old password matches', async () => {
    const result = await handler(event('UserMigration_Authentication', 'ALICE@example.com', 'crimp hard'))
    expect(result.response).toEqual({ userAttributes: { email: 'ALICE@example.com', email_verified: 'true' }, finalUserStatus: 'CONFIRMED', messageAction: 'SUPPRESS' })
  })

  it('refuses a wrong password or an unknown email', async () => {
    await expect(handler(event('UserMigration_Authentication', 'alice@example.com', 'wrong'))).rejects.toThrow()
    await expect(handler(event('UserMigration_Authentication', 'eve@example.com', 'crimp hard'))).rejects.toThrow()
  })

  it('lets a known email reset its password without the old one', async () => {
    const result = await handler(event('UserMigration_ForgotPassword', 'alice@example.com'))
    expect(result.response.finalUserStatus).toBe('RESET_REQUIRED')
  })
})
