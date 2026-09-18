import { RichText } from '@/components/rich-text/RichText'
import { richTextPlain } from '@/lib/richText'
import { EntityLinkPicker } from '@/components/coverage/EntityLinkPicker'
import { useContext, useState } from 'react'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/rich-text/RichTextEditor'
import { AuditDictionarySelect as DictionarySelect } from '@/components/audit/AuditDictionarySelect'
import { DictionaryContext } from '@/components/audit/dictionaryContext'
import type { Requirement, TestCase } from '@/types'
import { moveItem, priorities, statuses } from './testCaseOptions'

function OrderButtons({ index, count, label, onMove, onDelete }: { index: number; count: number; label: string; onMove: (direction: number) => void; onDelete: () => void }) {
  return <div className="tc-order">
    <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} aria-label={`Move ${label} up`} title="Move up" onClick={() => onMove(-1)}><ArrowUp /></Button>
    <Button type="button" variant="ghost" size="icon-sm" disabled={index === count - 1} aria-label={`Move ${label} down`} title="Move down" onClick={() => onMove(1)}><ArrowDown /></Button>
    <Button type="button" variant="ghost" size="icon-sm" className="table-delete-button" aria-label={`Delete ${label}`} title="Delete" onClick={onDelete}><X /></Button>
  </div>
}
function Conditions({ label, values, editing, onChange }: { label: string; values: string[]; editing: boolean; onChange: (values: string[]) => void }) {
  return <section className="tc-section">
    <h3>{label}</h3>
    {editing ? <>
      {values.map((value, index) => <div key={index} className="tc-condition">
        <div className="tc-item-heading"><h4>Item {index + 1}</h4><OrderButtons index={index} count={values.length} label={`${label} item ${index + 1}`} onMove={direction => onChange(moveItem(values, index, direction))} onDelete={() => onChange(values.filter((_, position) => position !== index))} /></div>
        <Textarea aria-label={`${label} ${index + 1}`} rows={2} value={richTextPlain(value)} onChange={event => onChange(values.map((entry, position) => position === index ? event.target.value : entry))} />
      </div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...values, ''])}>Add item</Button>
    </> : values.length ? <ol>{values.map((value, index) => <li key={index}><RichText value={value} /></li>)}</ol> : <p className="muted">—</p>}
  </section>
}

