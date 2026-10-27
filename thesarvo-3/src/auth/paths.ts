/** Where Cognito sends the browser back after sign-in. Kept apart from config.ts so vite.config can import it. */
export const CALLBACK_PATH = '/auth/callback'
/** Prerendered for the static site, like the callback. */
export const PASSWORD_PATH = '/account/password'
