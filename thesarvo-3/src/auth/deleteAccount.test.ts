import { describe, expect, it, vi } from 'vitest'
import { deleteAccount, poolIdOf } from './deleteAccount'

describe('deleteAccount', () => {
  it('deletes the user by sub from the pool', async () => {
    const api = vi.fn(async () => ({}))
    await deleteAccount(api, 'ap-southeast-2_abc', '11111111-2222-3333-4444-555555555555')
    expect(api).toHaveBeenCalledWith('AdminDeleteUser', { UserPoolId: 'ap-southeast-2_abc', Username: '11111111-2222-3333-4444-555555555555' })
  })
  it('refuses anything that is not a user id', async () => {
    const api = vi.fn(async () => ({}))
    await expect(deleteAccount(api, 'p', 'someone@example.com')).rejects.toThrow()
    expect(api).not.toHaveBeenCalled()
  })
  it('finds the pool id in an issuer', () => {
    expect(poolIdOf('https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_cPzy3RGP8')).toBe('ap-southeast-2_cPzy3RGP8')
  })
})
