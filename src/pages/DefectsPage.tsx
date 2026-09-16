import { useDefectContext } from '@/components/defects/defectContext'
import { DefectSourceSummary } from '@/components/defects/DefectSourceSummary'
import type { DefectSourceRef } from '@/types'
import { AddEntityButton } from '@/components/AddEntityButton'
import { DefectRetests, type RetestAction } from '@/components/defects/DefectRetests'
import type { EvidenceDraft } from '@/types'
import type { RetestInput } from '@/lib/defectRetests'
import type { DefectRetest, TestCase, TestCaseDictionaryValue } from '@/types'
import { emptyProjectSetup } from '@/lib/projectSetup'
import type { ProjectSetupState } from '@/types'
import { SlidersHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DefectPanel } from '@/components/defects/DefectPanel'
import { defectFromSource, newDefect, defectSeverities, defectPriorities, defectStatuses } from '@/lib/defects'
import type { Defect, ProjectArea, TestRunsState } from '@/types'
import '../App.css'
import './AuditPage.css'
import './TestCasesPage.css'
export function DefectsPage({ retests = [], cases = [], types = [], onRetest, onRetestTransition, setup = emptyProjectSetup, projectId, items, areas, runs, initialId, sourceRef, onSave }: { retests?: DefectRetest[]; cases?: TestCase[]; types?: TestCaseDictionaryValue[]; onRetest?: (id: string, input: RetestInput, attachments: EvidenceDraft[]) => string | null; onRetestTransition?: (id: string, action: RetestAction, retestId?: string) => string | null; setup?: ProjectSetupState; projectId: string; items: Defect[]; areas: ProjectArea[]; runs: TestRunsState; initialId?: string; sourceRef?: DefectSourceRef; onSave: (draft: Defect) => string | null }) {
  const context = useDefectContext()
  const [selectedId, setSelectedId] = useState(initialId ?? '')
  const [draft, setDraft] = useState<Defect | null>(() => {
    if (!sourceRef) return null
    try { return defectFromSource(newDefect(projectId, items), sourceRef, context.sources, areas) } catch { return null }
  })
  const [filters, setFilters] = useState({ search: '', status: '', severity: '', priority: '', areaId: '' }), [error, setError] = useState('')
  const projectItems = items.filter(item => item.projectId === projectId), projectAreas = areas.filter(area => area.projectId === projectId)
  const selected = projectItems.find(item => item.id === selectedId), active = draft ?? selected
  const visible = projectItems.filter(item => (!filters.search.trim() || `${item.code} ${item.title}`.toLowerCase().includes(filters.search.trim().toLowerCase())) && (!filters.status || item.status === filters.status) && (!filters.severity || item.severity === filters.severity) && (!filters.priority || item.priority === filters.priority) && (!filters.areaId || item.areaId === filters.areaId))
  const filterOptions = {
    Area: { key: 'areaId', values: projectAreas.map(area => ({ value: area.id, label: area.name })) },
    Severity: { key: 'severity', values: defectSeverities.map(value => ({ value, label: value })) },
    Priority: { key: 'priority', values: defectPriorities.map(value => ({ value, label: value })) },
    Status: { key: 'status', values: defectStatuses.map(value => ({ value, label: value })) },
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
  function close() { setDraft(null); setSelectedId(''); setError('') }
  function save() { if (!draft) return; const message = onSave(draft); if (message) setError(message); else { setSelectedId(draft.id); setDraft(null); setError('') } }
  return <main className="smoke-app"><header className="page-heading"><h1>Defects</h1></header>
    <div className={`tc-layout ${active ? 'tc-with-panel' : ''}`}><div className="tc-list"><div className="tc-toolbar">
      <Input aria-label="Search defects" placeholder="Search by BUG code or title..." value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} />
      {Object.values(filters).some(Boolean) && <Button variant="ghost" size="sm" onClick={() => setFilters({ search: '', status: '', severity: '', priority: '', areaId: '' })}>Clear filters</Button>}
      <AddEntityButton entity="defect" onClick={() => { setDraft(newDefect(projectId, items)); setSelectedId(''); setError('') }} />
    </div><table className="tc-table"><colgroup><col style={{ width: '13%' }} /><col /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '12%' }} /><col style={{ width: '9%' }} /><col style={{ width: '13%' }} /></colgroup><thead><tr>{['ID', 'Title', 'Area', 'Severity', 'Priority', 'Status', 'Build / Збірка', 'Updated'].map(label => <th key={label}>{label in filterOptions ? filterHeader(label as keyof typeof filterOptions) : label}</th>)}</tr></thead><tbody>{visible.map(item => <tr key={item.id} className={selectedId === item.id ? 'tc-selected' : ''} onClick={() => { setSelectedId(item.id); setDraft(null); setError('') }}><td><button className="tc-open" aria-label={`Open ${item.code}`} onClick={() => { setSelectedId(item.id); setDraft(null); setError('') }}>{item.code}</button></td><td>{item.title}</td><td>{projectAreas.find(area => area.id === item.areaId)?.name || '—'}</td><td>{item.severity}</td><td>{item.priority}</td><td>{item.status}</td><td>{item.buildVersionSnapshot || '—'}</td><td>{new Date(item.updatedAt).toLocaleDateString()}</td></tr>)}</tbody></table>{!visible.length && <p className="muted">Дефектів за цими умовами немає.</p>}</div>
      {active && <DefectPanel retestSection={onRetest && onRetestTransition && <DefectRetests key={active.id} defect={active} retests={retests} setup={setup} smoke={context.sources.smoke} cases={cases} runs={runs} areas={areas} types={types} onSave={(input, attachments) => onRetest(active.id, input, attachments)} onTransition={(action, retestId) => onRetestTransition(active.id, action, retestId)} />} setup={setup} item={active} editing={!!draft} error={error} areas={projectAreas} sourceSection={<DefectSourceSummary defect={active} disabled={!!draft} />} onChange={setDraft} onSave={save} onEdit={() => setDraft(structuredClone(active))} onCancel={() => { setDraft(null); setError('') }} onClose={close} />}
    </div>
  </main>
}
