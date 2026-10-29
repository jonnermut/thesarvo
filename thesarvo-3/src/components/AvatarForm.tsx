import { useRef, useState } from 'react'
import { call } from '#/auth/apiCall'
import { MyAvatar, reloadAvatars } from '#/guide/avatars/Avatar'
import { shrink } from '#/guide/avatars/shrink'

/** Your picture in Account settings: choose a photo (cropped to a square and shrunk here), or remove the one you uploaded. */
export function AvatarForm() {
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: string }>({})
  const send = async (file: File) => {
    setState({ busy: true })
    let image: string
    try {
      image = await shrink(file)
    } catch {
      return setState({ error: 'Could not read that picture. Try a JPEG or PNG.' })
    }
    const a = await call<{ file: string }>('avatar', { method: 'POST', body: JSON.stringify({ image }) })
    if (!a.ok) return setState({ error: a.message })
    reloadAvatars()
    setState({ done: 'Your picture is saved.' })
  }
  const remove = async () => {
    setState({ busy: true })
    const a = await call<object>('avatar', { method: 'DELETE' })
    if (!a.ok) return setState({ error: a.message })
    reloadAvatars()
    setState({ done: 'Your uploaded picture is removed.' })
  }
  return (
    <section className="mb-6 flex items-center gap-4">
      <MyAvatar className="size-16 text-2xl" />
      <div>
        <h2 className="font-semibold">Your picture</h2>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void send(file)
          }}
        />
        <div className="mt-1 flex gap-3 text-sm">
          <button type="button" disabled={state.busy} onClick={() => input.current?.click()} className="text-link underline disabled:opacity-50">
            {state.busy ? 'Saving…' : 'Choose a picture'}
          </button>
          <button type="button" disabled={state.busy} onClick={() => void remove()} className="text-muted underline disabled:opacity-50">
            Remove
          </button>
        </div>
        {state.error && <p role="alert" className="mt-1 text-sm text-red-700">{state.error}</p>}
        {state.done && <p className="mt-1 text-sm text-muted">{state.done}</p>}
      </div>
    </section>
  )
}
