import { ProjectContextFields } from '@/components/project-setup/ProjectContextFields'
import { emptyProjectSetup } from '@/lib/projectSetup'
import type { ProjectSetupState } from '@/types'
import { SlidersHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import type { ProjectArea, TestCase, TestCaseDictionaryValue, TestPlan } from '@/types'
import type { RunInput } from '@/lib/testRuns'
export function TestRunCreate({ projectId, setup = emptyProjectSetup, initial, cases, plans, areas, types, onCreate, onCancel }: { projectId: string; setup?: ProjectSetupState; initial?: Partial<RunInput>; cases: TestCase[]; plans: TestPlan[]; areas: ProjectArea[]; types: TestCaseDictionaryValue[]; onCreate: (input: RunInput) => string | null; onCancel: () => void }) {
  const [draft, setDraft] = useState<RunInput>({ name: '', testPlanId: '', environmentId: undefined, buildId: undefined, browser: '', deviceOrOs: '', notes: '', testCaseIds: [], ...initial })
  const [search, setSearch] = useState(''), [area, setArea] = useState(''), [priority, setPriority] = useState(''), [type, setType] = useState('')
  const [page, setPage] = useState(0), [error, setError] = useState('')
  const visible = cases.filter(item => (!search.trim() || `${item.code} ${item.title}`.toLowerCase().includes(search.trim().toLowerCase())) && (!area || item.areaId === area) && (!priority || item.priority === priority) && (!type || item.typeId === type))
  const pageCount = Math.max(1, Math.ceil(visible.length / 10)), currentPage = Math.min(page, pageCount - 1)
  const patch = (value: Partial<RunInput>) => setDraft(current => ({ ...current, ...value }))
  const filterOptions = {
    Area: { value: area, set: setArea, options: areas.map(item => ({ value: item.id, label: item.name })) },
    Priority: { value: priority, set: setPriority, options: ['critical', 'high', 'medium', 'low'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
    Type: { value: type, set: setType, options: types.map(item => ({ value: item.id, label: item.name })) },
  }
  function filterHeader(label: keyof typeof filterOptions) {
    const filter = filterOptions[label]
    return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm">{label}<SlidersHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="start">
      <DropdownMenuItem onSelect={() => { filter.set(''); setPage(0) }}>All</DropdownMenuItem>
      {filter.options.map(option => <DropdownMenuCheckboxItem key={option.value} checked={filter.value === option.value} onCheckedChange={() => { filter.set(filter.value === option.value ? '' : option.value); setPage(0) }}>{option.label}</DropdownMenuCheckboxItem>)}
    </DropdownMenuContent></DropdownMenu>
  }
  return <form className="tc-form" onSubmit={event => { event.preventDefault(); setError(onCreate(draft) ?? '') }}>
    <h2>New Test Run</h2>
    <div className="run-fields"><ProjectContextFields projectId={projectId} setup={setup} value={draft} onChange={patch} />{([['name', 'Name'], ['browser', 'Browser'], ['deviceOrOs', 'Device / OS']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`run-${key}`}>{label}</label><Input id={`run-${key}`} required={key === 'name'} value={draft[key]} onChange={event => patch({ [key]: event.target.value })} /></div>)}
      <div className="field"><label htmlFor="run-plan">Test Plan</label><select id="run-plan" className="audit-select" value={draft.testPlanId ?? ''} onChange={event => patch({ testPlanId: event.target.value })}><option value="">—</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.title} · {plan.version}</option>)}</select></div>
    </div>
    <div className="field"><label htmlFor="run-notes">Notes</label><Textarea id="run-notes" rows={2} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></div>
    <section className="tc-section"><h3>Select Test Cases</h3><div className="tc-toolbar">
      <Input aria-label="Search test cases" placeholder="Search by ID or title..." value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
      {(search || area || priority || type) && <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setArea(''); setPriority(''); setType(''); setPage(0) }}>Clear filters</Button>}
    </div><div className="tc-panel-actions"><Button type="button" variant="outline" onClick={() => patch({ testCaseIds: [...new Set([...draft.testCaseIds, ...visible.slice(currentPage * 10, currentPage * 10 + 10).map(item => item.id)])] })}>Select all visible</Button><Button type="button" variant="ghost" onClick={() => patch({ testCaseIds: [] })}>Clear selection</Button><span>{draft.testCaseIds.length} selected</span></div>
      <table className="tc-table"><thead><tr>{['', 'ID', 'Title', 'Area', 'Priority', 'Type'].map((label, index) => <th key={index}>{label in filterOptions ? filterHeader(label as keyof typeof filterOptions) : label}</th>)}</tr></thead><tbody>{visible.slice(currentPage * 10, currentPage * 10 + 10).map(item => <tr key={item.id}><td><Checkbox aria-label={`Select ${item.code} ${item.title}`} checked={draft.testCaseIds.includes(item.id)} onCheckedChange={checked => patch({ testCaseIds: checked ? [...draft.testCaseIds, item.id] : draft.testCaseIds.filter(id => id !== item.id) })} /></td><td>{item.code}</td><td>{item.title}</td><td>{areas.find(area => area.id === item.areaId)?.name || '—'}</td><td>{item.priority}</td><td>{types.find(type => type.id === item.typeId)?.name || '—'}</td></tr>)}</tbody></table>
      {!visible.length && <p>Немає відповідних Test Cases.</p>}
      <div className="tc-panel-actions"><Button type="button" variant="ghost" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous page</Button><span>{currentPage + 1} / {pageCount}</span><Button type="button" variant="ghost" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next page</Button></div>
    </section>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="tc-panel-actions"><Button type="submit">Create Run</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
  </form>
}
