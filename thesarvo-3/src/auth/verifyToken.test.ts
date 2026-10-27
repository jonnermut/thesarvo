// @vitest-environment node
import { createSign, generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyIdToken } from './verifyToken'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1' }

const issuer = 'https://cognito-idp.example/pool'
const clientId = 'client'
const now = 1_800_000_000_000
const opts = { issuer, clientId, keys: () => Promise.resolve([jwk]), now: () => now }

const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
function sign(claims: object, key = privateKey, header: object = { alg: 'RS256', kid: 'k1' }) {
  const body = `${enc(header)}.${enc({ iss: issuer, aud: clientId, token_use: 'id', exp: now / 1000 + 60, sub: 'u1', email: 'a@b.c', ...claims })}`
  return `${body}.${createSign('RSA-SHA256').update(body).sign(key).toString('base64url')}`
}

describe('verifyIdToken', () => {
  it('accepts a good token', async () => {
    expect(await verifyIdToken(sign({ name: 'Al' }), opts)).toEqual({ sub: 'u1', email: 'a@b.c', name: 'Al' })
  })
  it.each([
    ['a bad signature', sign({}, other), /signature/],
    ['an unknown key', sign({}, privateKey, { alg: 'RS256', kid: 'k2' }), /key/],
    ['alg none', sign({}, privateKey, { alg: 'none', kid: 'k1' }), /key/],
    ['an expired token', sign({ exp: now / 1000 - 1 }), /expired/],
    ['another client', sign({ aud: 'x' }), /not for this site/],
    ['another pool', sign({ iss: 'https://evil' }), /not for this site/],
    ['an access token', sign({ token_use: 'access' }), /not for this site/],
    ['garbage', 'abc', /Malformed/],
  ])('refuses %s', async (_, jwt, err) => {
    await expect(verifyIdToken(jwt, opts)).rejects.toThrow(err)
  })
})
