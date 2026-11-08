import { useEffect, useState } from 'react'
import { offerAddPage } from '#/app/bridge'
import { AddPageDialog } from './AddPageDialog'

/** In the apps the site's page menu is hidden, so the app's own menu opens the Add a page dialog for the page on screen. */
export function AppAddPage({ parent, parentTitle }: { parent: string; parentTitle: string }) {
  const [adding, setAdding] = useState(false)
  useEffect(() => offerAddPage(() => setAdding(true)), [])
  return adding ? <AddPageDialog parent={parent} parentTitle={parentTitle} onClose={() => setAdding(false)} /> : null
}
