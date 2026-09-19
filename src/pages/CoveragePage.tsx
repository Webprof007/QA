import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ColumnFilter } from '@/components/coverage/ColumnFilter'
import { EntityLinkPicker } from '@/components/coverage/EntityLinkPicker'
import { TestCaseLinkPicker } from '@/components/requirements/TestCaseLinkPicker'
import { priorities } from '@/components/test-cases/testCaseOptions'
import { requirementStatuses } from '@/components/requirements/requirementOptions'
import { resultLabel } from '@/lib/domainLabels'
import { coverageSummary, emptyCoverageFilters, filterCoverage, latestExecutionResult, requirementsWithLinks } from '@/lib/coverage'
import type { ProjectArea, Requirement, RequirementTestCaseLink, TestCase, TestCaseDictionaryValue, TestExecution } from '@/types'
import './RequirementsPage.css'
import './CoveragePage.css'

type Props = {
  projectId: string; requirements: Requirement[]; cases: TestCase[]; links: RequirementTestCaseLink[]
  areas: ProjectArea[]; types: TestCaseDictionaryValue[]; executions: TestExecution[]
  onLinksChange: (direction: 'requirement' | 'testCase', id: string, ids: string[]) => void | Promise<void>
}
export function CoveragePage({ projectId, requirements, cases, links, areas, types, executions, onLinksChange }: Props) {
  const [view, setView] = useState<'requirement' | 'testCase'>('requirement')
  const [filters, setFilters] = useState(emptyCoverageFilters)
  const [selectedId, setSelectedId] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')
  const items = requirementsWithLinks(projectId, requirements, cases, links)
  const availableCases = cases.filter(item => item.projectId === projectId)
  const availableAreas = areas.filter(item => item.projectId === projectId)
  const availableTypes = types.filter(item => item.projectId === projectId)
  const summary = coverageSummary(items)
  const linkedRequirements = (id: string) => items.filter(item => item.testCaseIds.includes(id))
  const query = filters.search.trim().toLowerCase()
  const visible = view === 'requirement' ? filterCoverage(items, filters) : availableCases.filter(item =>
    (!query || [item.code, item.id, item.title].some(value => value.toLowerCase().includes(query))) &&
    (!filters.areaId || item.areaId === filters.areaId) && (!filters.priority || item.priority === filters.priority))
  const selected = view === 'requirement' ? items.find(item => item.id === selectedId) : availableCases.find(item => item.id === selectedId)
  const selectedRequirement = items.find(item => item.id === selectedId)
  const selectedCases = availableCases.filter(item => selectedRequirement?.testCaseIds.includes(item.id))
  const areaName = (id?: string) => availableAreas.find(item => item.id === id)?.name || '—'
  const priorityName = (value?: string) => priorities.find(item => item.value === value)?.label || '—'
  const header = (key: 'areaId' | 'priority' | 'status' | 'coverage', label: string, options: { value: string; label: string }[]) =>
    <ColumnFilter label={label} value={filters[key]} options={options} onChange={value => setFilters(current => ({ ...current, [key]: value }))} />
  async function saveLinks(ids: string[]) {
    if (!selected) return
    setError('')
    try { await onLinksChange(view, selected.id, ids); setPickerOpen(false) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося змінити зв’язки.') }
  }
  return <main className="smoke-app coverage-page">
    <header className="page-heading"><h1>Coverage</h1></header>
    <div className="tc-toolbar" role="group" aria-label="Coverage view">
      <Button variant={view === 'requirement' ? 'secondary' : 'ghost'} size="sm" aria-pressed={view === 'requirement'} onClick={() => { setView('requirement'); setSelectedId(''); setFilters(emptyCoverageFilters); setPickerOpen(false) }}>Requirements Coverage / Покриття вимог</Button>
      <Button variant={view === 'testCase' ? 'secondary' : 'ghost'} size="sm" aria-pressed={view === 'testCase'} onClick={() => { setView('testCase'); setSelectedId(''); setFilters(emptyCoverageFilters); setPickerOpen(false) }}>Traceability / Простежуваність</Button>
    </div>
    <p className="coverage-summary muted" aria-label="Coverage summary">Requirements: {summary.total} · Covered: {summary.covered} · Uncovered: {summary.uncovered} · Coverage: {summary.percentage}%</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className={`tc-layout ${selected ? 'tc-with-panel' : ''}`}>
      <section className="tc-list" aria-label="Coverage list">
        <div className="tc-toolbar"><Input aria-label="Search by ID or title" placeholder="Search by ID or title..." value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} />
          {Object.values(filters).some(Boolean) && <Button variant="ghost" size="sm" onClick={() => setFilters(emptyCoverageFilters)}>Clear filters</Button>}
        </div>
        <table className="tc-table coverage-table" aria-label={view === 'requirement' ? 'Requirement coverage' : 'Test case traceability'}>
          <colgroup><col style={{ width: '17%' }} /><col /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} />{view === 'requirement' && <col style={{ width: '12%' }} />}<col style={{ width: '12%' }} />{view === 'requirement' && <col style={{ width: '14%' }} />}</colgroup>
          <thead><tr><th>{view === 'requirement' ? 'Requirement' : 'Test Case'}</th><th>Title</th>
            <th>{header('areaId', 'Area', availableAreas.map(item => ({ value: item.id, label: item.name })))}</th><th>{header('priority', 'Priority', priorities)}</th>
            {view === 'requirement' && <th>{header('status', 'Status', requirementStatuses)}</th>}<th>{view === 'requirement' ? 'Test Cases' : 'Requirements'}</th>
            {view === 'requirement' && <th>{header('coverage', 'Coverage', [{ value: 'covered', label: 'Covered' }, { value: 'uncovered', label: 'Uncovered' }])}</th>}
          </tr></thead>
          <tbody>{visible.map(item => {
            const count = view === 'requirement' ? items.find(value => value.id === item.id)!.testCaseIds.length : linkedRequirements(item.id).length
            return <tr key={item.id} className={selectedId === item.id ? 'tc-selected' : ''} onClick={() => { setSelectedId(item.id); setPickerOpen(false) }}>
              <td><button type="button" className="tc-open" aria-label={`Open ${item.code}`} onClick={event => { event.stopPropagation(); setSelectedId(item.id); setPickerOpen(false) }}>{item.code}</button></td>
              <td>{item.title}</td><td>{areaName(item.areaId)}</td><td>{priorityName(item.priority)}</td>
              {view === 'requirement' && <td>{requirementStatuses.find(value => value.value === item.status)?.label}</td>}
              <td>{view === 'testCase' && !count ? 'No requirement' : count}</td>{view === 'requirement' && <td>{count ? 'Covered' : 'Uncovered'}</td>}
            </tr>
          })}</tbody>
        </table>
        {!visible.length && <p className="empty-state muted">Немає записів для відображення.</p>}
      </section>
      {selected && <aside className="tc-panel" aria-label="Coverage detail">
        <div className="panel-heading"><div><p className="test-id">{selected.code}</p><h2>{selected.title}</h2></div><Button variant="ghost" size="icon" aria-label="Close coverage panel" onClick={() => { setSelectedId(''); setPickerOpen(false) }}><X /></Button></div>
        <div className="tc-form"><dl className="tc-field-pair"><div><dt>Area</dt><dd>{areaName(selected.areaId)}</dd></div><div><dt>Priority</dt><dd>{priorityName(selected.priority)}</dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div></dl>
          <section className="tc-section"><h3>{view === 'requirement' ? 'Linked Test Cases' : 'Requirements'}</h3>
            {view === 'requirement' ? <>
              {selectedCases.length ? <table className="tc-table" aria-label="Linked Test Cases"><thead><tr><th>ID / Title</th><th>Area / Priority</th><th>Type / Status</th><th>Latest Result</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{selectedCases.map(item => <tr key={item.id}>
                <td><span className="test-id">{item.code}</span><br />{item.title}</td><td>{areaName(item.areaId)}<br />{priorityName(item.priority)}</td><td>{availableTypes.find(type => type.id === item.typeId)?.name || '—'}<br />{item.status}</td><td>{resultLabel(latestExecutionResult(projectId, item.id, executions))}</td>
                <td><Button variant="ghost" size="icon" aria-label={`Unlink ${item.code}`} onClick={() => void saveLinks(selectedCases.filter(value => value.id !== item.id).map(value => value.id))}><X /></Button></td>
              </tr>)}</tbody></table> : <p className="muted">No linked test cases</p>}
            </> : <>
              {linkedRequirements(selected.id).length ? <ul className="req-linked-list">{linkedRequirements(selected.id).map(item => <li key={item.id}><span><span className="test-id">{item.code}</span> — {item.title}</span><Button variant="ghost" size="icon" aria-label={`Unlink ${item.code}`} onClick={() => void saveLinks(linkedRequirements(selected.id).filter(value => value.id !== item.id).map(value => value.id))}><X /></Button></li>)}</ul> : <p className="muted">No requirement</p>}
            </>}
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>{view === 'requirement' ? 'Link Test Cases' : 'Manage Requirements'}</Button>
          </section>
        </div>
      </aside>}
    </div>
    {pickerOpen && selected && (view === 'requirement'
      ? <TestCaseLinkPicker testCases={availableCases} areas={availableAreas} types={availableTypes} selectedIds={selectedCases.map(item => item.id)} onApply={ids => void saveLinks(ids)} onClose={() => setPickerOpen(false)} />
      : <EntityLinkPicker kind="requirements" testCases={items.map(item => ({ ...item, area: areaName(item.areaId) }))} selectedIds={linkedRequirements(selected.id).map(item => item.id)} onApply={ids => void saveLinks(ids)} onClose={() => setPickerOpen(false)} />)}
  </main>
}
