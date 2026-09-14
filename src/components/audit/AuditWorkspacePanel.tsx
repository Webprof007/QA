import { AuditEvidenceField } from './AuditEvidenceField'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/rich-text/RichTextEditor'
import { AuditMetadataFields } from './AuditMetadataFields'
import type { AuditItem } from '@/types'

type Props = { createEvidenceUrl: (file: File) => string; item: AuditItem; creating?: boolean; notice: string; error?: string; onChange: (item: AuditItem) => void; onSave: () => void; onClose: () => void }

export function AuditWorkspacePanel({ createEvidenceUrl, item, creating = false, notice, error, onChange, onSave, onClose }: Props) {
  const update = (patch: Partial<AuditItem>) => onChange({ ...item, ...patch })
  return <aside className="audit-workspace" aria-labelledby="audit-workspace-title">
    <div className="panel-heading"><div><p className="test-id">{creating ? 'Новий запис' : item.id}</p><h2 id="audit-workspace-title">{creating ? 'Додати зауваження' : item.title || 'Без назви'}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрити панель Audit"><X /></Button></div>
    <form className="audit-workspace-form" onSubmit={event => { event.preventDefault(); onSave() }}>
      <div className="field"><label id="audit-panel-title-label" htmlFor="audit-panel-title">Назва</label><Input id="audit-panel-title" required value={item.title} onChange={event => update({ title: event.target.value })} /></div>
      <div className="field"><label id="audit-panel-description-label" htmlFor="audit-panel-description">Що виявлено</label><RichTextEditor id="audit-panel-description" rows={3} value={item.description} onValueChange={value => update({ description: value })} placeholder="Опис виявленої проблеми" /></div>
      <div className="field"><label id="audit-panel-location-label" htmlFor="audit-panel-location">Location / де виявлено</label><Input id="audit-panel-location" value={item.location} onChange={event => update({ location: event.target.value })} /></div>
      <div className="field"><label id="audit-panel-expected-label" htmlFor="audit-panel-expected">Expected / Очікуваний результат</label><RichTextEditor id="audit-panel-expected" rows={3} value={item.expected} onValueChange={value => update({ expected: value })} /></div>
      <div className="field"><label id="audit-panel-actual-label" htmlFor="audit-panel-actual">Actual / Фактичний результат</label><RichTextEditor id="audit-panel-actual" rows={3} value={item.actual} onValueChange={value => update({ actual: value })} /></div>
      <AuditEvidenceField key={item.id} evidence={item.evidence} note={item.evidenceNote ?? ''} createUrl={createEvidenceUrl} onChange={evidence => onChange({ ...item, evidence })} onNoteChange={evidenceNote => onChange({ ...item, evidenceNote })} />
      <AuditMetadataFields item={item} onChange={onChange} prefix="audit-panel" />
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit">{creating ? 'Створити зауваження' : 'Зберегти зміни'}</Button>
    </form>
    <p className="save-notice" role="status">{notice}</p>
  </aside>
}
