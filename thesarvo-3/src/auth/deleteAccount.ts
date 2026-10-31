import type { CognitoApi } from './cognitoApi'

/**
 * Deletes a person's sign-in (Apple 5.1.1(v) and Google Play require deleting an account from inside the app). The Cognito user
 * and its linked sign-ins go; forum posts and page edits stay under the name they were made with, as the privacy policy says.
 * `sub` works as the username in the admin calls.
 */
export async function deleteAccount(api: CognitoApi, poolId: string, sub: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(sub)) throw new Error('Not a user id')
  await api('AdminDeleteUser', { UserPoolId: poolId, Username: sub })
}

/** The pool id (`ap-southeast-2_xxxx`) from a token issuer URL. */
export const poolIdOf = (issuer: string) => issuer.slice(issuer.lastIndexOf('/') + 1)
