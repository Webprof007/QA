import { useDefectContext } from '@/components/defects/defectContext'
import { DefectSourceSummary } from '@/components/defects/DefectSourceSummary'
import type { DefectSourceRef } from '@/types'
import { AddEntityButton } from '@/components/AddEntityButton'
import { DefectRetests, type RetestAction, type RetestEvidenceAttachment, type RetestSaveResult } from '@/components/defects/DefectRetests'
import type { RetestInput } from '@/lib/defectRetests'
import type { DefectRetest, TestCase, TestCaseDictionaryValue } from '@/types'
import { emptyProjectSetup } from '@/lib/projectSetup'
import type { ProjectSetupState } from '@/types'
import { MoreHorizontal, SlidersHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DefectPanel } from '@/components/defects/DefectPanel'
import { defectFromSource, newDefect, defectSeverities, defectPriorities, defectStatuses } from '@/lib/defects'
import { defectStatusLabel, priorityLabel, severityLabel } from '@/lib/domainLabels'
import { DefectStatusDisplay } from '@/components/defects/DefectStatusDisplay'
import type { Defect, ProjectArea, TestRunsState } from '@/types'
import './DefectsPage.css'
export function DefectsPage({ retests = [], cases = [], types = [], onRetest, onRetestTransition, setup = emptyProjectSetup, projectId, items, areas, runs, initialId, sourceRef, onSave }: { retests?: DefectRetest[]; cases?: TestCase[]; types?: TestCaseDictionaryValue[]; onRetest?: (id: string, input: RetestInput, attachments: RetestEvidenceAttachment[]) => Promise<RetestSaveResult>; onRetestTransition?: (id: string, action: RetestAction, retestId?: string) => Promise<string | null>; setup?: ProjectSetupState; projectId: string; items: Defect[]; areas: ProjectArea[]; runs: TestRunsState; initialId?: string; sourceRef?: DefectSourceRef; onSave: (draft: Defect) => Promise<Defect> }) {
  const context = useDefectContext()
  const [selectedId, setSelectedId] = useState(initialId ?? '')
  const [draft, setDraft] = useState<Defect | null>(() => {
    if (!sourceRef) return null
    try { return defectFromSource(newDefect(projectId, items), sourceRef, context.sources, areas) } catch { return null }
  })
  const [filters, setFilters] = useState({ search: '', status: '', severity: '', priority: '', areaId: '' }), [error, setError] = useState('')
  const [retestRequest, setRetestRequest] = useState<{ id: string; key: number } | null>(null)
  const projectItems = items.filter(item => item.projectId === projectId), projectAreas = areas.filter(area => area.projectId === projectId)
  const selected = projectItems.find(item => item.id === selectedId), active = draft ?? selected
  const visible = projectItems.filter(item => (!filters.search.trim() || `${item.code} ${item.title}`.toLowerCase().includes(filters.search.trim().toLowerCase())) && (!filters.status || item.status === filters.status) && (!filters.severity || item.severity === filters.severity) && (!filters.priority || item.priority === filters.priority) && (!filters.areaId || item.areaId === filters.areaId))
  const filterOptions = {
    Area: { key: 'areaId', values: projectAreas.map(area => ({ value: area.id, label: area.name })) },
    Severity: { key: 'severity', values: defectSeverities.map(value => ({ value, label: severityLabel(value) })) },
    Priority: { key: 'priority', values: defectPriorities.map(value => ({ value, label: priorityLabel(value) })) },
    Status: { key: 'status', values: defectStatuses.map(value => ({ value, label: defectStatusLabel(value) })) },
  } as const
  function filterHeader(label: keyof typeof filterOptions) {
    const { key, values } = filterOptions[label]
    return <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">{label}<SlidersHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => setFilters({ ...filters, [key]: '' })}>All</DropdownMenuItem>
        {values.map(option => <DropdownMenuCheckboxItem key={option.value} checked={filters[key] === option.value} onCheckedChange={() => setFilters({ ...filters, [key]: filters[key] === option.value ? '' : option.value })}>{option.label}</DropdownMenuCheckboxItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  }
  function openItem(id: string) { setSelectedId(id); setDraft(null); setRetestRequest(null); setError('') }
  function close() { setDraft(null); setSelectedId(''); setRetestRequest(null); setError('') }
  function transition(id: string, action: RetestAction) {
    if (!onRetestTransition) return
    void onRetestTransition(id, action).then(message => { setSelectedId(id); setRetestRequest(null); setError(message ?? '') }).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося змінити статус.'))
  }
  function startRetest(id: string) { setSelectedId(id); setDraft(null); setRetestRequest({ id, key: Date.now() }); setError('') }
  function save() { if (!draft) return; void onSave(draft).then(saved => { setSelectedId(saved.id); setDraft(null); setError('') }).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося зберегти дефект.')) }
  return <main className="smoke-app defects-page"><header className="page-heading"><h1>Defects</h1></header>
    <div className={`tc-layout ${active ? 'tc-with-panel' : ''}`}><div className="tc-list"><div className="tc-toolbar">
      <AddEntityButton entity="defect" onClick={() => { setDraft(newDefect(projectId, items)); setSelectedId(''); setError('') }} />
      <Input aria-label="Search defects" placeholder="Search by BUG code or title..." value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} />
      {Object.values(filters).some(Boolean) && <Button variant="ghost" size="sm" onClick={() => setFilters({ search: '', status: '', severity: '', priority: '', areaId: '' })}>Clear filters</Button>}
    </div><div className="defects-table-scroll"><table className="tc-table defects-table"><colgroup><col className="id" /><col className="title" /><col className="area" /><col className="severity" /><col className="priority" /><col className="status" /><col className="build" /><col className="updated" /><col className="actions" /></colgroup><thead><tr>{['ID', 'Title', 'Area', 'Severity', 'Priority', 'Status', 'Build / Збірка', 'Updated', 'Actions'].map(label => <th key={label}>{label in filterOptions ? filterHeader(label as keyof typeof filterOptions) : label}</th>)}</tr></thead><tbody>{visible.map(item => <tr key={item.id} className={selectedId === item.id ? 'tc-selected' : ''} onClick={() => openItem(item.id)}><td><button className="tc-open" aria-label={`Open ${item.code}`} onClick={() => openItem(item.id)}>{item.code}</button></td><td>{item.title}</td><td>{projectAreas.find(area => area.id === item.areaId)?.name || '—'}</td><td>{severityLabel(item.severity)}</td><td>{priorityLabel(item.priority)}</td><td><DefectStatusDisplay value={item.status} /></td><td>{item.buildVersionSnapshot || '—'}</td><td>{new Date(item.updatedAt).toLocaleDateString()}</td><td><div className="table-row-actions" onClick={event => event.stopPropagation()}>{item.status === 'New' && onRetestTransition && <Button type="button" variant="outline" size="sm" aria-label={`Open Defect ${item.code}`} onClick={() => transition(item.id, 'Open')} title="Open Defect / Відкрити дефект">Open</Button>}{['Open', 'In Progress'].includes(item.status) && onRetestTransition && <Button type="button" variant="outline" size="sm" aria-label={`Mark Ready for Retest ${item.code}`} onClick={() => transition(item.id, 'Ready for Retest')} title="Mark Ready for Retest / Позначити готовим до повторного тестування">Ready</Button>}{item.status === 'Ready for Retest' && onRetest && <Button type="button" size="sm" aria-label={`Retest ${item.code}`} onClick={() => startRetest(item.id)} title="Retest / Повторне тестування">Retest</Button>}<DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={`More actions ${item.code}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => openItem(item.id)}>View details / Переглянути</DropdownMenuItem><DropdownMenuItem onSelect={() => { setSelectedId(item.id); setRetestRequest(null); setDraft(structuredClone(item)); setError('') }}>Edit / Редагувати</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td></tr>)}</tbody></table></div>{!visible.length && <p className="muted">Дефектів за цими умовами немає.</p>}</div>
      {active && <DefectPanel retestSection={onRetest && onRetestTransition && <DefectRetests autoStart={retestRequest?.id === active.id} key={`${active.id}-${retestRequest?.key ?? 0}`} defect={active} retests={retests} setup={setup} smoke={context.sources.smoke} cases={cases} runs={runs} areas={areas} types={types} onSave={(input, attachments) => onRetest(active.id, input, attachments)} onTransition={(action, retestId) => onRetestTransition(active.id, action, retestId)} />} setup={setup} item={active} editing={!!draft} error={error} areas={projectAreas} sourceSection={<DefectSourceSummary defect={active} disabled={!!draft} />} onChange={setDraft} onSave={save} onEdit={() => setDraft(structuredClone(active))} onCancel={() => { setDraft(null); setError('') }} onClose={close} />}
    </div>
  </main>
}
