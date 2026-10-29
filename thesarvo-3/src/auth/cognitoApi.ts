import { credentialsFromEnv, signedHeaders } from '#/aws/s3'
import { createHash } from 'node:crypto'

/** A call to the Cognito user pool API: the operation name and its JSON body, the JSON answer. */
export type CognitoApi = (op: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>

/** The pool API over plain `fetch`, signed by hand like S3 (the Lambda carries no SDK). */
export const cognitoApi = (region: string): CognitoApi => async (op, body) => {
  const creds = credentialsFromEnv()
  if (!creds) throw new Error('No AWS credentials')
  const url = new URL(`https://cognito-idp.${region}.amazonaws.com/`)
  const text = JSON.stringify(body)
  const extra = { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': `AWSCognitoIdentityProviderService.${op}` }
  const headers = signedHeaders('POST', url, region, creds, new Date(), createHash('sha256').update(text).digest('hex'), { service: 'cognito-idp', headers: extra })
  const res = await fetch(url, { method: 'POST', headers, body: text })
  const answer = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new Error(`Cognito ${op} failed (${res.status}): ${String(answer.__type ?? '')} ${String(answer.message ?? '')}`)
  return answer
}
