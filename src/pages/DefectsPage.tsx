import { SlidersHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DefectPanel } from '@/components/defects/DefectPanel'
import { defectFromExecution, newDefect, defectSeverities, defectPriorities, defectStatuses } from '@/lib/defects'
import type { Defect, ProjectArea, TestRunsState } from '@/types'
import '../App.css'
import './AuditPage.css'
import './TestCasesPage.css'
export function DefectsPage({ projectId, items, areas, runs, initialId, sourceExecutionId, onSave, onExecution }: { projectId: string; items: Defect[]; areas: ProjectArea[]; runs: TestRunsState; initialId?: string; sourceExecutionId?: string; onSave: (draft: Defect) => string | null; onExecution: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState(initialId ?? '')
  const [draft, setDraft] = useState<Defect | null>(() => {
    const execution = runs.executions.find(item => item.projectId === projectId && item.id === sourceExecutionId && item.result === 'Fail')
    const run = runs.runs.find(item => item.projectId === projectId && item.id === execution?.runId)
    return execution && run ? defectFromExecution(newDefect(projectId, items), execution, run, areas) : null
  })
  const [filters, setFilters] = useState({ search: '', status: '', severity: '', priority: '', areaId: '' }), [error, setError] = useState('')
  const projectItems = items.filter(item => item.projectId === projectId), projectAreas = areas.filter(area => area.projectId === projectId)
  const selected = projectItems.find(item => item.id === selectedId), active = draft ?? selected
  const visible = projectItems.filter(item => (!filters.search.trim() || `${item.code} ${item.title}`.toLowerCase().includes(filters.search.trim().toLowerCase())) && (!filters.status || item.status === filters.status) && (!filters.severity || item.severity === filters.severity) && (!filters.priority || item.priority === filters.priority) && (!filters.areaId || item.areaId === filters.areaId))
  const source = runs.executions.find(item => item.projectId === projectId && item.id === active?.sourceExecutionId)
  const run = runs.runs.find(item => item.projectId === projectId && item.id === source?.runId)
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
      <Button variant="outline" size="sm" className="tc-add" onClick={() => { setDraft(newDefect(projectId, items)); setSelectedId(''); setError('') }}>New Defect</Button>
    </div><table className="tc-table"><colgroup><col style={{ width: '13%' }} /><col /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '12%' }} /><col style={{ width: '9%' }} /><col style={{ width: '13%' }} /></colgroup><thead><tr>{['ID', 'Title', 'Area', 'Severity', 'Priority', 'Status', 'Build / Збірка', 'Updated'].map(label => <th key={label}>{label in filterOptions ? filterHeader(label as keyof typeof filterOptions) : label}</th>)}</tr></thead><tbody>{visible.map(item => <tr key={item.id} className={selectedId === item.id ? 'tc-selected' : ''} onClick={() => { setSelectedId(item.id); setDraft(null); setError('') }}><td><button className="tc-open" aria-label={`Open ${item.code}`} onClick={() => { setSelectedId(item.id); setDraft(null); setError('') }}>{item.code}</button></td><td>{item.title}</td><td>{projectAreas.find(area => area.id === item.areaId)?.name || '—'}</td><td>{item.severity}</td><td>{item.priority}</td><td>{item.status}</td><td>{item.build || '—'}</td><td>{new Date(item.updatedAt).toLocaleDateString()}</td></tr>)}</tbody></table>{!visible.length && <p className="muted">Дефектів за цими умовами немає.</p>}</div>
      {active && <DefectPanel item={active} editing={!!draft} error={error} areas={projectAreas} source={source} run={run} onChange={setDraft} onSave={save} onEdit={() => setDraft(structuredClone(active))} onCancel={() => { setDraft(null); setError('') }} onClose={close} onExecution={onExecution} />}
    </div>
  </main>
}
