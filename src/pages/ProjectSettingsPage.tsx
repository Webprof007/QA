import { AddEntityButton } from '@/components/AddEntityButton'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { saveBuild, saveEnvironment, saveRelease, deleteSetupEntity, releaseStatuses } from '@/lib/projectSetup'
import type { Build, Environment, ProjectSetupState, Release } from '@/types'
type Draft = { kind: 'Environment'; value: Environment } | { kind: 'Release'; value: Release } | { kind: 'Build'; value: Build }
export function ProjectSettingsPage({ projectId, data, onChange }: { projectId: string; data: ProjectSetupState; onChange: Dispatch<SetStateAction<ProjectSetupState>> }) {
  const [view, setView] = useState<'environments' | 'releases'>('environments'), [draft, setDraft] = useState<Draft | null>(null), [error, setError] = useState('')
  const [deleting, setDeleting] = useState<{ kind: 'environments' | 'builds'; id: string } | null>(null)
  const environments = data.environments.filter(item => item.projectId === projectId), releases = data.releases.filter(item => item.projectId === projectId), builds = data.builds.filter(item => item.projectId === projectId)
  const close = () => { setDraft(null); setError('') }
  function create(kind: Draft['kind']) {
    const base = { id: crypto.randomUUID(), projectId, createdAt: '', updatedAt: '', description: '' }
    setError('')
    if (kind === 'Environment') setDraft({ kind, value: { ...base, name: '', baseUrl: '', isActive: true } })
    else if (kind === 'Release') setDraft({ kind, value: { ...base, name: '', status: 'Planning', startDate: '', releaseDate: '' } })
    else setDraft({ kind, value: { ...base, version: '' } })
  }
  function save() {
    if (!draft) return
    try {
      const next = draft.kind === 'Environment' ? saveEnvironment(data, projectId, draft.value) : draft.kind === 'Release' ? saveRelease(data, projectId, draft.value) : saveBuild(data, projectId, draft.value)
      onChange(next); close()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не вдалося зберегти запис.') }
  }
  const updated = (value: string) => value ? new Date(value).toLocaleDateString() : '—'
  return <main className="smoke-app"><header className="page-heading"><h1>Settings / Налаштування</h1></header>
    <div className="tc-toolbar"><Button variant={view === 'environments' ? 'default' : 'outline'} onClick={() => { setView('environments'); close() }}>Environments</Button><Button variant={view === 'releases' ? 'default' : 'outline'} onClick={() => { setView('releases'); close() }}>Releases & Builds</Button></div>
    <div className={`tc-layout ${draft ? 'tc-with-panel' : ''}`}><div className="tc-list">
      {view === 'environments' ? <><div className="tc-toolbar"><AddEntityButton entity="environment" onClick={() => create('Environment')} /></div><table className="tc-table" aria-label="Environments"><thead><tr>{['Name', 'Base URL', 'Status', 'Updated'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{environments.map(item => <tr key={item.id} onClick={() => { setError(''); setDraft({ kind: 'Environment', value: { ...item } }) }}><td><button className="tc-open">{item.name}</button></td><td>{item.baseUrl || '—'}</td><td>{item.isActive ? 'Active' : 'Inactive'}</td><td>{updated(item.updatedAt)}</td></tr>)}</tbody></table>{!environments.length && <p className="muted">Environments поки немає.</p>}</> : <>
        <section className="tc-section"><div className="tc-toolbar"><h2>Releases</h2><AddEntityButton entity="release" onClick={() => create('Release')} /></div><table className="tc-table" aria-label="Releases"><thead><tr>{['Release', 'Status', 'Start', 'Release date', 'Builds'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{releases.map(item => <tr key={item.id} onClick={() => { setError(''); setDraft({ kind: 'Release', value: { ...item } }) }}><td><button className="tc-open">{item.name}</button></td><td>{item.status}</td><td>{item.startDate || '—'}</td><td>{item.releaseDate || '—'}</td><td>{builds.filter(build => build.releaseId === item.id).length}</td></tr>)}</tbody></table>{!releases.length && <p className="muted">Releases поки немає.</p>}</section>
        <section className="tc-section"><div className="tc-toolbar"><h2>Builds</h2><AddEntityButton entity="build" onClick={() => create('Build')} /></div><table className="tc-table" aria-label="Builds"><thead><tr>{['Version', 'Release', 'Description', 'Created'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{builds.map(item => <tr key={item.id} onClick={() => { setError(''); setDraft({ kind: 'Build', value: { ...item } }) }}><td><button className="tc-open">{item.version}</button></td><td>{releases.find(release => release.id === item.releaseId)?.name || '—'}</td><td>{item.description || '—'}</td><td>{updated(item.createdAt)}</td></tr>)}</tbody></table>{!builds.length && <p className="muted">Builds поки немає.</p>}</section>
      </>}
    </div>
    {draft && <aside className="tc-panel" aria-label="Settings editor"><div className="panel-heading"><h2>{draft.kind}</h2><Button variant="ghost" onClick={close}>Close</Button></div><form className="tc-form" onSubmit={event => { event.preventDefault(); save() }}>
      <div className="field"><label htmlFor="setup-name">{draft.kind === 'Build' ? 'Version' : 'Name'}</label><Input id="setup-name" required value={draft.kind === 'Build' ? draft.value.version : draft.value.name} onChange={event => setDraft(draft.kind === 'Build' ? { ...draft, value: { ...draft.value, version: event.target.value } } : draft.kind === 'Environment' ? { ...draft, value: { ...draft.value, name: event.target.value } } : { ...draft, value: { ...draft.value, name: event.target.value } })} /></div>
      <div className="field"><label htmlFor="setup-description">Description</label><Textarea id="setup-description" value={draft.value.description ?? ''} onChange={event => { const description = event.target.value; if (draft.kind === 'Environment') setDraft({ ...draft, value: { ...draft.value, description } }); else if (draft.kind === 'Release') setDraft({ ...draft, value: { ...draft.value, description } }); else setDraft({ ...draft, value: { ...draft.value, description } }) }} /></div>
      {draft.kind === 'Environment' && <><div className="field"><label htmlFor="setup-url">Base URL</label><Input id="setup-url" type="url" value={draft.value.baseUrl ?? ''} onChange={event => setDraft({ ...draft, value: { ...draft.value, baseUrl: event.target.value } })} /></div><label className="req-picker-selected"><Checkbox checked={draft.value.isActive} onCheckedChange={checked => setDraft({ ...draft, value: { ...draft.value, isActive: checked === true } })} />Active</label></>}
      {draft.kind === 'Release' && <><div className="field"><label htmlFor="setup-status">Status</label><select className="audit-select" id="setup-status" value={draft.value.status} onChange={event => setDraft({ ...draft, value: { ...draft.value, status: event.target.value as Release['status'] } })}>{releaseStatuses.map(status => <option key={status}>{status}</option>)}</select></div><div className="tc-field-pair">{([['startDate', 'Start date'], ['releaseDate', 'Release date']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`setup-${key}`}>{label}</label><Input id={`setup-${key}`} type="date" value={draft.value[key] ?? ''} onChange={event => setDraft({ ...draft, value: { ...draft.value, [key]: event.target.value } })} /></div>)}</div></>}
      {draft.kind === 'Build' && <div className="field"><label htmlFor="setup-release">Release</label><select className="audit-select" id="setup-release" value={draft.value.releaseId ?? ''} onChange={event => setDraft({ ...draft, value: { ...draft.value, releaseId: event.target.value || undefined } })}><option value="">—</option>{releases.filter(item => item.status !== 'Archived' || builds.some(build => build.id === draft.value.id && build.releaseId === item.id)).map(item => <option key={item.id} value={item.id}>{item.name}{item.status === 'Archived' ? ' · Archived' : ''}</option>)}</select></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="tc-panel-actions"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={close}>Cancel</Button>{draft.kind !== 'Release' && (draft.kind === 'Environment' ? environments : builds).some(item => item.id === draft.value.id) && <Button type="button" variant="destructive" onClick={() => setDeleting({ kind: draft.kind === 'Environment' ? 'environments' : 'builds', id: draft.value.id })}>Delete {draft.kind}</Button>}</div>
    </form></aside>}
    </div>
    <Dialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Видалити запис?</DialogTitle><DialogDescription>Історичні назви в Runs та Defects залишаться незмінними.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={() => { if (deleting) onChange(current => deleteSetupEntity(current, projectId, deleting.kind, deleting.id)); setDeleting(null); close() }}>Підтвердити видалення</Button></DialogFooter></DialogContent></Dialog>
  </main>
}
