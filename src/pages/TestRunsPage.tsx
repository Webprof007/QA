import { OwnerEvidence } from '@/components/evidence/OwnerEvidence'
import { AddEntityButton } from '@/components/AddEntityButton'
import { emptyProjectSetup } from '@/lib/projectSetup'
import type { ProjectSetupState } from '@/types'
import { testSuiteCases } from '@/lib/testSuites'
import type { TestSuitesState } from '@/types'
import { AccountBackButton } from '@/components/AccountBackButton'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { TestRunCreate } from '@/components/test-runs/TestRunCreate'
import { TestExecutionPanel } from '@/components/test-runs/TestExecutionPanel'
import { createTestRun, changeRunStatus, saveExecution, runCounts, executionResults, type ExecutionInput, type RunInput } from '@/lib/testRuns'
import { testRunReport } from '@/lib/runReports'
import { RunReport } from '@/components/run-reports/RunReport'
import type { DefectsState, ProjectArea, TestCase, TestCaseDictionaryValue, TestPlan, TestRunsState } from '@/types'
import '../App.css'
import './AuditPage.css'
import './TestCasesPage.css'
import './TestRunsPage.css'
const date = (value?: string | null) => value ? new Date(value).toLocaleString() : '—'
type Props = { setup?: ProjectSetupState; suites?: TestSuitesState; initialRunId?: string; initialCreateSuiteId?: string; onViewSuite?: (id: string) => void; initialExecutionId?: string; defects: DefectsState; onCreateDefect: (executionId: string) => void; onViewDefect: (id: string) => void; onLinkDefect: (executionId: string, defectId: string) => string | null; projectId: string; userId?: number; data: TestRunsState; cases: TestCase[]; plans: TestPlan[]; areas: ProjectArea[]; types: TestCaseDictionaryValue[]; onChange: Dispatch<SetStateAction<TestRunsState>> }
export function TestRunsPage({ setup = emptyProjectSetup, suites = { suites: [], links: [] }, initialRunId, initialCreateSuiteId, onViewSuite, projectId, userId, data, cases, plans, areas, types, onChange, initialExecutionId, defects, onCreateDefect, onViewDefect, onLinkDefect }: Props) {
  const [createInput, setCreateInput] = useState<Partial<RunInput> | undefined>(() => suites.suites.some(item => item.id === initialCreateSuiteId && item.projectId === projectId) ? { sourceTestSuiteId: initialCreateSuiteId, testCaseIds: testSuiteCases(suites, projectId, initialCreateSuiteId!, cases).map(item => item.id) } : undefined)
  const [creating, setCreating] = useState(Boolean(createInput)), [runId, setRunId] = useState(() => data.executions.find(item => item.projectId === projectId && item.id === initialExecutionId)?.runId ?? (data.runs.find(item => item.id === initialRunId && item.projectId === projectId)?.id ?? '')), [executionId, setExecutionId] = useState(initialExecutionId ?? '')
  const [draft, setDraft] = useState<ExecutionInput | null>(null), [confirming, setConfirming] = useState(false), [reportOpen, setReportOpen] = useState(false)
  const runs = data.runs.filter(run => run.projectId === projectId)
  const run = runs.find(run => run.id === runId)
  const entries = data.executions.filter(item => item.projectId === projectId && item.runId === runId)
  const execution = entries.find(item => item.id === executionId)
  const index = entries.findIndex(item => item.id === executionId)
  const stats = runCounts(entries)
  const readOnly = run?.status === 'Completed'
  function create(input: RunInput) {
    try {
      const created = createTestRun(projectId, input, cases, plans, areas, types, suites.suites, setup)
      onChange(current => ({ runs: [...current.runs, ...created.runs], executions: [...current.executions, ...created.executions] }))
      setCreating(false); setRunId(created.runs[0].id); setExecutionId(''); return null
    } catch (error) { return error instanceof Error ? error.message : 'Не вдалося створити запуск.' }
  }
  function complete() { onChange(current => changeRunStatus(current, projectId, runId, 'Completed')); setConfirming(false) }
  function select(id: string) { if (!draft) { setExecutionId(id); setConfirming(false) } }
  const report = run ? testRunReport(data, defects, projectId, run) : null
  return <main className="smoke-app"><header className="page-heading"><h1>Test Runs</h1></header>
    {creating ? <TestRunCreate projectId={projectId} setup={setup} initial={createInput} cases={cases.filter(item => item.projectId === projectId)} plans={plans.filter(item => item.projectId === projectId)} areas={areas.filter(item => item.projectId === projectId)} types={types.filter(item => item.projectId === projectId)} onCreate={create} onCancel={() => setCreating(false)} /> : !run ? <div className="tc-list"><div className="tc-toolbar"><AddEntityButton entity="test run" onClick={() => { setCreateInput(undefined); setCreating(true) }} /></div>
      <table className="tc-table run-list"><thead><tr>{['Name', 'Test Plan', 'Environment / Середовище', 'Build / Збірка', 'Status', 'Progress', 'Started', 'Updated'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{runs.map(item => { const progress = runCounts(data.executions.filter(execution => execution.projectId === projectId && execution.runId === item.id)); return <tr key={item.id} onClick={() => { setRunId(item.id); setExecutionId(''); setConfirming(false) }}><td><button className="tc-open" onClick={() => { setRunId(item.id); setExecutionId(''); setConfirming(false) }}>{item.name}</button></td><td>{item.testPlanTitleSnapshot || '—'}</td><td>{item.environmentNameSnapshot || '—'}</td><td>{item.buildVersionSnapshot || '—'}</td><td>{item.status}</td><td>{progress.done} / {progress.total}</td><td>{date(item.startedAt)}</td><td>{date(item.updatedAt)}</td></tr> })}</tbody></table>
      {!runs.length && <p className="muted">Запусків поки немає.</p>}
    </div> : reportOpen && report ? <RunReport kind="Test Run" run={run} summary={report} testPlan={run.testPlanTitleSnapshot} sourceSuite={run.sourceTestSuiteCodeSnapshot ? `${run.sourceTestSuiteCodeSnapshot} — ${run.sourceTestSuiteNameSnapshot}` : ''} onBack={() => setReportOpen(false)} onExecution={id => { setExecutionId(id); setReportOpen(false) }} onDefect={onViewDefect} /> : <>
      <div className="tc-toolbar"><AccountBackButton disabled={!!draft} onClick={() => { setRunId(''); setExecutionId(''); setConfirming(false); setReportOpen(false) }}>← Test Runs</AccountBackButton><h2>{run.name}</h2><span>{run.status}</span>
        <Button type="button" variant="outline" size="sm" disabled={!!draft} onClick={() => setReportOpen(true)}>View Report</Button>
        {!readOnly && <>{run.status === 'Draft' && <Button variant="outline" disabled={!!draft} onClick={() => onChange(current => changeRunStatus(current, projectId, runId, 'In Progress'))}>Start Run</Button>}<Button disabled={!!draft} onClick={() => stats.counts['Not Run'] ? setConfirming(true) : complete()}>Complete Run</Button></>}
      </div>
      <dl className="run-metadata">{[['Test Plan', run.testPlanTitleSnapshot], ['Environment / Середовище', run.environmentNameSnapshot], ['Build / Збірка', run.buildVersionSnapshot], ['Browser', run.browser], ['Device / OS', run.deviceOrOs], ['Started', date(run.startedAt)], ['Completed', date(run.completedAt)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
      {run.sourceTestSuiteId && <div className="tc-toolbar" aria-label="Source Suite"><span>Source Suite: {run.sourceTestSuiteCodeSnapshot} — {run.sourceTestSuiteNameSnapshot}</span>{onViewSuite && suites.suites.some(item => item.projectId === projectId && item.id === run.sourceTestSuiteId) && <Button variant="ghost" size="sm" disabled={!!draft} onClick={() => onViewSuite(run.sourceTestSuiteId!)}>View Suite</Button>}</div>}
      {run.notes && <p className="run-notes">{run.notes}</p>}
      <div className="tc-toolbar" aria-label="Run progress"><strong>Progress: {stats.done} / {stats.total}</strong>{executionResults.map(result => <span key={result}>{result}: {stats.counts[result]}</span>)}</div>
      {confirming && !readOnly && <div role="alert" className="tc-section"><p>{stats.counts['Not Run']} Test Cases залишаються Not Run. Завершити запуск без їх виконання?</p><div className="tc-panel-actions"><Button onClick={complete}>Завершити все одно</Button><Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button></div></div>}
      <div className={`tc-layout ${execution ? 'tc-with-panel' : ''}`}><div className="tc-list"><table className="tc-table"><thead><tr>{['Test Case', 'Title', 'Area', 'Priority', 'Result', 'Executed at'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{entries.map(item => <tr key={item.id} className={executionId === item.id ? 'tc-selected' : ''} onClick={() => select(item.id)}><td><button className="tc-open" disabled={!!draft} onClick={() => select(item.id)}>{item.testCaseSnapshot.code}</button></td><td>{item.testCaseSnapshot.title}</td><td>{item.testCaseSnapshot.areaName || '—'}</td><td>{item.testCaseSnapshot.priority}</td><td>{item.result}</td><td>{date(item.executedAt)}</td></tr>)}</tbody></table></div>
        {execution && <TestExecutionPanel evidence={<OwnerEvidence key={'evidence-' + execution.id} owner={{ projectId, ownerType: 'testExecution', ownerId: execution.id }} />} defects={defects.items.filter(item => item.projectId === projectId)} linkedDefects={defects.items.filter(item => item.projectId === projectId && defects.links.some(link => link.projectId === projectId && link.sourceType === 'testExecution' && link.sourceId === execution.id && link.defectId === item.id))} onCreateDefect={() => onCreateDefect(execution.id)} onViewDefect={onViewDefect} onLinkDefect={id => onLinkDefect(execution.id, id)} execution={execution} draft={draft} readOnly={readOnly} onChange={input => { if (!readOnly) setDraft(input) }} onSave={() => { if (!readOnly) { onChange(current => saveExecution(current, projectId, execution.id, draft ?? execution, userId)); setDraft(null) } }} onCancel={() => setDraft(null)} onClose={() => setExecutionId('')} first={index === 0} last={index === entries.length - 1} onPrevious={() => select(entries[index - 1].id)} onNext={() => select(entries[index + 1].id)} />}
      </div>
    </>}
  </main>
}
