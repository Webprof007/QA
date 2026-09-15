import { RichText } from '@/components/rich-text/RichText'
import { useContext, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/rich-text/RichTextEditor'
import { TestCaseLinkPicker } from './TestCaseLinkPicker'
import { AuditDictionarySelect as DictionarySelect } from '@/components/audit/AuditDictionarySelect'
import { DictionaryContext } from '@/components/audit/dictionaryContext'
import type { RequirementWithTestCases as Requirement, TestCase } from '@/types'
import { priorities } from '@/components/test-cases/testCaseOptions'
import { requirementStatuses } from './requirementOptions'

type Props = {
  onLinkTestCases?: (ids: string[]) => void;
  item: Requirement; testCases: TestCase[]; mode: 'view' | 'create' | 'edit'; error: string
  onChange: (item: Requirement) => void; onSave: () => void; onEdit: () => void; onCancel: () => void; onClose: () => void
}
export function RequirementPanel({ onLinkTestCases, item, testCases, mode, error, onChange, onSave, onEdit, onCancel, onClose }: Props) {
  const dictionary = useContext(DictionaryContext)
  const [pickerOpen, setPickerOpen] = useState(false)
  const editing = mode !== 'view'
  const patch = (value: Partial<Requirement>) => onChange({ ...item, ...value })
  const available = testCases.filter(test => test.projectId === item.projectId)
  const linked = available.filter(test => item.testCaseIds.includes(test.id))
  return <aside className="tc-panel" aria-label="Requirement panel">
    <div className="panel-heading"><div><p className="test-id">{item.code}</p><h2>{mode === 'create' ? 'Add requirement' : item.title}</h2></div><div className="tc-panel-actions">
      {!editing && <Button type="button" variant="outline" size="sm" onClick={onEdit}>Edit requirement</Button>}
      <Button type="button" variant="ghost" size="icon" aria-label="Close requirement panel" onClick={onClose}><X /></Button>
    </div></div>
    <form className="tc-form" onSubmit={event => { event.preventDefault(); onSave() }}>
      {editing ? <>
        <div className="field"><label id="req-code-label" htmlFor="req-code">Code</label><Input id="req-code" value={item.code} onChange={event => patch({ code: event.target.value })} /></div>
        <div className="field"><label id="req-title-label" htmlFor="req-title">Title</label><Input id="req-title" value={item.title} onChange={event => patch({ title: event.target.value })} /></div>
        <div className="tc-field-pair">
          <DictionarySelect id="req-area" kind="area" value={item.areaId ?? ''} onChange={areaId => patch({ areaId: areaId || undefined })} />
          <div className="field"><label id="req-status-label" htmlFor="req-status">Status</label><select id="req-status" className="audit-select" value={item.status} onChange={event => patch({ status: event.target.value as Requirement['status'] })}>{requirementStatuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="req-priority">Priority</label><select id="req-priority" className="audit-select" value={item.priority ?? ''} onChange={event => patch({ priority: event.target.value as Requirement['priority'] || undefined })}><option value="">—</option>{priorities.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
      </> : <dl className="tc-field-pair"><div><dt>Priority</dt><dd>{priorities.find(value => value.value === item.priority)?.label || '—'}</dd></div><div><dt>Area</dt><dd>{dictionary.area.find(area => area.id === item.areaId)?.name || '—'}</dd></div><div><dt>Status</dt><dd>{requirementStatuses.find(option => option.value === item.status)?.label}</dd></div></dl>}
      <div className="field"><label id="req-description-label" htmlFor="req-description">Description</label>{editing ? <RichTextEditor id="req-description" rows={4} value={item.description} onValueChange={value => patch({ description: value })} /> : <RichText value={item.description || '—'} />}</div>
      <div className="field"><label id="req-source-label" htmlFor="req-source">Source</label>{editing ? <Input id="req-source" value={item.source ?? ''} onChange={event => patch({ source: event.target.value })} /> : <p>{item.source || '—'}</p>}</div>
      <section className="tc-section" aria-label="Linked Test Cases"><h3>{editing ? 'Linked Test Cases' : 'Test Coverage'}</h3>
        {linked.length ? <ul className="req-linked-list" aria-label="Selected test cases">{linked.map(test => <li key={test.id}><span><span className="test-id">{test.code}</span> {test.title}</span>{(editing || onLinkTestCases) && <Button type="button" variant="ghost" size="icon" aria-label={`Unlink ${test.code}`} onClick={() => { const ids = item.testCaseIds.filter(id => id !== test.id); if (editing) patch({ testCaseIds: ids }); else onLinkTestCases?.(ids) }}><X /></Button>}</li>)}</ul> : <p className="muted">No linked test cases.</p>}
        {(editing || onLinkTestCases) && <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>{editing ? 'Manage linked test cases' : 'Link Test Cases'}</Button>}

      </section>
      <div className="field"><label id="req-notes-label" htmlFor="req-notes">Notes</label>{editing ? <RichTextEditor id="req-notes" rows={3} value={item.notes ?? ''} onValueChange={value => patch({ notes: value })} /> : <RichText value={item.notes || '—'} />}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {editing && <div className="tc-panel-actions"><Button type="submit">Save requirement</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>}
    </form>
    {pickerOpen && <TestCaseLinkPicker areas={dictionary.area} types={dictionary.type} testCases={available} selectedIds={item.testCaseIds} onApply={testCaseIds => { if (editing) patch({ testCaseIds }); else onLinkTestCases?.(testCaseIds); setPickerOpen(false) }} onClose={() => setPickerOpen(false)} />}
  </aside>
}
