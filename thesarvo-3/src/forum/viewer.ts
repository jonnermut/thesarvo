import { emailKey } from '#/guide/avatars/keys'
import type { Editor } from '#/auth/verifyToken'
import type { Viewer } from './service'

/** The forum's view of a signed-in user: their name (or the start of their email until they set one) and whether they are an admin. */
export const viewerOf = async (e: Editor): Promise<Viewer> => ({ ...(e.email && { key: await emailKey(e.email) }), sub: e.sub, name: e.name || e.email.split('@')[0] || 'Someone', groups: e.groups, admin: e.groups.includes('admins') })
