import type { ReactNode } from 'react'
import type { Page } from '@neo/contracts'

export function Feedback({ loading, error, retry }: { loading?: boolean; error?: string; retry?: () => void }) {
  if (loading) return <p role="status" className="muted">Loading…</p>
  if (error) return <div className="neo-feedback" role="alert"><p>{error}</p>{retry && <button className="btn btn-secondary btn-sm" onClick={retry}>Try again</button>}</div>
  return null
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}
export function Pager({ pagination, onPage }: { pagination: Page<unknown>['pagination']; onPage: (offset: number) => void }) {
  const { limit, offset, total } = pagination
  if (total <= limit) return null
  return <nav aria-label="Results pages" className="row gap-sm wrap neo-pager">
    <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - limit))}>Previous</button>
    <span>{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
    <button className="btn btn-secondary btn-sm" disabled={offset + limit >= total} onClick={() => onPage(offset + limit)}>Next</button>
  </nav>
}
export function SetupNotice() {
  return <section className="card pad neo-setup"><h1>North East Origins is getting ready</h1><p>Accounts and projects will be available once setup is complete. Please check back soon.</p></section>
}
