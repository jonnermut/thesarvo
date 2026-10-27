import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { changePassword, getIdToken } from './session'

const jwt = (claims: object) => `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.s`
const signIn = (extra: object = {}) =>
  localStorage.setItem('thesarvo.auth', JSON.stringify({ idToken: jwt({ sub: 'u1', email: 'a@b.c' }), refreshToken: 'r', expiresAt: Date.now() + 3_600_000, ...extra }))

beforeEach(() => localStorage.clear())
afterEach(() => void vi.restoreAllMocks())

describe('changePassword', () => {
  it('calls Cognito with the access token', async () => {
    signIn({ accessToken: 'acc' })
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    await changePassword('old', 'newpassword')
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://cognito-idp.ap-southeast-2.amazonaws.com/')
    expect((init.headers as Record<string, string>)['x-amz-target']).toBe('AWSCognitoIdentityProviderService.ChangePassword')
    expect(JSON.parse(init.body as string)).toEqual({ AccessToken: 'acc', PreviousPassword: 'old', ProposedPassword: 'newpassword' })
  })

  it('explains a wrong current password', async () => {
    signIn({ accessToken: 'acc' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ __type: 'NotAuthorizedException', message: 'Incorrect username or password.' }), { status: 400 }))
    await expect(changePassword('bad', 'newpassword')).rejects.toThrow('Your current password is not right.')
  })

  it('passes on Cognito’s message otherwise', async () => {
    signIn({ accessToken: 'acc' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ __type: 'com.amazon#InvalidPasswordException', message: 'Password not long enough' }), { status: 400 }))
    await expect(changePassword('old', 'x')).rejects.toThrow('Password not long enough')
  })

  it('asks an older session to sign in again', async () => {
    signIn()
    await expect(changePassword('old', 'newpassword')).rejects.toThrow('sign out and in again')
  })
})

describe('getIdToken', () => {
  it('is null when signed out and the stored token while it is fresh', async () => {
    expect(await getIdToken()).toBeNull()
    signIn()
    expect(await getIdToken()).toMatch(/^h\./)
  })
})
