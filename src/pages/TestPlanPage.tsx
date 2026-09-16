import { AddEntityButton } from '@/components/AddEntityButton'
import { AccountBackButton } from '@/components/AccountBackButton'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { TestPlan } from '@/types'
import './TestPlanPage.css'

const sections = [ ['objective', 'Objective'], ['scopeIn', 'In scope'], ['scopeOut', 'Out of scope'], ['environment', 'Test Environment'], ['entryCriteria', 'Entry Criteria'], ['exitCriteria', 'Exit Criteria'], ['risks', 'Risks'], ['notes', 'Notes'] ] as const
export function TestPlanPage({ projectId, plans, onSave, onDelete }: { projectId: string; plans: TestPlan[]; onSave: (plan: TestPlan, creating: boolean) => Promise<TestPlan> | TestPlan; onDelete?: (id: string) => Promise<void> }) {
  const [draft, setDraft] = useState<TestPlan | null>(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [deleting, setDeleting] = useState<TestPlan | null>(null)
  const visiblePlans = plans.filter(plan => plan.projectId === projectId)
  const current = visiblePlans.find(plan => plan.id === selectedId)
  const active = draft ?? current
  function create() {
    setSelectedId(''); setError('')
    setDraft({ id: crypto.randomUUID(), projectId, title: 'Test Plan', version: '1.0', status: 'Draft', objective: '', scopeIn: '', scopeOut: '', environment: '', entryCriteria: '', exitCriteria: '', risks: '', startDate: '', endDate: '', notes: '', updatedAt: new Date().toISOString() })
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!draft) return
    if (!draft.title.trim()) { setError('Введіть назву плану.'); return }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) { setError('Дата завершення має бути не раніше дати початку.'); return }
    try { const saved = await onSave({ ...draft, projectId, title: draft.title.trim(), updatedAt: new Date().toISOString() }, !visiblePlans.some(item => item.id === draft.id)); setSelectedId(saved.id); setDraft(null); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти Test Plan.') }
  }
  return <main className="smoke-app"><header className="page-heading"><h1>Test Plan</h1></header>
    {!active ? <div className="tc-list">
      <div className="tc-toolbar"><AddEntityButton entity="test plan" onClick={create} /></div>
      <table className="tc-table"><colgroup><col /><col style={{ width: '10%' }} /><col style={{ width: '13%' }} /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} /></colgroup>
        <thead><tr>{['Title', 'Version', 'Status', 'Start date', 'End date', 'Updated'].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{visiblePlans.map(plan => <tr key={plan.id} onClick={() => setSelectedId(plan.id)}>
          <td><button className="tc-open" onClick={() => setSelectedId(plan.id)} aria-label={`Open ${plan.title}`}>{plan.title}</button></td>
          <td>{plan.version || '—'}</td><td>{plan.status}</td><td>{plan.startDate || '—'}</td><td>{plan.endDate || '—'}</td><td>{new Date(plan.updatedAt).toLocaleDateString()}</td>
        </tr>)}</tbody>
      </table>
      {!visiblePlans.length && <p className="muted">Плани тестування поки не створено.</p>}
    </div> : <form className="plan-document tc-form" onSubmit={save}>
      <AccountBackButton onClick={() => { setSelectedId(''); setDraft(null); setError('') }}>← Test Plans</AccountBackButton>
      {!draft && <div className="tc-panel-actions"><Button type="button" variant="outline" onClick={() => setDraft(structuredClone(active))}>Edit</Button></div>}
      {!draft && onDelete && <Button type="button" variant="destructive" onClick={() => setDeleting(active)}>Delete Test Plan</Button>}
      <div className="plan-metadata">{(['title', 'version', 'status'] as const).map(key => <div className="field" key={key}><label htmlFor={`plan-${key}`}>{key === 'title' ? 'Title' : key === 'version' ? 'Version' : 'Status'}</label>{draft ? key === 'status' ? <select id={`plan-${key}`} className="audit-select" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as TestPlan['status'] })}>{['Draft', 'Active', 'Completed'].map(status => <option key={status}>{status}</option>)}</select> : <Input id={`plan-${key}`} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <p>{active[key] || '—'}</p>}</div>)}</div>
      {sections.map(([key, label]) => <section className="tc-section" key={key}><h3><label htmlFor={`plan-${key}`}>{label}</label></h3>{draft ? <Textarea id={`plan-${key}`} rows={3} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <p>{active[key] || '—'}</p>}</section>)}
      <section className="tc-section"><h3>Schedule</h3><div className="tc-field-pair">{(['startDate', 'endDate'] as const).map(key => <div className="field" key={key}><label htmlFor={`plan-${key}`}>{key === 'startDate' ? 'Start date' : 'End date'}</label>{draft ? <Input id={`plan-${key}`} type="date" value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <p>{active[key] || '—'}</p>}</div>)}</div></section>
      {error && <p role="alert" className="form-error">{error}</p>}
      {draft && <div className="tc-panel-actions plan-form-actions"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => { setDraft(null); setError('') }}>Cancel</Button></div>}
    </form>}
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.title}?</DialogTitle><DialogDescription>This removes the Test Plan from the current project.</DialogDescription></DialogHeader>{error && <p role="alert" className="form-error">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={async () => { if (!deleting || !onDelete) return; try { await onDelete(deleting.id); setDeleting(null); setSelectedId(''); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося видалити Test Plan.') } }}>Delete Test Plan</Button></DialogFooter></DialogContent></Dialog>
  </main>
}
