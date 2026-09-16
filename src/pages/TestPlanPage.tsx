import { AccountBackButton } from '@/components/AccountBackButton'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { TestPlan } from '@/types'
import './TestPlanPage.css'

const sections = [
  ['objective', 'Objective / Мета'],
  ['scopeIn', 'In scope / У межах перевірки'],
  ['scopeOut', 'Out of scope / Поза межами перевірки'],
  ['environment', 'Test Environment / Тестове середовище'],
  ['entryCriteria', 'Entry Criteria / Критерії початку'],
  ['exitCriteria', 'Exit Criteria / Критерії завершення'],
  ['risks', 'Risks / Ризики'],
  ['notes', 'Notes / Примітки'],
] as const
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
    setDraft({ id: crypto.randomUUID(), projectId, title: '', version: '1.0', status: 'Draft', objective: '', scopeIn: '', scopeOut: '', environment: '', entryCriteria: '', exitCriteria: '', risks: '', startDate: '', endDate: '', notes: '', updatedAt: new Date().toISOString() })
  }
  function edit(plan: TestPlan) { setSelectedId(''); setDraft(structuredClone(plan)); setError('') }
  function close() { setSelectedId(''); setDraft(null); setError('') }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!draft) return
    if (!draft.title.trim()) { setError('Введіть назву плану.'); return }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) { setError('Дата завершення має бути не раніше дати початку.'); return }
    try { await onSave({ ...draft, projectId, title: draft.title.trim(), updatedAt: new Date().toISOString() }, !visiblePlans.some(item => item.id === draft.id)); close() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти Test Plan.') }
  }
  return <main className="smoke-app"><header className="page-heading"><h1>Test Plan / План тестування</h1></header>
    {!active ? <div className="tc-list">
      <div className="tc-toolbar"><Button type="button" variant="outline" size="sm" className="tc-add h-8" onClick={create}>+ Create Test Plan</Button></div>
      <table className="tc-table"><colgroup><col /><col style={{ width: '10%' }} /><col style={{ width: '13%' }} /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} /><col className="tc-actions-column" /></colgroup>
        <thead><tr>{['Title / Назва', 'Version / Версія', 'Status / Статус', 'Start date / Дата початку', 'End date / Дата завершення', 'Updated / Оновлено'].map(label => <th key={label}>{label}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{visiblePlans.map(plan => <tr key={plan.id} onClick={() => setSelectedId(plan.id)}>
          <td><button className="tc-open" onClick={() => setSelectedId(plan.id)} aria-label={`Open ${plan.title}`}>{plan.title}</button></td>
          <td>{plan.version || '—'}</td><td>{plan.status}</td><td>{plan.startDate || '—'}</td><td>{plan.endDate || '—'}</td><td>{new Date(plan.updatedAt).toLocaleDateString()}</td>
          <td onClick={event => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={`Actions ${plan.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => edit(plan)}>Edit</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => { setDeleting(plan); setError('') }}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
        </tr>)}</tbody>
      </table>
      {!visiblePlans.length && <p className="muted">Плани тестування поки не створено.</p>}
    </div> : <form className="plan-document tc-form" onSubmit={save}>
      <AccountBackButton onClick={close}>← Test Plans</AccountBackButton>
      <div className="plan-metadata">{(['title', 'version', 'status'] as const).map(key => <div className="field" key={key}><label htmlFor={`plan-${key}`}>{key === 'title' ? 'Title / Назва' : key === 'version' ? 'Version / Версія' : 'Status / Статус'}</label>{draft ? key === 'status' ? <select id={`plan-${key}`} className="audit-select" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as TestPlan['status'] })}>{['Draft / Чернетка', 'Active / Активний', 'Completed / Завершений'].map(status => <option key={status} value={status.split(' / ')[0]}>{status}</option>)}</select> : <Input id={`plan-${key}`} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <p>{active[key] || '—'}</p>}</div>)}</div>
      {sections.map(([key, label]) => <section className="tc-section" key={key}><h3><label htmlFor={`plan-${key}`}>{label}</label></h3>{draft ? <Textarea id={`plan-${key}`} rows={3} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <p>{active[key] || '—'}</p>}</section>)}
      <section className="tc-section"><h3>Schedule / Розклад</h3><div className="tc-field-pair">{(['startDate', 'endDate'] as const).map(key => <div className="field" key={key}><label htmlFor={`plan-${key}`}>{key === 'startDate' ? 'Start date / Дата початку' : 'End date / Дата завершення'}</label>{draft ? <Input id={`plan-${key}`} type="date" value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <p>{active[key] || '—'}</p>}</div>)}</div></section>
      {error && <p role="alert" className="form-error">{error}</p>}
      {draft && <div className="tc-panel-actions plan-form-actions"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={close}>Cancel</Button></div>}
    </form>}
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open) { setDeleting(null); setError('') } }}><DialogContent><DialogHeader><DialogTitle>Delete test plan “{deleting?.title}”?</DialogTitle><DialogDescription>Тест-план буде видалено безповоротно.</DialogDescription></DialogHeader>{error && <p role="alert" className="form-error">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => { setDeleting(null); setError('') }}>Cancel</Button><Button variant="destructive" onClick={async () => { if (!deleting || !onDelete) return; try { await onDelete(deleting.id); setDeleting(null); setSelectedId(''); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося видалити Test Plan.') } }}>Delete</Button></DialogFooter></DialogContent></Dialog>
  </main>
}