type Props = {
  allRequirements?: Requirement[]; onRequirementsChange?: (ids: string[]) => void;
  requirements: Requirement[]; item: TestCase; mode: 'view' | 'create' | 'edit'; error: string
  onChange: (item: TestCase) => void; onSave: () => void; onEdit: () => void; onCancel: () => void; onClose: () => void
}
export function TestCasePanel({ allRequirements = [], onRequirementsChange, requirements, item, mode, error, onChange, onSave, onEdit, onCancel, onClose }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const dictionary = useContext(DictionaryContext)
  const editing = mode !== 'view'
  const patch = (value: Partial<TestCase>) => onChange({ ...item, ...value })
  const steps = [...item.steps].sort((a, b) => a.sortOrder - b.sortOrder)
  return <aside className="tc-panel" aria-label="Test case panel">
    <div className="panel-heading"><div><p className="test-id">{item.code}</p><h2>{mode === 'create' ? 'Add test case' : item.title}</h2></div><div className="tc-panel-actions">{!editing && <Button type="button" variant="outline" size="sm" onClick={onEdit}>Edit test case</Button>}<Button type="button" variant="ghost" size="icon" aria-label="Close test case panel" onClick={onClose}><X /></Button></div></div>
    <form className="tc-form" onSubmit={event => { event.preventDefault(); onSave() }}>
      {editing ? <>
        <div className="field"><label id="tc-code-label" htmlFor="tc-code">ID/code</label><Input id="tc-code" value={item.code} onChange={event => patch({ code: event.target.value })} /></div>
        <div className="field"><label id="tc-title-label" htmlFor="tc-title">Title</label><Input id="tc-title" value={item.title} onChange={event => patch({ title: event.target.value })} /></div>
        <div className="tc-field-pair">
          <DictionarySelect id="tc-area" kind="area" value={item.areaId ?? ''} onChange={areaId => patch({ areaId: areaId || undefined })} />
          <div className="field"><label id="tc-priority-label" htmlFor="tc-priority">Priority</label><select id="tc-priority" className="audit-select" value={item.priority} onChange={event => patch({ priority: event.target.value as TestCase['priority'] })}>{priorities.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <DictionarySelect id="tc-type" kind="type" value={item.typeId ?? ''} onChange={typeId => patch({ typeId: typeId || undefined })} />
          <div className="field"><label id="tc-status-label" htmlFor="tc-status">Status</label><select id="tc-status" className="audit-select" value={item.status} onChange={event => patch({ status: event.target.value as TestCase['status'] })}>{statuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        </div>
      </> : <dl className="tc-field-pair">
        <div><dt>Area</dt><dd>{dictionary.area.find(value => value.id === item.areaId)?.name || '—'}</dd></div>
        <div><dt>Priority</dt><dd>{priorities.find(value => value.value === item.priority)?.label}</dd></div>
        <div><dt>Type</dt><dd>{dictionary.type.find(value => value.id === item.typeId)?.name || '—'}</dd></div>
        <div><dt>Status</dt><dd>{statuses.find(value => value.value === item.status)?.label}</dd></div>
      </dl>}
      <Conditions label="Preconditions / Передумови" values={item.preconditions} editing={editing} onChange={preconditions => patch({ preconditions })} />
      <section className="tc-section" aria-label="Steps"><h3>Steps</h3>
        {steps.map((step, index) => <div key={step.id} className="tc-step">
          <div className="tc-item-heading"><h4>Step {index + 1}</h4>{editing && <OrderButtons index={index} count={steps.length} label={`step ${index + 1}`} onMove={direction => patch({ steps: moveItem(steps, index, direction).map((entry, sortOrder) => ({ ...entry, sortOrder })) })} onDelete={() => patch({ steps: steps.filter(entry => entry.id !== step.id).map((entry, sortOrder) => ({ ...entry, sortOrder })) })} />}</div>
          {editing ? <>
            <div className="field"><label id={`action-${step.id}-label`} htmlFor={`action-${step.id}`}>Action</label><Textarea id={`action-${step.id}`} rows={2} value={richTextPlain(step.action)} onChange={event => patch({ steps: steps.map(entry => entry.id === step.id ? { ...entry, action: event.target.value } : entry) })} /></div>
            <div className="field"><label id={`expected-${step.id}-label`} htmlFor={`expected-${step.id}`}>Expected / Очікуваний результат</label><Textarea id={`expected-${step.id}`} rows={2} value={richTextPlain(step.expectedResult)} onChange={event => patch({ steps: steps.map(entry => entry.id === step.id ? { ...entry, expectedResult: event.target.value } : entry) })} /></div>
          </> : <><h5>Action</h5><RichText value={step.action} /><h5>Expected / Очікуваний результат</h5><RichText value={step.expectedResult} /></>}
        </div>)}
        {editing ? <Button type="button" variant="outline" size="sm" onClick={() => patch({ steps: [...steps, { id: crypto.randomUUID(), action: '', expectedResult: '', sortOrder: steps.length }] })}>+ Add step</Button> : !steps.length && <p className="muted">—</p>}
      </section>
      <Conditions label="Postconditions" values={item.postconditions ?? []} editing={editing} onChange={postconditions => patch({ postconditions })} />
      <div className="field"><label id="tc-notes-label" htmlFor="tc-notes">Notes</label>{editing ? <RichTextEditor id="tc-notes" rows={3} value={item.notes ?? ''} onValueChange={value => patch({ notes: value })} /> : <RichText value={item.notes || '—'} />}</div>
      {!editing && <section className="tc-section" aria-label="Requirements"><h3>Requirements</h3>
        {requirements.length ? <ul>{requirements.map(requirement => <li key={requirement.id}><span className="test-id">{requirement.code}</span> {requirement.title}</li>)}</ul> : <p className="muted">No linked requirements.</p>}
        {onRequirementsChange && <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>Manage Requirements</Button>}
      </section>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {editing && <div className="tc-panel-actions"><Button type="submit">Save test case</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>}
    </form>
    {pickerOpen && <EntityLinkPicker kind="requirements" testCases={allRequirements.filter(value => value.projectId === item.projectId).map(value => ({ ...value, area: dictionary.area.find(area => area.id === value.areaId)?.name }))} selectedIds={requirements.map(value => value.id)} onClose={() => setPickerOpen(false)} onApply={ids => { onRequirementsChange?.(ids); setPickerOpen(false) }} />}
  </aside>
}
