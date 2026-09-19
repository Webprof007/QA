import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { safeEvidenceUrl } from '@/lib/evidence'
import { imageFileFromClipboard, prepareEvidenceImage } from '@/lib/evidenceImages'
import { ApiError } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { EvidenceItem, EvidenceOwner } from '@/types'
import './EvidenceSection.css'
type Props = EvidenceOwner & { items: EvidenceItem[]; readOnly?: boolean; temporary?: boolean; onAddFile?: (file: File) => void | Promise<void>; onAddLink?: (name: string, url: string) => void | Promise<void>; onRemove?: (id: string) => void | Promise<void> }
let activePasteTarget = ''
export function EvidenceSection({ projectId, ownerType, ownerId, items, readOnly = false, temporary = false, onAddFile, onAddLink, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null), prefix = useId(), pasteTarget = `${projectId}:${ownerType}:${ownerId}:${prefix}`
  const [linking, setLinking] = useState(false), [name, setName] = useState(''), [url, setUrl] = useState(''), [error, setError] = useState(''), [pending, setPending] = useState(false), [preview, setPreview] = useState<EvidenceItem | null>(null)
  const visible = items.filter(item => item.projectId === projectId && item.ownerType === ownerType && item.ownerId === ownerId)
  const isEditableTarget = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  const formatError = (cause: unknown, file?: File) => {
    const message = cause instanceof Error ? cause.message : 'Не вдалося оновити вкладення.'
    return cause instanceof ApiError && file ? `${message} (HTTP ${cause.status}; MIME ${file.type || 'не визначено'}).` : message
  }
  async function attempt(action: () => void | Promise<void>, file?: File) { try { setPending(true); await action(); setError('') } catch (cause) { setError(formatError(cause, file)) } finally { setPending(false) } }
  async function addFiles(files: File[]) {
    for (const rawFile of files) {
      const file = ownerType === 'auditFinding' ? rawFile : await prepareEvidenceImage(rawFile)
      await onAddFile?.(file)
    }
  }
  useEffect(() => {
    if (readOnly || ownerType === 'auditFinding') return
    const onPaste = (event: ClipboardEvent) => {
      if (activePasteTarget && activePasteTarget !== pasteTarget || isEditableTarget(event.target)) return
      const files = imageFileFromClipboard(event.clipboardData?.items)
      if (!files.length) return
      activePasteTarget = pasteTarget
      event.preventDefault()
      void attempt(() => addFiles(files), files[0])
    }
    document.addEventListener('paste', onPaste)
    return () => { document.removeEventListener('paste', onPaste); if (activePasteTarget === pasteTarget) activePasteTarget = '' }
  })
  return <section className="tc-section evidence-section" data-evidence-paste-target={pasteTarget} onPointerDown={() => { activePasteTarget = pasteTarget }} onFocusCapture={() => { activePasteTarget = pasteTarget }} aria-label="Attachments / Evidence"><h3>Attachments / Evidence</h3>
    {!readOnly && <><div className="tc-panel-actions"><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => input.current?.click()}>Add file</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setLinking(true)}>Add link</Button><input hidden ref={input} type="file" multiple aria-label="Evidence files" onChange={event => { const files = Array.from(event.target.files ?? []); void attempt(async () => { await addFiles(files); event.target.value = '' }, files[0]) }} /></div><p className="muted">{temporary ? 'Файли тимчасові до збереження запису. Frontend-ліміт: 20 MB на файл.' : 'Файли зберігаються у захищеному сховищі проєкту. Frontend-ліміт: 20 MB на файл.'}</p></>}
    {!readOnly && linking && <div className="tc-section"><div className="field"><label htmlFor={`${prefix}-name`}>Link name</label><Input id={`${prefix}-name`} value={name} onChange={event => setName(event.target.value)} /></div><div className="field"><label htmlFor={`${prefix}-url`}>Evidence URL</label><Input id={`${prefix}-url`} type="url" value={url} onChange={event => setUrl(event.target.value)} /></div><div className="tc-panel-actions"><Button type="button" size="sm" disabled={pending} onClick={() => void attempt(async () => { await onAddLink?.(name, url); setLinking(false); setName(''); setUrl('') })}>Save link</Button><Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => { setLinking(false); setError('') }}>Cancel link</Button></div></div>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {!visible.length ? <p className="muted">No attachments.</p> : <ul className="evidence-list">{visible.map(item => { const safe = safeEvidenceUrl(item.url, item.kind), image = item.kind === 'file' && item.mimeType?.startsWith('image/'), video = item.kind === 'file' && item.mimeType?.startsWith('video/'); return <li key={item.id}>
      {safe && image && <button type="button" className="evidence-preview-trigger" aria-label={`Preview ${item.name}`} onClick={() => setPreview(item)}><img className="evidence-thumbnail" src={safe} crossOrigin="use-credentials" alt={item.name} /></button>}
      {safe && video && <video className="evidence-video" src={safe} crossOrigin="use-credentials" controls preload="metadata" aria-label={item.name} />}
      <div className="evidence-info"><span>{item.name}</span><small>{item.kind === 'file' ? item.mimeType || 'File' : 'Link'}{item.sizeBytes !== undefined ? ` · ${item.sizeBytes.toLocaleString()} bytes` : ''}<br />{new Date(item.createdAt).toLocaleString()}{item.createdByUserId !== undefined ? ` · Created by: ${item.createdByUserId}` : ''}</small>{safe && <a href={safe} target="_blank" rel="noopener noreferrer">{image ? 'Open image' : item.kind === 'file' ? 'Open file' : 'Open link'}</a>}</div>
      {!readOnly && <Button type="button" variant="ghost" size="sm" disabled={pending} aria-label={`Remove ${item.name}`} onClick={() => void attempt(() => onRemove?.(item.id))}>Remove</Button>}
    </li> })}</ul>}
    {preview && <Dialog open onOpenChange={open => { if (!open) setPreview(null) }}><DialogContent className="evidence-preview-dialog"><DialogHeader><DialogTitle>{preview.name}</DialogTitle></DialogHeader><img className="evidence-preview-image" src={safeEvidenceUrl(preview.url, preview.kind)} crossOrigin="use-credentials" alt={preview.name} /></DialogContent></Dialog>}
  </section>
}
