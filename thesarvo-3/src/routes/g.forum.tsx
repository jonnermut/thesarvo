import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ForumPage } from '#/forum/ui/ForumPage'

/** The forum: sign-in only, all in the browser (`?thread=<id>` for one post), so the prerendered page is just a shell. */
export const Route = createFileRoute('/g/forum')({
  head: () => ({ meta: [{ title: 'Forum · thesarvo' }, { name: 'robots', content: 'noindex' }] }),
  // The router reads a number-like id from the address as a number.
  validateSearch: (search: Record<string, unknown>): { thread?: string } => {
    const thread = String(search.thread ?? '')
    return /^[\w-]{1,40}$/.test(thread) ? { thread } : {}
  },
  component: Forum,
})

function Forum() {
  const { thread } = Route.useSearch()
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <ForumPage thread={thread} go={(t) => void navigate({ to: '/g/forum', search: t ? { thread: t } : {} })} />
    </div>
  )
}
