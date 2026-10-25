import { createFileRoute, redirect } from '@tanstack/react-router'
import { GUIDE_PREFIX } from '#/guide/content/paths'

// The app owns only /g; the bare root just forwards there until the migration decides otherwise.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ href: GUIDE_PREFIX })
  },
})
