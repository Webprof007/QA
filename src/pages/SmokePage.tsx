import { AddEntityButton } from '@/components/AddEntityButton'
import { emptyProjectSetup } from '@/lib/projectSetup'
import type { ProjectSetupState } from '@/types'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { AccountBackButton } from '@/components/AccountBackButton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { SmokeSuiteEditor } from '@/components/smoke/SmokeSuiteEditor'
import { SmokeRunCreate } from '@/components/smoke/SmokeRunCreate'
import { SmokeRunDetail } from '@/components/smoke/SmokeRunDetail'
import { suiteCases, saveSmokeSuite, deleteSmokeSuite, createSmokeRun, nextSmokeCode, type SmokeSuiteInput, type SmokeRunInput } from '@/lib/smoke'
import { runCounts } from '@/lib/testRuns'
import type { ProjectArea, SmokeState, TestCase, TestCaseDictionaryValue } from '@/types'
import './RequirementsPage.css'
import './TestRunsPage.css'
import './SmokePage.css'
const date = (value?: string) => value ? new Date(value).toLocaleString() : '—'
type Props = { initialExecutionId?: string; setup?: ProjectSetupState; projectId: string; data: SmokeState; cases: TestCase[]; areas: ProjectArea[]; types: TestCaseDictionaryValue[]; userId?: number; onChange: Dispatch<SetStateAction<SmokeState>> }
export function SmokePage({ initialExecutionId, setup = emptyProjectSetup, projectId, data, cases, areas, types, userId, onChange }: Props) {
  const initialRun = data.runs.find(item => item.projectId === projectId && item.id === data.executions.find(execution => execution.projectId === projectId && execution.id === initialExecutionId)?.runId)
  const [suiteId, setSuiteId] = useState(initialRun?.suiteId ?? ''), [runId, setRunId] = useState(initialRun?.id ?? ''), [creatingRun, setCreatingRun] = useState(false)
  const [editor, setEditor] = useState<SmokeSuiteInput | null>(null), [deleting, setDeleting] = useState(''), [error, setError] = useState('')
  const suites = data.suites.filter(item => item.projectId === projectId)
  const suite = suites.find(item => item.id === suiteId)
  const casesInProject = cases.filter(item => item.projectId === projectId), projectAreas = areas.filter(item => item.projectId === projectId), projectTypes = types.filter(item => item.projectId === projectId)
  const history = data.runs.filter(item => item.projectId === projectId && item.suiteId === suiteId)
  const run = history.find(item => item.id === runId)
  const tests = suiteCases(data, projectId, suiteId, casesInProject)
  const prerequisites = data.prerequisites.filter(item => item.projectId === projectId && item.suiteId === suiteId).sort((a, b) => a.order - b.order)
  function edit() { setCreatingRun(false); if (suite) setEditor({ id: suite.id, name: suite.name, description: suite.description, testCaseIds: tests.map(item => item.id), prerequisites: prerequisites.map(item => ({ id: item.id, text: item.text })) }) }
  function save(input: SmokeSuiteInput) {
    try { onChange(saveSmokeSuite(data, projectId, input, casesInProject)); setSuiteId(input.id); setEditor(null); return null }
    catch (error) { return error instanceof Error ? error.message : 'Не вдалося зберегти Suite.' }
  }
  function create(input: SmokeRunInput) {
    try { const next = createSmokeRun(data, projectId, suiteId, input, casesInProject, projectAreas, projectTypes, userId, setup); onChange(next); setRunId(next.runs[next.runs.length - 1].id); setCreatingRun(false); return null }
    catch (error) { return error instanceof Error ? error.message : 'Не вдалося створити Smoke Run.' }
  }
  function remove() { try { onChange(deleteSmokeSuite(data, projectId, deleting)); if (suiteId === deleting) setSuiteId(''); setDeleting(''); setError('') } catch (error) { setError(error instanceof Error ? error.message : 'Не вдалося видалити Suite.') } }
  return <main className="smoke-app"><header className="page-heading"><h1>Smoke</h1></header>
    {run ? <SmokeRunDetail initialExecutionId={initialExecutionId} key={run.id} run={run} data={data} userId={userId} onChange={onChange} onBack={() => setRunId('')} /> : <>
      {(suite || editor) && <AccountBackButton onClick={() => { setSuiteId(''); setEditor(null); setCreatingRun(false) }}>← Smoke</AccountBackButton>}
      <div className={`tc-layout ${editor || creatingRun ? 'tc-with-panel' : ''}`}><div className="tc-list">
        {!suite ? <><div className="tc-toolbar"><AddEntityButton entity="smoke suite" onClick={() => setEditor({ id: crypto.randomUUID(), name: '', description: '', testCaseIds: [], prerequisites: [] })} /></div>
          <table className="tc-table" aria-label="Smoke suites"><colgroup><col style={{ width: '12%' }} /><col /><col style={{ width: '10%' }} /><col style={{ width: '12%' }} /><col style={{ width: '16%' }} /><col style={{ width: '16%' }} /><col style={{ width: 56 }} /></colgroup><thead><tr>{['Code', 'Name', 'Test Cases', 'Prerequisites', 'Last Run', 'Updated', ''].map((label, index) => <th key={index}>{label}</th>)}</tr></thead><tbody>{suites.map(item => {
            const last = data.runs.filter(run => run.projectId === projectId && run.suiteId === item.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
            return <tr key={item.id} onClick={() => { setSuiteId(item.id); setEditor(null) }}><td><button className="tc-open" aria-label={`Open ${item.code}`} onClick={() => { setSuiteId(item.id); setEditor(null) }}>{item.code}</button></td><td>{item.name}</td><td>{suiteCases(data, projectId, item.id, casesInProject).length}</td><td>{data.prerequisites.filter(value => value.projectId === projectId && value.suiteId === item.id).length}</td><td>{date(last?.createdAt)}</td><td>{date(item.updatedAt)}</td><td><Button variant="ghost" size="sm" aria-label={`Delete ${item.code}`} onClick={event => { event.stopPropagation(); setDeleting(item.id); setError('') }}>Delete</Button></td></tr>
          })}</tbody></table>{!suites.length && <p className="muted">Smoke suites поки немає. Створіть перший набір.</p>}
        </> : <div className="tc-form"><div className="tc-toolbar"><p className="test-id">{suite.code}</p><h2>{suite.name}</h2><Button variant="outline" onClick={edit}>Edit Suite</Button><Button disabled={!tests.length || !!editor} onClick={() => setCreatingRun(true)}>Run Smoke</Button></div><p>{suite.description || '—'}</p>
          <section className="tc-section" aria-label="Suite prerequisites"><h3>Prerequisites</h3><ol>{prerequisites.map(item => <li key={item.id}>{item.text}</li>)}</ol>{!prerequisites.length && <p className="muted">Prerequisites не визначено.</p>}</section>
          <section className="tc-section"><h3>Test Cases</h3><table className="tc-table" aria-label="Suite test cases"><thead><tr><th>Code</th><th>Title</th><th>Area</th><th>Priority</th><th>Type</th></tr></thead><tbody>{tests.map(item => <tr key={item.id}><td>{item.code}</td><td>{item.title}</td><td>{projectAreas.find(area => area.id === item.areaId)?.name || '—'}</td><td>{item.priority}</td><td>{projectTypes.find(type => type.id === item.typeId)?.name || '—'}</td></tr>)}</tbody></table>
          {data.links.filter(link => link.projectId === projectId && link.suiteId === suiteId).some(link => !casesInProject.some(item => item.id === link.testCaseId)) && <p role="status">Деякі Test Cases недоступні. Збережіть актуальний склад через Edit Suite.</p>}</section>
          <section className="tc-section" aria-label="Smoke run history"><h3>Runs</h3><table className="tc-table"><thead><tr>{['Run', 'Environment / Середовище', 'Build / Збірка', 'Status', 'Progress', 'Started', 'Completed'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{history.map((item, index) => { const progress = runCounts(data.executions.filter(value => value.projectId === projectId && value.runId === item.id)); return <tr key={item.id} onClick={() => { setRunId(item.id); setEditor(null); setCreatingRun(false) }}><td><button className="tc-open" onClick={() => { setRunId(item.id); setEditor(null); setCreatingRun(false) }}>Run #{index + 1}</button></td><td>{item.environmentNameSnapshot || '—'}</td><td>{item.buildVersionSnapshot || '—'}</td><td>{item.status}</td><td>{progress.done} / {progress.total}</td><td>{date(item.startedAt)}</td><td>{date(item.completedAt)}</td></tr> })}</tbody></table>{!history.length && <p className="muted">Запусків поки немає.</p>}</section>
        </div>}
      </div>{editor ? <SmokeSuiteEditor key={editor.id} initial={editor} code={suite?.code ?? nextSmokeCode(data.suites, projectId)} cases={casesInProject} areas={projectAreas} types={projectTypes} onSave={save} onCancel={() => setEditor(null)} /> : creatingRun && <SmokeRunCreate projectId={projectId} setup={setup} onCreate={create} onCancel={() => setCreatingRun(false)} />}</div>
    </>}
    <Dialog open={!!deleting} onOpenChange={open => { if (!open) { setDeleting(''); setError('') } }}><DialogContent><DialogHeader><DialogTitle>Видалити Smoke Suite?</DialogTitle><DialogDescription>Центральні Test Cases залишаться. Suite з історією запусків видалити не можна.</DialogDescription></DialogHeader>{error && <p role="alert" className="form-error">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setDeleting('')}>Cancel</Button><Button variant="destructive" onClick={remove}>Delete Suite</Button></DialogFooter></DialogContent></Dialog>
  </main>
}
