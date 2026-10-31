/** The Cognito user pool and app client (public values; see scripts/cognito-setup.sh). */
export const COGNITO = {
  domain: import.meta.env.VITE_COGNITO_DOMAIN ?? 'https://auth.thesarvo.com',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '4k87ngaoja8g1urdvoai6udpbl',
  /** The apps' client (scripts/add-mobile-client.sh): its ID tokens are accepted by the API too. Empty until created. */
  mobileClientId: import.meta.env.VITE_COGNITO_MOBILE_CLIENT_ID ?? '7b9l6bgg8aln7jo1s877d49q8i',
  issuer: import.meta.env.VITE_COGNITO_ISSUER ?? 'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_cPzy3RGP8',
}
