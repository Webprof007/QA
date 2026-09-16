import { useState } from 'react'
import { AccountBackButton } from '@/components/AccountBackButton'
import { AddEntityButton } from '@/components/AddEntityButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AuditFindingsPage, type AuditFindingsProps } from './AuditFindingsPage'
import type { Audit, AuditCheck, AuditState } from '@/types'
import '../App.css'
import './AuditPage.css'

type Props = Omit<AuditFindingsProps, 'auditId' | 'readOnly' | 'items' | 'onDeleteItem'> & {
  data: AuditState
  onSaveAudit: (audit: Audit) => string | null
  onTransition: (id: string, action: 'start' | 'complete') => string | null
  onSaveCheck: (check: AuditCheck) => string | null
  onDeleteFinding: (auditId: string, id: string) => string | null
}
const fields = [['title', 'Title / Назва'], ['objective', 'Objective / Мета'], ['scope', 'Scope / Обсяг'], ['startDate', 'Start date / Дата початку'], ['endDate', 'End date / Планове завершення'], ['notes', 'Notes / Нотатки'], ['limitations', 'Limitations / Обмеження']] as const
export function AuditPage({ data, onSaveAudit, onTransition, onSaveCheck, onDeleteFinding, ...findingProps }: Props) {
  const { projectId, auditTypes } = findingProps
  const [selectedId, setSelectedId] = useState(() => data.findings.find(item => item.projectId === projectId && item.id === findingProps.initialFindingId)?.auditId ?? '')
  const [draft, setDraft] = useState<Audit | null>(null)
  const [check, setCheck] = useState<AuditCheck | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const audits = data.audits.filter(item => item.projectId === projectId)
  const selected = audits.find(item => item.id === selectedId)
  const checks = selected ? data.checks.filter(item => item.projectId === projectId && item.auditId === selected.id) : []
  const readOnly = selected?.status === 'Completed'
  const types = auditTypes.filter(item => item.projectId === projectId)
  function create() {
    setError('')
    setDraft({ id: '', projectId, code: '', title: '', typeId: '', status: 'Draft', objective: '', scope: '', startDate: '', endDate: '', notes: '', limitations: '', createdAt: '', updatedAt: '' })
  }
  function transition(action: 'start' | 'complete') {
    if (!selected) return
    const failure = onTransition(selected.id, action)
    setError(failure ?? '')
    if (!failure) { setConfirming(false); setCheck(null); setDraft(null) }
  }
  return <main className="smoke-app audit-page">
    <header className="page-heading"><h1>Audit</h1></header>
    {error && <p role="alert" className="form-error">{error}</p>}
    {!selected ? <>
      <div className="tc-toolbar"><AddEntityButton entity="audit" onClick={create} /></div>
      <div className="tc-list"><table className="tc-table" aria-label="Audits"><thead><tr>{['Code', 'Title', 'Type', 'Status', 'Started', 'Completed', 'Updated'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{audits.map(item => <tr key={item.id} onClick={() => { setSelectedId(item.id); setDraft(null); setError('') }}><td><button className="tc-open" onClick={() => { setSelectedId(item.id); setDraft(null); setError('') }}>{item.code}</button></td><td>{item.title}</td><td>{item.status === 'Completed' ? item.typeNameSnapshot || '—' : types.find(type => type.id === item.typeId)?.name || '—'}</td><td>{item.status}</td><td>{item.startedAt ? new Date(item.startedAt).toLocaleString() : '—'}</td><td>{item.completedAt ? new Date(item.completedAt).toLocaleString() : '—'}</td><td>{new Date(item.updatedAt).toLocaleString()}</td></tr>)}</tbody></table></div>
      {!audits.length && <p className="muted">Перевірок ще немає. Додайте Audit.</p>}
    </> : <>
      <AccountBackButton onClick={() => { setSelectedId(''); setDraft(null); setCheck(null); setConfirming(false); setError('') }}>← Audits</AccountBackButton>
      <div className="tc-toolbar"><h2>{selected.code} — {selected.title}</h2><span>{selected.status}</span>
        {!readOnly && !draft && <Button variant="outline" size="sm" onClick={() => setDraft({ ...selected })}>Edit Audit</Button>}
        {selected.status === 'Draft' && <Button disabled={!!draft || !!check} onClick={() => transition('start')}>Start Audit</Button>}
        {selected.status === 'In Progress' && <Button disabled={!!draft || !!check} onClick={() => setConfirming(true)}>Complete Audit</Button>}
      </div>
      <dl className="run-metadata">{[
        ['Type', readOnly ? selected.typeNameSnapshot : types.find(type => type.id === selected.typeId)?.name],
        ['Objective / Мета', selected.objective], ['Scope / Обсяг', selected.scope],
        ['Start date', selected.startDate], ['End date', selected.endDate],
        ['Started', selected.startedAt], ['Completed', selected.completedAt],
        ['Notes / Нотатки', selected.notes], ['Limitations / Обмеження', selected.limitations],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{value || '—'}</dd></div>)}</dl>
      {readOnly && <p className="muted">Завершений Audit: історичні дані доступні лише для читання.</p>}
      {confirming && <section role="alert"><p>Завершити Audit? Неперевірених критеріїв: {checks.filter(item => item.result === 'Not Checked').length}. Незбережені чернетки зауважень буде відкинуто. Після завершення зміни неможливі.</p><Button onClick={() => transition('complete')}>Підтвердити завершення Audit</Button><Button variant="ghost" onClick={() => setConfirming(false)}>Скасувати завершення</Button></section>}
      <section aria-label="Audit checks"><div className="tc-toolbar"><h2>Checks / Критерії перевірки</h2>{!readOnly && <AddEntityButton entity="audit check" onClick={() => setCheck({ id: crypto.randomUUID(), projectId, auditId: selected.id, criterion: '', result: 'Not Checked', comment: '' })} />}</div>
        <div className="tc-list"><table className="tc-table"><thead><tr><th>Criterion / Критерій</th><th>Result</th><th>Comment</th><th /></tr></thead><tbody>{checks.map(item => <tr key={item.id}><td>{item.criterion}</td><td>{item.result}</td><td>{item.comment || '—'}</td><td>{!readOnly && <Button size="sm" variant="ghost" onClick={() => setCheck({ ...item })} aria-label={'Edit check ' + item.criterion}>Edit</Button>}</td></tr>)}</tbody></table></div>
        {check && !readOnly && <form className="tc-section" aria-label="Audit check editor" onSubmit={event => { event.preventDefault(); const failure = onSaveCheck(check); setError(failure ?? ''); if (!failure) setCheck(null) }}>
          <label className="field">Criterion / Критерій<Textarea required value={check.criterion} onChange={event => setCheck({ ...check, criterion: event.target.value })} /></label>
          <label className="field">Result<select className="audit-select" value={check.result} onChange={event => setCheck({ ...check, result: event.target.value as AuditCheck['result'] })}>{['Not Checked', 'Pass', 'Fail', 'N/A'].map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="field">Comment<Textarea value={check.comment} onChange={event => setCheck({ ...check, comment: event.target.value })} /></label>
          <Button type="submit">Save Check</Button><Button type="button" variant="ghost" onClick={() => setCheck(null)}>Cancel Check</Button>
        </form>}
      </section>
      <AuditFindingsPage {...findingProps} typeInUse={id => data.audits.some(item => item.projectId === projectId && item.typeId === id)} key={selected.id + selected.status} auditId={selected.id} readOnly={readOnly} items={data.findings} onDeleteItem={id => onDeleteFinding(selected.id, id)} />
    </>}
    {draft && <aside className="audit-workspace audit-session-editor" aria-label="Audit editor"><h2>{draft.id ? 'Edit Audit' : 'New Audit'}</h2><form className="audit-workspace-form" onSubmit={event => { event.preventDefault(); const failure = onSaveAudit(draft); setError(failure ?? ''); if (!failure) setDraft(null) }}>
      {fields.map(([key, label]) => <label key={key} className="field">{label}{key === 'title' || key === 'startDate' || key === 'endDate' ? <Input required={key === 'title'} type={key === 'title' ? 'text' : 'date'} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <Textarea value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />}</label>)}
      <label className="field">Audit type<select className="audit-select" value={draft.typeId} onChange={event => setDraft({ ...draft, typeId: event.target.value })}><option value="">—</option>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
      <Button type="submit">Save Audit</Button><Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel Audit</Button>
    </form></aside>}
  </main>
}
