/** A small padlock for pages only some people can see (`IndexNode.private`), so a signed-in reader knows a page is not public. */
export function LockMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" role="img" aria-label="Private page" className={`inline-block size-3.5 shrink-0 text-muted ${className}`} fill="currentColor">
      <title>Private: only people with access can see this page</title>
      <path d="M6 8V6a4 4 0 118 0v2h.5A1.5 1.5 0 0116 9.5v7a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 014 16.5v-7A1.5 1.5 0 015.5 8H6zm2 0h4V6a2 2 0 10-4 0v2z" />
    </svg>
  )
}
