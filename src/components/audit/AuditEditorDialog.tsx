import { AuditEvidenceField } from './AuditEvidenceField'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/rich-text/RichTextEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AuditMetadataFields } from './AuditMetadataFields'
import type { AuditItem } from '@/types'

type Props = { createEvidenceUrl: (file: File) => string; initialItem: AuditItem; creating: boolean; onSave: (item: AuditItem) => void; onClose: () => void }

export function AuditEditorDialog({ createEvidenceUrl, initialItem, creating, onSave, onClose }: Props) {
  const [item, setItem] = useState(initialItem)
  const [error, setError] = useState('')

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!item.title.trim()) { setError('Введіть назву зауваження.'); return }
    onSave({ ...item, title: item.title.trim(), area: item.area.trim() })
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent className="editor-dialog audit-editor">
      <DialogHeader><DialogTitle>{creating ? 'Додати зауваження' : `Змінити ${item.id}`}</DialogTitle><DialogDescription>Опишіть знайдену проблему та вкажіть її розташування.</DialogDescription></DialogHeader>
      <form className="test-editor-form" onSubmit={save}>
        <p className="test-id">{item.id}</p>
        <div className="field"><label id="audit-title-label" htmlFor="audit-title">Назва зауваження</label><Input id="audit-title" required value={item.title} onChange={event => setItem({ ...item, title: event.target.value })} /></div>
        <div className="field"><label id="audit-description-label" htmlFor="audit-description">Що виявлено</label><RichTextEditor id="audit-description" value={item.description} onValueChange={value => setItem({ ...item, description: value })} /></div>
        <div className="field"><label id="audit-location-label" htmlFor="audit-location">Location / де виявлено</label><Input id="audit-location" value={item.location} onChange={event => setItem({ ...item, location: event.target.value })} /></div>
        <div className="field"><label id="audit-expected-label" htmlFor="audit-expected">Expected / Очікуваний результат</label><RichTextEditor id="audit-expected" value={item.expected} onValueChange={value => setItem({ ...item, expected: value })} /></div>
        <div className="field"><label id="audit-actual-label" htmlFor="audit-actual">Actual / Фактичний результат</label><RichTextEditor id="audit-actual" value={item.actual} onValueChange={value => setItem({ ...item, actual: value })} /></div>
      <AuditEvidenceField key={item.id} evidence={item.evidence} note={item.evidenceNote ?? ''} createUrl={createEvidenceUrl} onChange={evidence => setItem({ ...item, evidence })} onNoteChange={evidenceNote => setItem({ ...item, evidenceNote })} />
        <AuditMetadataFields item={item} onChange={setItem} prefix="audit-editor" />
        {error && <p role="alert" className="form-error">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Скасувати</Button><Button type="submit">Зберегти зауваження</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
