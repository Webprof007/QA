import { useState } from 'react'
import { AddEntityButton } from '@/components/AddEntityButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Item = { id: string; projectId: string; name: string }

export function SettingsDictionarySection({ title, description, emptyText, entity, projectId, items, onSave, onRemove }: {
  title: string
  description: string
  emptyText: string
  entity: 'area' | 'test case type'
  projectId: string
  items: Item[]
  onSave: (name: string, id?: string) => Promise<string>
  onRemove: (id: string) => Promise<string>
}) {
  const scoped = items.filter(item => item.projectId === projectId)
  const [editing, setEditing] = useState<Item | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Item | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const closeEditor = () => { setEditing(null); setCreating(false); setName(''); setError('') }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    const normalized = name.trim().replace(/\s+/g, ' ')
    if (!normalized) { setError('Enter a name.'); return }
    if (scoped.some(item => item.id !== editing?.id && item.name.toLowerCase() === normalized.toLowerCase())) { setError('A value with this name already exists.'); return }
    setPending(true); setError('')
    try { await onSave(normalized, editing?.id); closeEditor() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the value.') }
    finally { setPending(false) }
  }
  async function remove() {
    if (!deleting) return
    setPending(true); setError('')
    try {
      const message = await onRemove(deleting.id)
      if (message) { setError(message); return }
      setDeleting(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the value.') }
    finally { setPending(false) }
  }
  return <section className="settings-section" aria-labelledby={`settings-${entity}-heading`}>
    <div className="settings-section-heading"><div><h2 id={`settings-${entity}-heading`}>{title}</h2><p className="muted">{description}</p></div><AddEntityButton entity={entity} onClick={() => { setCreating(true); setEditing(null); setName(''); setError('') }} /></div>
    <table className="tc-table" aria-label={title}><thead><tr><th>Name</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{scoped.map(item => <tr key={item.id}><td>{item.name}</td><td className="settings-row-actions"><Button size="sm" variant="ghost" onClick={() => { setEditing(item); setCreating(false); setName(item.name); setError('') }}>Rename</Button><Button size="sm" variant="ghost" onClick={() => { setDeleting(item); setError('') }}>Delete</Button></td></tr>)}</tbody></table>
    {!scoped.length && <p className="muted">{emptyText}</p>}
    <Dialog open={creating || Boolean(editing)} onOpenChange={open => { if (!open && !pending) closeEditor() }}><DialogContent><DialogHeader><DialogTitle>{editing ? `Rename ${entity}` : `Add ${entity}`}</DialogTitle><DialogDescription>Changes apply to the shared dictionary of the current project.</DialogDescription></DialogHeader><form className="tc-form" onSubmit={save}><div className="field"><label htmlFor={`settings-${entity}-name`}>Name</label><Input id={`settings-${entity}-name`} value={name} onChange={event => { setName(event.target.value); setError('') }} /></div>{error && <p role="alert" className="form-error">{error}</p>}<DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={closeEditor}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !pending) { setDeleting(null); setError('') } }}><DialogContent><DialogHeader><DialogTitle>Delete “{deleting?.name}”?</DialogTitle><DialogDescription>This value will be removed from the current project if it is not in use.</DialogDescription></DialogHeader>{error && <p role="alert" className="form-error">{error}</p>}<DialogFooter><Button variant="outline" disabled={pending} onClick={() => { setDeleting(null); setError('') }}>Cancel</Button><Button variant="destructive" disabled={pending} onClick={() => void remove()}>{pending ? 'Deleting…' : 'Delete'}</Button></DialogFooter></DialogContent></Dialog>
  </section>
}
