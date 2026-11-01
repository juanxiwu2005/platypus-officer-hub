/** A persistent content area while route code loads, also announced to screen readers. */
export function RouteLoading({ label = "Loading…", fullPage = false }: { label?: string; fullPage?: boolean }) {
  const content = <p role="status" aria-live="polite" aria-atomic="true">{label}</p>
  return fullPage
    ? <main className="route-loading route-loading-page" aria-label="Loading workspace">{content}</main>
    : <section className="route-loading" aria-label="Loading content">{content}</section>
}
