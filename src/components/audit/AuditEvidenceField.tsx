import { evidenceFileType } from '@/lib/auditEvidenceUrls'
import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/rich-text/RichTextEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { AuditEvidence } from '@/types'

type Props = {
  evidence: AuditEvidence[]
  note: string
  onChange: (files: AuditEvidence[]) => void
  onNoteChange: (note: string) => void
  createUrl: (file: File) => string
}
export function AuditEvidenceField({ evidence, note, onChange, onNoteChange, createUrl }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [previewId, setPreviewId] = useState('')
  const preview = evidence.find(file => file.id === previewId)
  function add(files: File[]) {
    const accepted: AuditEvidence[] = []
    const rejected: string[] = []
    for (const file of files) {
      const type = evidenceFileType(file)
      if (!type) { rejected.push(file.name); continue }
      accepted.push({ id: crypto.randomUUID(), type, name: file.name, url: createUrl(file) })
    }
    if (accepted.length) onChange([...evidence, ...accepted])
    setError(rejected.length ? `Формат не підтримується браузером: ${rejected.join(', ')}. Використовуйте PNG, JPG, WEBP, MP4 або WebM; MOV — за підтримки браузером.` : '')
  }
  return <section className="field audit-evidence" aria-label="Evidence / Докази">
    <h3>Evidence / Докази</h3>
    <div className="audit-evidence-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); add(Array.from(event.dataTransfer.files)) }}>
      <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}><Plus />Add file</Button>
      <span className="muted">або перетягніть файли</span>
      <input ref={input} type="file" aria-label="Evidence files" hidden multiple accept=".png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" onChange={event => { add(Array.from(event.target.files ?? [])); event.target.value = '' }} />
    </div>
    {error && <p role="alert" className="form-error">{error}</p>}
    {evidence.length > 0 && <ul className="audit-evidence-list">{evidence.map(file => <li key={file.id}>
      {file.type === 'image'
        ? <button type="button" className="audit-evidence-thumbnail" aria-label={`Preview ${file.name}`} onClick={() => setPreviewId(file.id)}><img src={file.url} alt={file.name} /></button>
        : <video src={file.url} controls preload="metadata" aria-label={file.name} />}
      <span className="audit-evidence-name" title={file.name}>{file.name}</span>
      <Button type="button" variant="ghost" size="icon" aria-label={`Видалити файл ${file.name}`} onClick={() => onChange(evidence.filter(item => item.id !== file.id))}><X /></Button>
    </li>)}</ul>}
    <label id="audit-evidence-note-label" htmlFor="audit-evidence-note">Note</label>
    <RichTextEditor id="audit-evidence-note" rows={2} value={note} onValueChange={value => onNoteChange(value)} />
    <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreviewId('') }}>
      <DialogContent className="audit-evidence-preview"><DialogHeader><DialogTitle>{preview?.name}</DialogTitle><DialogDescription>Evidence / Докази</DialogDescription></DialogHeader>
        {preview && <img src={preview.url} alt={preview.name} />}
      </DialogContent>
    </Dialog>
  </section>
}
