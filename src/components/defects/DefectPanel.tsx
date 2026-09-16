import { OwnerEvidence } from '@/components/evidence/OwnerEvidence'
import type { ReactNode } from 'react'
import { ProjectContextFields } from '@/components/project-setup/ProjectContextFields'
import { emptyProjectSetup } from '@/lib/projectSetup'
import type { ProjectSetupState } from '@/types'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { defectSeverities, defectPriorities, defectStatuses, safeExternalUrl } from '@/lib/defects'
import type { Defect, ProjectArea } from '@/types'
export function DefectPanel({ retestSection, setup = emptyProjectSetup, item, editing, error, areas, sourceSection, onChange, onSave, onEdit, onCancel, onClose }: { retestSection?: ReactNode; setup?: ProjectSetupState; item: Defect; editing: boolean; error: string; areas: ProjectArea[]; sourceSection?: ReactNode; onChange: (item: Defect) => void; onSave: () => void; onEdit: () => void; onCancel: () => void; onClose: () => void }) {
  return <aside className="tc-panel" aria-label="Defect panel"><div className="panel-heading"><div><p className="test-id">{item.code}</p><h2>{editing ? 'Defect' : item.title}</h2></div><Button variant="ghost" size="icon" aria-label="Close defect" title="Close defect" onClick={onClose}><X /></Button></div>
    <form className="tc-form" onSubmit={event => { event.preventDefault(); onSave() }}>
      {!editing && <Button type="button" variant="outline" onClick={onEdit}>Edit Defect</Button>}
      <div className="field"><label htmlFor="defect-title">Title</label>{editing ? <Input id="defect-title" required value={item.title} onChange={event => onChange({ ...item, title: event.target.value })} /> : <p>{item.title}</p>}</div>
      {([['description', 'Description'], ['stepsToReproduce', 'Steps to reproduce / Кроки відтворення'], ['expectedResult', 'Expected result / Очікуваний результат'], ['actualResult', 'Actual result / Фактичний результат']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`defect-${key}`}>{label}</label>{editing ? <Textarea id={`defect-${key}`} rows={3} value={item[key]} onChange={event => onChange({ ...item, [key]: event.target.value })} /> : <p>{item[key] || '—'}</p>}</div>)}
      <div className="tc-field-pair">{([['severity', 'Severity', defectSeverities], ['priority', 'Priority', defectPriorities], ['status', 'Status', defectStatuses]] as const).map(([key, label, values]) => <div className="field" key={key}><label htmlFor={`defect-${key}`}>{label}</label>{editing ? <select id={`defect-${key}`} className="audit-select" value={item[key]} onChange={event => onChange({ ...item, [key]: event.target.value })}>{values.map(value => <option key={value}>{value}</option>)}</select> : <p>{item[key]}</p>}</div>)}
        <div className="field"><label htmlFor="defect-area">Area</label>{editing ? <select id="defect-area" className="audit-select" value={item.areaId ?? ''} onChange={event => onChange({ ...item, areaId: event.target.value || undefined })}><option value="">—</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select> : <p>{areas.find(area => area.id === item.areaId)?.name || '—'}</p>}</div>
        {editing ? <ProjectContextFields projectId={item.projectId} setup={setup} value={item} onChange={value => onChange({ ...item, ...value })} /> : <><div className="field"><label>Environment / Середовище</label><p>{item.environmentNameSnapshot || '—'}</p></div><div className="field"><label>Build / Збірка</label><p>{item.buildVersionSnapshot || '—'}</p></div></>}
        {([['browser', 'Browser'], ['deviceOrOs', 'Device / OS']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`defect-${key}`}>{label}</label>{editing ? <Input id={`defect-${key}`} value={item[key]} onChange={event => onChange({ ...item, [key]: event.target.value })} /> : <p>{item[key] || '—'}</p>}</div>)}
      </div>
      <div className="field"><label htmlFor="defect-evidence">Evidence / Notes</label>{editing ? <Textarea id="defect-evidence" rows={3} value={item.evidenceNote} onChange={event => onChange({ ...item, evidenceNote: event.target.value })} /> : <p>{item.evidenceNote || '—'}</p>}</div>
      <div className="field"><label htmlFor="defect-external">External task URL</label>{editing ? <Input id="defect-external" type="url" value={item.externalTaskUrl ?? ''} onChange={event => onChange({ ...item, externalTaskUrl: event.target.value })} /> : safeExternalUrl(item.externalTaskUrl) ? <a href={safeExternalUrl(item.externalTaskUrl)} target="_blank" rel="noopener noreferrer">Open external task</a> : <p>—</p>}</div>
      {sourceSection}
      {!editing && <p>Created by: {item.createdByUserId ?? '—'}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      {editing && <div className="tc-panel-actions"><Button type="submit">Save Defect</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>}
    </form>
    {!editing && <OwnerEvidence key={item.id} owner={{ projectId: item.projectId, ownerType: 'defect', ownerId: item.id }} />}
    {!editing && retestSection}
  </aside>
}
