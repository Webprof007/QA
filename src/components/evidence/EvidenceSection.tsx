import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { safeEvidenceUrl } from '@/lib/evidence'
import type { EvidenceItem, EvidenceOwner } from '@/types'
import './EvidenceSection.css'
type Props = EvidenceOwner & { items: EvidenceItem[]; readOnly?: boolean; onAddFile?: (file: File) => void; onAddLink?: (name: string, url: string) => void; onRemove?: (id: string) => void }
export function EvidenceSection({ projectId, ownerType, ownerId, items, readOnly = false, onAddFile, onAddLink, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null), prefix = useId()
  const [linking, setLinking] = useState(false), [name, setName] = useState(''), [url, setUrl] = useState(''), [error, setError] = useState('')
  const visible = items.filter(item => item.projectId === projectId && item.ownerType === ownerType && item.ownerId === ownerId)
  function attempt(action: () => void) { try { action(); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не вдалося додати вкладення.') } }
  return <section className="tc-section evidence-section" aria-label="Attachments / Evidence"><h3>Attachments / Evidence</h3>
    {!readOnly && <><div className="tc-panel-actions"><Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()}>Add file</Button><Button type="button" size="sm" variant="outline" onClick={() => setLinking(true)}>Add link</Button><input hidden ref={input} type="file" multiple aria-label="Evidence files" onChange={event => { const files = Array.from(event.target.files ?? []); const errors: string[] = []; for (const file of files) { try { onAddFile?.(file) } catch (cause) { errors.push(cause instanceof Error ? cause.message : 'Не вдалося додати файл.') } } setError(errors.join(' ')); event.target.value = '' }} /></div><p className="muted">Файли тимчасові: лише поточна сесія браузера, без збереження після reload. Frontend-ліміт: 20 MB на файл.</p></>}
    {!readOnly && linking && <div className="tc-section"><div className="field"><label htmlFor={`${prefix}-name`}>Link name</label><Input id={`${prefix}-name`} value={name} onChange={event => setName(event.target.value)} /></div><div className="field"><label htmlFor={`${prefix}-url`}>Evidence URL</label><Input id={`${prefix}-url`} type="url" value={url} onChange={event => setUrl(event.target.value)} /></div><div className="tc-panel-actions"><Button type="button" size="sm" onClick={() => attempt(() => { onAddLink?.(name, url); setLinking(false); setName(''); setUrl('') })}>Save link</Button><Button type="button" variant="ghost" size="sm" onClick={() => { setLinking(false); setError('') }}>Cancel link</Button></div></div>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {!visible.length ? <p className="muted">No attachments.</p> : <ul className="evidence-list">{visible.map(item => { const safe = safeEvidenceUrl(item.url, item.kind), image = item.kind === 'file' && item.mimeType?.startsWith('image/'), video = item.kind === 'file' && item.mimeType?.startsWith('video/'); return <li key={item.id}>
      {safe && image && <a href={safe} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${item.name}`}><img className="evidence-thumbnail" src={safe} alt={item.name} /></a>}
      {safe && video && <video className="evidence-video" src={safe} controls preload="metadata" aria-label={item.name} />}
      <div className="evidence-info"><span>{item.name}</span><small>{item.kind === 'file' ? item.mimeType || 'File' : 'Link'}{item.sizeBytes !== undefined ? ` · ${item.sizeBytes.toLocaleString()} bytes` : ''}<br />{new Date(item.createdAt).toLocaleString()}{item.createdByUserId !== undefined ? ` · Created by: ${item.createdByUserId}` : ''}</small>{safe && <a href={safe} target="_blank" rel="noopener noreferrer">{image ? 'Open image' : item.kind === 'file' ? 'Open file' : 'Open link'}</a>}</div>
      {!readOnly && <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${item.name}`} onClick={() => attempt(() => onRemove?.(item.id))}>Remove</Button>}
    </li> })}</ul>}
  </section>
}
