/** The Cognito user pool and app client (public values; see scripts/cognito-setup.sh). */
export const COGNITO = {
  domain: import.meta.env.VITE_COGNITO_DOMAIN ?? 'https://thesarvo.auth.ap-southeast-2.amazoncognito.com',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '4k87ngaoja8g1urdvoai6udpbl',
  issuer: import.meta.env.VITE_COGNITO_ISSUER ?? 'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_cPzy3RGP8',
}
