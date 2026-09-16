import { SourceDefects } from '@/components/defects/SourceDefects'
import { EvidenceSection } from '@/components/evidence/EvidenceSection'
import { useEvidenceDraft } from '@/components/evidence/useEvidenceDraft'
import { useEvidenceContext } from '@/components/evidence/evidenceContext'
import { ownerEvidence } from '@/lib/evidence'
import type { EvidenceDraft, EvidenceOwner } from '@/types'
import { RichText } from '@/components/rich-text/RichText'
import { OwnerEvidence } from '@/components/evidence/OwnerEvidence'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/rich-text/RichTextEditor'
import { AuditMetadataFields } from './AuditMetadataFields'
import type { AuditFinding } from '@/types'

type Props = { followupDisabled?: boolean; readOnly?: boolean; item: AuditFinding; creating?: boolean; notice: string; error?: string; onChange: (item: AuditFinding) => void; onSave: (attachments: EvidenceDraft[]) => void; onClose: () => void }

export function AuditWorkspacePanel({ followupDisabled, readOnly, item, creating = false, notice, error, onChange, onSave, onClose }: Props) {
  const evidence = useEvidenceContext()
  const owner: EvidenceOwner = { projectId: item.projectId, ownerType: 'auditFinding', ownerId: item.id }
  const attachments = useEvidenceDraft(owner, ownerEvidence(evidence.items, owner, evidence.owners))
  const savedAttachments = ownerEvidence(evidence.items, owner, evidence.owners)
  const attachmentsChanged = attachments.items.length !== savedAttachments.length || attachments.items.some(item => !savedAttachments.some(saved => saved.id === item.id))
  const update = (patch: Partial<AuditFinding>) => onChange({ ...item, ...patch })
  return <aside className="audit-workspace" aria-labelledby="audit-workspace-title">
    <div className="panel-heading"><div><p className="test-id">{creating ? 'Новий запис' : item.code}</p><h2 id="audit-workspace-title">{creating ? 'Додати зауваження' : item.title || 'Без назви'}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрити панель Audit"><X /></Button></div>
    {readOnly ? <div className="audit-workspace-form">
      <p>Area: {item.areaNameSnapshot || '—'} · Type: {item.typeNameSnapshot || '—'}</p>
      <p>Severity: {item.severity} · Status: {item.status} · Date: {item.discoveredAt}</p>
      {([['description', 'Що виявлено'], ['location', 'Location / де виявлено'], ['expected', 'Expected / Очікуваний результат'], ['actual', 'Actual / Фактичний результат'], ['evidenceNote', 'Evidence note'], ['comment', 'Comment']] as const).map(([key, label]) => <section key={key}><h3>{label}</h3><RichText value={item[key] || '—'} /></section>)}
      {/^(https?):\/\//i.test(item.taskUrl) && <a href={item.taskUrl} target="_blank" rel="noopener noreferrer">Open task</a>}
      <OwnerEvidence owner={owner} />
    </div> : <form className="audit-workspace-form" onSubmit={event => { event.preventDefault(); onSave(attachments.items) }}>
      <div className="field"><label id="audit-panel-title-label" htmlFor="audit-panel-title">Назва</label><Input id="audit-panel-title" required value={item.title} onChange={event => update({ title: event.target.value })} /></div>
      <div className="field"><label id="audit-panel-description-label" htmlFor="audit-panel-description">Що виявлено</label><RichTextEditor id="audit-panel-description" rows={3} value={item.description} onValueChange={value => update({ description: value })} placeholder="Опис виявленої проблеми" /></div>
      <div className="field"><label id="audit-panel-location-label" htmlFor="audit-panel-location">Location / де виявлено</label><Input id="audit-panel-location" value={item.location} onChange={event => update({ location: event.target.value })} /></div>
      <div className="field"><label id="audit-panel-expected-label" htmlFor="audit-panel-expected">Expected / Очікуваний результат</label><RichTextEditor id="audit-panel-expected" rows={3} value={item.expected} onValueChange={value => update({ expected: value })} /></div>
      <div className="field"><label id="audit-panel-actual-label" htmlFor="audit-panel-actual">Actual / Фактичний результат</label><RichTextEditor id="audit-panel-actual" rows={3} value={item.actual} onValueChange={value => update({ actual: value })} /></div>
      <EvidenceSection {...attachments.sectionProps} />
      <div className="field"><label htmlFor="audit-evidence-note">Evidence note</label><RichTextEditor id="audit-evidence-note" aria-label="Evidence note" rows={2} value={item.evidenceNote ?? ''} onValueChange={evidenceNote => update({ evidenceNote })} /></div>
      <AuditMetadataFields item={item} onChange={onChange} prefix="audit-panel" />
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit">{creating ? 'Створити зауваження' : 'Зберегти зміни'}</Button>
    </form>}
    {!creating && <SourceDefects projectId={item.projectId} source={{ type: "auditFinding", id: item.id }} disabled={followupDisabled || attachmentsChanged} />}
    <p className="save-notice" role="status">{notice}</p>
  </aside>
}
