import { AddEntityButton } from '@/components/AddEntityButton'
import { SettingsDictionarySection } from '@/components/project-setup/SettingsDictionarySection'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { saveBuild, saveEnvironment, saveRelease, deleteSetupEntity, releaseStatuses } from '@/lib/projectSetup'
import type { Build, Environment, Project, ProjectArea, ProjectSetupState, Release, TestCaseDictionaryValue } from '@/types'
import './ProjectSettingsPage.css'

type Draft = { kind: 'Environment'; value: Environment } | { kind: 'Release'; value: Release } | { kind: 'Build'; value: Build }
type Props = {
  project: Project; areas: ProjectArea[]; types: TestCaseDictionaryValue[]; data: ProjectSetupState
  onChange: Dispatch<SetStateAction<ProjectSetupState>>
  onAreaSave: (name: string, id?: string) => Promise<string>; onAreaRemove: (id: string) => Promise<string>
  onTypeSave: (name: string, id?: string) => Promise<string>; onTypeRemove: (id: string) => Promise<string>
  onDeleteProject: () => void
}

export function ProjectSettingsPage({ project, areas, types, data, onChange, onAreaSave, onAreaRemove, onTypeSave, onTypeRemove, onDeleteProject }: Props) {
  const projectId = project.id
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<{ kind: 'environments' | 'builds'; id: string } | null>(null)
  const environments = data.environments.filter(item => item.projectId === projectId)
  const releases = data.releases.filter(item => item.projectId === projectId)
  const builds = data.builds.filter(item => item.projectId === projectId)
  const close = () => { setDraft(null); setError('') }
  const updated = (value: string) => value ? new Date(value).toLocaleDateString() : '—'
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
  function setDraftName(value: string) {
    setDraft(current => {
      if (!current) return current
      if (current.kind === 'Build') return { ...current, value: { ...current.value, version: value } }
      if (current.kind === 'Environment') return { ...current, value: { ...current.value, name: value } }
      return { ...current, value: { ...current.value, name: value } }
    })
  }
  return <main className="smoke-app settings-page"><header className="page-heading"><h1>Settings / Налаштування</h1></header>
    <section className="settings-section" aria-labelledby="settings-general"><div className="settings-section-heading"><div><h2 id="settings-general">General / Загальне</h2><p className="muted">Основна інформація про проєкт.</p></div></div><dl className="settings-general"><div><dt>Project name</dt><dd>{project.name}</dd></div>{project.description?.trim() && <div><dt>Description</dt><dd>{project.description}</dd></div>}</dl></section>
    <SettingsDictionarySection title="Project Areas / Області проєкту" description="Функціональні області проєкту, що використовуються у Requirements, Test Cases, Checklists, Defects, Audit та Coverage." emptyText="Областей поки немає." entity="area" projectId={projectId} items={areas} onSave={onAreaSave} onRemove={onAreaRemove} />
    <SettingsDictionarySection title="Test Case Types / Типи тест-кейсів" description="Типи тест-кейсів, доступні в межах цього проєкту." emptyText="Типів тест-кейсів поки немає." entity="test case type" projectId={projectId} items={types} onSave={onTypeSave} onRemove={onTypeRemove} />
    <section className="settings-section" aria-labelledby="settings-environments"><div className="settings-section-heading"><div><h2 id="settings-environments">Environments / Середовища</h2><p className="muted">Середовища, у яких виконується тестування проєкту.</p></div><AddEntityButton entity="environment" onClick={() => create('Environment')} /></div><table className="tc-table" aria-label="Environments"><thead><tr>{['Name', 'Base URL', 'Status', 'Updated'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{environments.map(item => <tr key={item.id} onClick={() => { setError(''); setDraft({ kind: 'Environment', value: { ...item } }) }}><td><button className="tc-open">{item.name}</button></td><td>{item.baseUrl || '—'}</td><td>{item.isActive ? 'Active' : 'Inactive'}</td><td>{updated(item.updatedAt)}</td></tr>)}</tbody></table>{!environments.length && <p className="muted">Середовищ поки немає.</p>}</section>
    <section className="settings-section" aria-labelledby="settings-releases"><div className="settings-section-heading"><div><h2 id="settings-releases">Releases &amp; Builds / Релізи та збірки</h2><p className="muted">Релізи та збірки, для яких виконується тестування.</p></div></div><SetupTable title="Releases / Релізи" action={<AddEntityButton entity="release" onClick={() => create('Release')} />}><table className="tc-table" aria-label="Releases"><thead><tr>{['Release', 'Status', 'Start', 'Release date', 'Builds'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{releases.map(item => <tr key={item.id} onClick={() => { setError(''); setDraft({ kind: 'Release', value: { ...item } }) }}><td><button className="tc-open">{item.name}</button></td><td>{item.status}</td><td>{item.startDate || '—'}</td><td>{item.releaseDate || '—'}</td><td>{builds.filter(build => build.releaseId === item.id).length}</td></tr>)}</tbody></table>{!releases.length && <p className="muted">Релізів поки немає.</p>}</SetupTable><SetupTable title="Builds / Збірки" action={<AddEntityButton entity="build" onClick={() => create('Build')} />}><table className="tc-table" aria-label="Builds"><thead><tr>{['Version', 'Release', 'Description', 'Created'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{builds.map(item => <tr key={item.id} onClick={() => { setError(''); setDraft({ kind: 'Build', value: { ...item } }) }}><td><button className="tc-open">{item.version}</button></td><td>{releases.find(release => release.id === item.releaseId)?.name || '—'}</td><td>{item.description || '—'}</td><td>{updated(item.createdAt)}</td></tr>)}</tbody></table>{!builds.length && <p className="muted">Збірок поки немає.</p>}</SetupTable></section>
    <section className="settings-section settings-danger" aria-labelledby="settings-danger"><div><h2 id="settings-danger">Danger Zone / Небезпечна зона</h2><p className="muted">Безповоротне видалення проєкту та всіх пов’язаних QA-даних.</p></div><Button variant="destructive" onClick={onDeleteProject}>Delete Project</Button></section>
    <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open) close() }}><DialogContent><DialogHeader><DialogTitle>{draft?.kind}</DialogTitle><DialogDescription>Manage shared setup for {project.name}.</DialogDescription></DialogHeader>{draft && <form className="tc-form" onSubmit={event => { event.preventDefault(); save() }}>
      <div className="field"><label htmlFor="setup-name">{draft.kind === 'Build' ? 'Version' : 'Name'}</label><Input id="setup-name" required value={draft.kind === 'Build' ? draft.value.version : draft.value.name} onChange={event => setDraftName(event.target.value)} /></div>
      <div className="field"><label htmlFor="setup-description">Description</label><Textarea id="setup-description" value={draft.value.description ?? ''} onChange={event => setDraft({ ...draft, value: { ...draft.value, description: event.target.value } } as Draft)} /></div>
      {draft.kind === 'Environment' && <><div className="field"><label htmlFor="setup-url">Base URL</label><Input id="setup-url" type="url" value={draft.value.baseUrl ?? ''} onChange={event => setDraft({ ...draft, value: { ...draft.value, baseUrl: event.target.value } })} /></div><label className="req-picker-selected"><Checkbox checked={draft.value.isActive} onCheckedChange={checked => setDraft({ ...draft, value: { ...draft.value, isActive: checked === true } })} />Active</label></>}
      {draft.kind === 'Release' && <><div className="field"><label htmlFor="setup-status">Status</label><select className="audit-select" id="setup-status" value={draft.value.status} onChange={event => setDraft({ ...draft, value: { ...draft.value, status: event.target.value as Release['status'] } })}>{releaseStatuses.map(status => <option key={status}>{status}</option>)}</select></div><div className="tc-field-pair">{([['startDate', 'Start date'], ['releaseDate', 'Release date']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`setup-${key}`}>{label}</label><Input id={`setup-${key}`} type="date" value={draft.value[key] ?? ''} onChange={event => setDraft({ ...draft, value: { ...draft.value, [key]: event.target.value } })} /></div>)}</div></>}
      {draft.kind === 'Build' && <div className="field"><label htmlFor="setup-release">Release</label><select className="audit-select" id="setup-release" value={draft.value.releaseId ?? ''} onChange={event => setDraft({ ...draft, value: { ...draft.value, releaseId: event.target.value || undefined } })}><option value="">—</option>{releases.filter(item => item.status !== 'Archived' || builds.some(build => build.id === draft.value.id && build.releaseId === item.id)).map(item => <option key={item.id} value={item.id}>{item.name}{item.status === 'Archived' ? ' · Archived' : ''}</option>)}</select></div>}
      {error && <p className="form-error" role="alert">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit">Save</Button>{draft.kind !== 'Release' && (draft.kind === 'Environment' ? environments : builds).some(item => item.id === draft.value.id) && <Button type="button" variant="destructive" onClick={() => setDeleting({ kind: draft.kind === 'Environment' ? 'environments' : 'builds', id: draft.value.id })}>Delete {draft.kind}</Button>}</DialogFooter>
    </form>}</DialogContent></Dialog>
    <Dialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Видалити запис?</DialogTitle><DialogDescription>Історичні назви в Runs та Defects залишаться незмінними.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={() => { if (deleting) onChange(current => deleteSetupEntity(current, projectId, deleting.kind, deleting.id)); setDeleting(null); close() }}>Підтвердити видалення</Button></DialogFooter></DialogContent></Dialog>
  </main>
}

function SetupTable({ title, action, children }: { title: string; action: React.ReactNode; children: React.ReactNode }) {
  return <div className="settings-subsection"><div className="settings-section-heading"><h3>{title}</h3>{action}</div>{children}</div>
}
