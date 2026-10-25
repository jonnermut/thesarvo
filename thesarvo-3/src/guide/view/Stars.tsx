/** Quality rating: "", "*", "**" or "***". */
export function Stars({ stars }: { stars: string }) {
  const count = stars.replace(/[^*]/g, '').length
  if (!count) return null
  return (
    <span className="text-amber" role="img" aria-label={`${count} star${count > 1 ? 's' : ''}`}>
      {'★'.repeat(count)}
    </span>
  )
}
