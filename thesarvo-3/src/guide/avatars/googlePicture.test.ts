import { beforeEach, describe, expect, it, vi } from 'vitest'

import { importGooglePicture } from './googlePicture'

const state = vi.hoisted(() => ({ claims: {}, uploaded: {}, calls: [] as string[] }))

vi.mock('#/auth/session', () => ({ getIdToken: async () => 'token', claims: () => state.claims }))
vi.mock('#/auth/apiCall', () => ({ call: async (name: string) => (state.calls.push(name), { ok: true, value: { file: 'x.jpg' } }) }))
vi.mock('./Avatar', () => ({ avatars: async () => ({ imported: {}, uploaded: state.uploaded }), reloadAvatars: () => {} }))
vi.mock('./shrink', () => ({ shrink: async () => 'data:image/jpeg;base64,/9j/' }))

describe('Google picture import', () => {
  beforeEach(() => {
    localStorage.clear()
    state.calls = []
    state.uploaded = {}
    state.claims = { sub: 's1', email: 'a@b.c', picture: 'https://lh3.googleusercontent.com/a', identities: [{}] }
    vi.stubGlobal('fetch', async () => new Response(new Blob(['x'])))
  })

  it('uploads Google’s picture once, for someone with none', async () => {
    await importGooglePicture()
    await importGooglePicture()
    expect(state.calls).toEqual(['avatar'])
  })

  it('leaves alone someone who has a picture, or who did not sign in with Google', async () => {
    state.uploaded = { s1: 'mine.jpg' }
    await importGooglePicture()
    localStorage.clear()
    state.uploaded = {}
    state.claims = { sub: 's1', email: 'a@b.c', picture: 'https://x/y' }
    await importGooglePicture()
    expect(state.calls).toEqual([])
  })
})
