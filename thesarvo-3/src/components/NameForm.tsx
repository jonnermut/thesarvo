import { useState } from 'react'
import { NAME_MAX, nameProblem, setName, useUser } from '#/auth/session'

const input = 'mt-1 w-full rounded-md border border-line bg-white px-3 py-2 focus:border-link focus:outline-none'

/** The signed-in user's name, saved to their Cognito account. Problems show once they try to save. */
export function NameForm({ submit = 'Save', onSaved }: { submit?: string; onSaved: () => void }) {
  const user = useUser()
  const [name, setValue] = useState(user?.name ?? '')
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({})
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const problem = nameProblem(name)
        if (problem) return setState({ error: problem })
        setState({ busy: true })
        setName(name).then(onSaved, (err: unknown) => setState({ error: err instanceof Error ? err.message : 'Could not save your name' }))
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">Your name</span>
        <input className={input} autoComplete="name" required maxLength={NAME_MAX} value={name} onChange={(e) => setValue(e.target.value)} placeholder="First and last name" />
        <span className="mt-1 block text-xs text-muted">Shown beside your changes in each guide’s history.</span>
      </label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={state.busy} className="rounded-md bg-brand px-4 py-2 text-white disabled:opacity-50">
        {state.busy ? 'Saving…' : submit}
      </button>
    </form>
  )
}
