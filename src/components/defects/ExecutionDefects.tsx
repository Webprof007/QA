import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { Defect } from '@/types'
export function ExecutionDefects({ failed, disabled, defects, linked, onCreate, onView, onLink }: { failed: boolean; disabled: boolean; defects: Defect[]; linked: Defect[]; onCreate: () => void; onView: (id: string) => void; onLink: (id: string) => string | null | Promise<string | null> }) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [page, setPage] = useState(0), [error, setError] = useState('')
  const visible = defects.filter(item => `${item.code} ${item.title}`.toLowerCase().includes(search.trim().toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(visible.length / 8)), currentPage = Math.min(page, pageCount - 1)
  return <section className="tc-section" aria-label="Linked Defects"><h3>Linked Defects</h3>
    {linked.map(item => <div key={item.id}><p>{item.code} — {item.title}</p><Button type="button" variant="link" disabled={disabled} onClick={() => onView(item.id)}>View Defect</Button></div>)}
    {failed && <div className="tc-panel-actions"><Button type="button" variant="outline" disabled={disabled} onClick={onCreate}>Create Defect</Button><Button type="button" variant="outline" disabled={disabled} onClick={() => { setOpen(true); setSearch(''); setPage(0); setError('') }}>Link Existing Defect</Button></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Link Existing Defect</DialogTitle><DialogDescription>Виберіть дефект поточного проєкту.</DialogDescription></DialogHeader>
      <Input aria-label="Search existing defects" placeholder="Search by BUG code or title..." value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
      {visible.slice(currentPage * 8, currentPage * 8 + 8).map(item => <div className="tc-panel-actions" key={item.id}><span>{item.code} — {item.title} · {item.status}</span><Button disabled={linked.some(value => value.id === item.id)} aria-label={`Link ${item.code}`} onClick={() => { void Promise.resolve(onLink(item.id)).then(message => { if (message) setError(message); else setOpen(false) }).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося пов’язати дефект.')) }}>Link</Button></div>)}
      {!visible.length && <p>Відповідних дефектів немає.</p>}
      <div className="tc-panel-actions"><Button variant="ghost" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous page</Button><span>{currentPage + 1} / {pageCount}</span><Button variant="ghost" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next page</Button></div>
      {error && <p role="alert" className="form-error">{error}</p>}
    </DialogContent></Dialog>
  </section>
}
