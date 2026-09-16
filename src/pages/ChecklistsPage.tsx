import { AddEntityButton } from '@/components/AddEntityButton'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DictionaryContext } from '@/components/audit/dictionaryContext'
import { AuditDictionarySelect } from '@/components/audit/AuditDictionarySelect'
import { ImportExportActions } from '@/components/import-export/ImportExportActions'
import { exportRows, validateChecklists } from '@/lib/importExport'
import { ChecklistRunPanel } from '@/components/checklists/ChecklistRunPanel'
import type { Checklist, ChecklistRun, ProjectArea } from '@/types'
import './ChecklistsPage.css'

type Props = {
  projectId: string; items: Checklist[]; runs: ChecklistRun[]; areas: ProjectArea[]
  onSave: (item: Checklist) => void; onRun: (run: ChecklistRun) => void
  onAreaSave: (name: string, id?: string) => string | Promise<string>; onAreaRemove: (id: string) => string | Promise<string>
}
export function ChecklistsPage({ projectId, items, runs, areas, onSave, onRun, onAreaSave, onAreaRemove }: Props) {
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<Checklist | null>(null)
  const [runId, setRunId] = useState('')
  const [tab, setTab] = useState<'Definition' | 'Runs'>('Definition')
  const [error, setError] = useState('')
  const definitions = items.filter(item => item.projectId === projectId)
  const projectAreas = areas.filter(area => area.projectId === projectId)
  const selected = definitions.find(item => item.id === selectedId)
  const active = draft ?? selected
  const history = runs.filter(run => run.projectId === projectId && run.checklistId === selectedId)
  const run = history.find(item => item.id === runId)
  function close() { setSelectedId(''); setDraft(null); setRunId(''); setError('') }
  function open(item: Checklist) { setSelectedId(item.id); setDraft(null); setRunId(''); setTab('Definition'); setError('') }
  function add() {
    const id = crypto.randomUUID(), now = new Date().toISOString()
    setDraft({ id, projectId, title: '', description: '', items: [{ id: crypto.randomUUID(), checklistId: id, text: '', order: 0 }], createdAt: now, updatedAt: now }); setSelectedId(''); setRunId(''); setError(''); setTab('Definition')
  }
  function save(event: React.FormEvent) {
    event.preventDefault()
    if (!draft) return
    if (!draft.title.trim()) { setError('Введіть назву checklist.'); return }
    if (!draft.items.length || draft.items.some(item => !item.text.trim())) { setError('Додайте щонайменше один заповнений пункт.'); return }
    if (draft.areaId && !projectAreas.some(area => area.id === draft.areaId)) { setError('Виберіть Area поточного проєкту.'); return }
    const saved = { ...draft, projectId, title: draft.title.trim(), items: draft.items.map((item, order) => ({ ...item, text: item.text.trim(), order })), updatedAt: new Date().toISOString() }
    onSave(saved); setSelectedId(saved.id); setDraft(null); setError('')
  }
  function move(index: number, direction: number) {
    if (!draft || index + direction < 0 || index + direction >= draft.items.length) return
    const items = [...draft.items]; [items[index], items[index + direction]] = [items[index + direction], items[index]]
    setDraft({ ...draft, items: items.map((item, order) => ({ ...item, order })) })
  }
  function startRun() {
    if (!selected) return
    const id = crypto.randomUUID()
    const next: ChecklistRun = { id, projectId, checklistId: selected.id, titleSnapshot: selected.title, startedAt: new Date().toISOString(), completedAt: null, status: 'In Progress', items: [...selected.items].sort((a, b) => a.order - b.order).map(item => ({ id: crypto.randomUUID(), runId: id, checklistItemId: item.id, textSnapshot: item.text, result: 'Not Run', comment: '' })) }
    onRun(next); setRunId(id)
  }
  const dictionary = { area: projectAreas, type: [], save: (_kind: 'area' | 'type', name: string, id?: string) => onAreaSave(name, id), remove: (_kind: 'area' | 'type', id: string) => draft?.areaId === id ? 'Area використовується у поточній чернетці.' : onAreaRemove(id) }
  return <DictionaryContext.Provider value={dictionary}><main className="smoke-app"><header className="page-heading"><h1>Checklists</h1></header>
    <div className={`tc-layout ${active || run ? 'tc-with-panel' : ''}`}><div className="tc-list"><div className="tc-toolbar"><ImportExportActions kind="checklists" validate={(rows, mapping) => validateChecklists(rows, mapping, { projectId, areas: projectAreas })} onImport={imported => imported.forEach(onSave)} exportRows={exportRows('checklists', { checklists: definitions, areas: projectAreas })} /><AddEntityButton entity="checklist" onClick={add} /></div>
      <table className="tc-table"><colgroup><col style={{ width: '16%' }} /><col /><col style={{ width: '17%' }} /><col style={{ width: '10%' }} /><col style={{ width: '20%' }} /></colgroup><thead><tr>{['ID', 'Title', 'Area', 'Items', 'Updated'].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{definitions.map(item => <tr key={item.id} className={selectedId === item.id ? 'tc-selected' : ''} onClick={() => open(item)}><td><button className="tc-open" aria-label={`Open ${item.title}`} title={item.id} onClick={() => open(item)}>{item.id.slice(0, 8)}</button></td><td>{item.title}</td><td>{projectAreas.find(area => area.id === item.areaId)?.name ?? '—'}</td><td>{item.items.length}</td><td>{new Date(item.updatedAt).toLocaleDateString()}</td></tr>)}</tbody>
      </table>{!definitions.length && <p className="muted">Checklists поки немає.</p>}
    </div>
    {run ? <ChecklistRunPanel run={run} onChange={onRun} onClose={() => { setRunId(''); setTab('Runs') }} /> : active && <aside className="tc-panel" aria-label="Checklist panel"><div className="panel-heading"><h2>{draft ? selected ? 'Edit Checklist' : 'New Checklist' : active.title}</h2><Button variant="ghost" onClick={close}>Close checklist</Button></div>
      {!draft && <div className="tc-toolbar">{(['Definition', 'Runs'] as const).map(value => <Button key={value} variant={tab === value ? 'secondary' : 'ghost'} onClick={() => setTab(value)}>{value}</Button>)}<Button variant="outline" onClick={startRun}>Run Checklist</Button></div>}
      {!draft && tab === 'Runs' ? <section aria-label="Run history"><table className="tc-table"><thead><tr>{['Run', 'Date', 'Status', 'Pass', 'Fail', 'Blocked'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{history.map((entry, index) => <tr key={entry.id} onClick={() => setRunId(entry.id)}><td><button className="tc-open" onClick={() => setRunId(entry.id)}>Run {index + 1}</button></td><td>{new Date(entry.startedAt).toLocaleString()}</td><td>{entry.status}</td>{(['Pass', 'Fail', 'Blocked'] as const).map(result => <td key={result}>{entry.items.filter(item => item.result === result).length}</td>)}</tr>)}</tbody></table>{!history.length && <p>Проходжень поки немає.</p>}</section> : <form className="tc-form" onSubmit={save}>
        {!draft && <Button type="button" variant="outline" onClick={() => setDraft(structuredClone(active))}>Edit Checklist</Button>}
        <div className="field"><label htmlFor="checklist-title">Title</label>{draft ? <Input id="checklist-title" required value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /> : <p>{active.title}</p>}</div>
        {draft ? <AuditDictionarySelect id="checklist-area" kind="area" value={draft.areaId ?? ''} onChange={areaId => setDraft({ ...draft, areaId: areaId || undefined })} /> : <div><span>Area</span><p>{projectAreas.find(area => area.id === active.areaId)?.name ?? '—'}</p></div>}
        <div className="field"><label htmlFor="checklist-description">Description</label>{draft ? <Textarea id="checklist-description" rows={3} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /> : <p>{active.description || '—'}</p>}</div>
        <section className="tc-section"><h3>Items</h3>{active.items.map((item, index) => <div className="tc-step" key={item.id}>{draft ? <><label htmlFor={`checklist-item-${item.id}`}>Item {index + 1}</label><Textarea id={`checklist-item-${item.id}`} rows={2} value={item.text} onChange={event => setDraft({ ...draft, items: draft.items.map(value => value.id === item.id ? { ...value, text: event.target.value } : value) })} /><div className="tc-order"><Button type="button" variant="ghost" size="sm" disabled={index === 0} aria-label={`Move item ${index + 1} up`} onClick={() => move(index, -1)}>↑</Button><Button type="button" variant="ghost" size="sm" disabled={index === draft.items.length - 1} aria-label={`Move item ${index + 1} down`} onClick={() => move(index, 1)}>↓</Button><Button type="button" variant="ghost" size="sm" aria-label={`Delete item ${index + 1}`} onClick={() => setDraft({ ...draft, items: draft.items.filter(value => value.id !== item.id) })}>Delete</Button></div></> : <p>{index + 1}. {item.text}</p>}</div>)}
          {draft && <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, items: [...draft.items, { id: crypto.randomUUID(), checklistId: draft.id, text: '', order: draft.items.length }] })}>Add item</Button>}
        </section>
        {error && <p role="alert" className="form-error">{error}</p>}{draft && <div className="tc-panel-actions"><Button type="submit">Save Checklist</Button><Button type="button" variant="outline" onClick={() => { setDraft(null); setError('') }}>Cancel</Button></div>}
      </form>}
    </aside>}
    </div>
  </main></DictionaryContext.Provider>
}
