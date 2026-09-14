import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { TestPlan } from '@/types'
import '../App.css'
import './AuditPage.css'
import './TestCasesPage.css'
import './Planning.css'

const sections = [ ['objective', 'Objective'], ['scopeIn', 'In scope'], ['scopeOut', 'Out of scope'], ['environment', 'Test Environment'], ['entryCriteria', 'Entry Criteria'], ['exitCriteria', 'Exit Criteria'], ['risks', 'Risks'], ['notes', 'Notes'] ] as const
export function TestPlanPage({ projectId, plans, onSave }: { projectId: string; plans: TestPlan[]; onSave: (plan: TestPlan) => void }) {
  const [draft, setDraft] = useState<TestPlan | null>(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const visiblePlans = plans.filter(plan => plan.projectId === projectId)
  const current = visiblePlans.find(plan => plan.id === selectedId)
  const active = draft ?? current
  function create() {
    setSelectedId(''); setError('')
    setDraft({ id: crypto.randomUUID(), projectId, title: 'Test Plan', version: '1.0', status: 'Draft', objective: '', scopeIn: '', scopeOut: '', environment: '', entryCriteria: '', exitCriteria: '', risks: '', startDate: '', endDate: '', notes: '', updatedAt: new Date().toISOString() })
  }
  function save(event: React.FormEvent) {
    event.preventDefault()
    if (!draft) return
    if (!draft.title.trim()) { setError('Введіть назву плану.'); return }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) { setError('Дата завершення має бути не раніше дати початку.'); return }
    onSave({ ...draft, projectId, title: draft.title.trim(), updatedAt: new Date().toISOString() }); setSelectedId(draft.id); setDraft(null); setError('')
  }
  return <main className="smoke-app"><header className="page-heading"><h1>Test Plan</h1></header>
    {!active ? <div className="tc-list">
      <div className="tc-toolbar"><Button className="tc-add" onClick={create}>New Test Plan</Button></div>
      <table className="tc-table"><colgroup><col /><col style={{ width: '10%' }} /><col style={{ width: '13%' }} /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} /></colgroup>
        <thead><tr>{['Title', 'Version', 'Status', 'Start date', 'End date', 'Updated'].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{visiblePlans.map(plan => <tr key={plan.id} onClick={() => setSelectedId(plan.id)}>
          <td><button className="tc-open" onClick={() => setSelectedId(plan.id)} aria-label={`Open ${plan.title}`}>{plan.title}</button></td>
          <td>{plan.version || '—'}</td><td>{plan.status}</td><td>{plan.startDate || '—'}</td><td>{plan.endDate || '—'}</td><td>{new Date(plan.updatedAt).toLocaleDateString()}</td>
        </tr>)}</tbody>
      </table>
      {!visiblePlans.length && <p className="muted">Плани тестування поки не створено.</p>}
    </div> : <form className="plan-document tc-form" onSubmit={save}>
      <div><Button type="button" variant="ghost" onClick={() => { setSelectedId(''); setDraft(null); setError('') }}>← Test Plans</Button></div>
      <div className="tc-panel-actions">{draft ? <><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => { setDraft(null); setError('') }}>Cancel</Button></> : <Button type="button" variant="outline" onClick={() => setDraft(structuredClone(active))}>Edit</Button>}</div>
      <div className="plan-metadata">{(['title', 'version', 'status'] as const).map(key => <div className="field" key={key}><label htmlFor={`plan-${key}`}>{key === 'title' ? 'Title' : key === 'version' ? 'Version' : 'Status'}</label>{draft ? key === 'status' ? <select id={`plan-${key}`} className="audit-select" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as TestPlan['status'] })}>{['Draft', 'Active', 'Completed'].map(status => <option key={status}>{status}</option>)}</select> : <Input id={`plan-${key}`} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <p>{active[key] || '—'}</p>}</div>)}</div>
      {sections.map(([key, label]) => <section className="tc-section" key={key}><h3><label htmlFor={`plan-${key}`}>{label}</label></h3>{draft ? <Textarea id={`plan-${key}`} rows={3} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <p>{active[key] || '—'}</p>}</section>)}
      <section className="tc-section"><h3>Schedule</h3><div className="tc-field-pair">{(['startDate', 'endDate'] as const).map(key => <div className="field" key={key}><label htmlFor={`plan-${key}`}>{key === 'startDate' ? 'Start date' : 'End date'}</label>{draft ? <Input id={`plan-${key}`} type="date" value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <p>{active[key] || '—'}</p>}</div>)}</div></section>
      {error && <p role="alert" className="form-error">{error}</p>}
    </form>}
  </main>
}
