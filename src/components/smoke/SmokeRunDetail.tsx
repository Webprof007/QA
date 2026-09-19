import { SourceDefects } from '@/components/defects/SourceDefects'
import { OwnerEvidence } from '@/components/evidence/OwnerEvidence'
import { useRef, useState } from 'react'
import { AccountBackButton } from '@/components/AccountBackButton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ExecutionPanel } from '@/components/test-runs/ExecutionPanel'
import { type SmokeExecutionInput } from '@/lib/smoke'
import { runCounts, executionResults } from '@/lib/testRuns'
import { smokeRunReport } from '@/lib/runReports'
import { RunReport } from '@/components/run-reports/RunReport'
import { useDefectContext } from '@/components/defects/defectContext'
import type { SmokeExecution, SmokeRun, SmokeRunPrerequisite, SmokeState } from '@/types'
import { priorityLabel, resultLabel } from '@/lib/domainLabels'
import { ResultBadge } from '@/components/DomainBadge'
const date = (value?: string) => value ? new Date(value).toLocaleString() : '—'
export function SmokeRunDetail({ run, data, onRunStatus, onExecutionSave, onPrerequisiteSave, onBack, initialExecutionId }: { initialExecutionId?: string; run: SmokeRun; data: SmokeState; onRunStatus: (status: SmokeRun['status']) => Promise<void>; onExecutionSave: (id: string, input: SmokeExecutionInput) => Promise<SmokeExecution>; onPrerequisiteSave: (item: SmokeRunPrerequisite) => Promise<void>; onBack: () => void }) {
  const context = useDefectContext()
  const [selectedId, setSelectedId] = useState(initialExecutionId ?? ''), [draft, setDraft] = useState<SmokeExecutionInput | null>(null), [confirm, setConfirm] = useState(false), [reportOpen, setReportOpen] = useState(false), [error, setError] = useState('')
  const prerequisiteDrafts = useRef(new Map<string, SmokeRunPrerequisite>())
  const prerequisiteQueues = useRef(new Map<string, Promise<void>>())
  const executions = data.executions.filter(item => item.projectId === run.projectId && item.runId === run.id).sort((a, b) => a.order - b.order)
  const prerequisites = data.runPrerequisites.filter(item => item.projectId === run.projectId && item.runId === run.id).sort((a, b) => a.order - b.order)
  const execution = executions.find(item => item.id === selectedId), index = executions.findIndex(item => item.id === selectedId)
  const stats = runCounts(executions), unchecked = prerequisites.filter(item => item.result === 'Not Checked').length, completed = run.status === 'Completed'
  const complete = () => { void Promise.all(prerequisiteQueues.current.values()).then(() => onRunStatus('Completed')).then(() => setConfirm(false)).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося завершити Smoke Run.')) }
  const select = (id: string) => { if (!draft) setSelectedId(id) }
  function prerequisite(item: SmokeRunPrerequisite, patch: Partial<Pick<SmokeRunPrerequisite, 'result' | 'comment'>>) {
    const next = { ...(prerequisiteDrafts.current.get(item.id) ?? item), ...patch }
    prerequisiteDrafts.current.set(item.id, next)
    const queued = (prerequisiteQueues.current.get(item.id) ?? Promise.resolve())
      .then(() => onPrerequisiteSave(next))
      .catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося зберегти prerequisite.'))
    prerequisiteQueues.current.set(item.id, queued)
  }
  const report = smokeRunReport(data, context.state, run.projectId, run)
  if (reportOpen) return <><AccountBackButton onClick={() => setReportOpen(false)}>← Smoke Suite</AccountBackButton><RunReport kind="Smoke Run" run={run} summary={report} prerequisites={report.prerequisites} onBack={() => setReportOpen(false)} onExecution={id => { setSelectedId(id); setReportOpen(false) }} onDefect={context.view} /></>
  return <>
    <AccountBackButton disabled={!!draft} onClick={onBack}>← Smoke Suite</AccountBackButton>
    <div className="tc-toolbar"><p className="test-id">{run.suiteCodeSnapshot}</p><h2>{run.suiteNameSnapshot}</h2><span>{run.status}</span><Button type="button" variant="outline" size="sm" disabled={!!draft} onClick={() => setReportOpen(true)}>View Report</Button>{!completed && <>{run.status === 'Draft' && <Button aria-label="Start Run" variant="outline" disabled={!!draft} onClick={() => void onRunStatus('In Progress').catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося почати Smoke Run.'))}>Start Run / Почати запуск</Button>}<Button aria-label="Complete Run" disabled={!!draft} onClick={() => stats.counts['Not Run'] || unchecked ? setConfirm(true) : complete()}>Complete Run / Завершити запуск</Button></>}</div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <dl className="run-metadata">{[['Environment / Середовище', run.environmentNameSnapshot], ['Build / Збірка', run.buildVersionSnapshot], ['Browser', run.browser], ['Device / OS', run.deviceOrOs], ['Started', date(run.startedAt)], ['Completed', date(run.completedAt)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
    {run.notes && <p className="run-notes">{run.notes}</p>}
    <div className="tc-toolbar" aria-label="Smoke progress"><strong>Progress: {stats.done} / {stats.total}</strong>{executionResults.map(result => <ResultBadge key={result} value={result} count={stats.counts[result]} />)}</div>
    {confirm && !completed && <div role="alert" className="tc-section"><p>{stats.counts['Not Run']} Test Cases залишаються Not Run. {unchecked} prerequisites залишаються Not Checked. Завершити запуск?</p><div className="tc-panel-actions"><Button onClick={complete}>Завершити все одно</Button><Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button></div></div>}
    <div className={`tc-layout ${execution ? 'tc-with-panel' : ''}`}><div className="tc-list">
      <section className="tc-section smoke-run-prerequisites" aria-label="Run prerequisites"><h3>Prerequisites</h3>{prerequisites.map((item, position) => <div key={item.id} className="tc-step"><p>{item.textSnapshot}</p>{completed ? <><ResultBadge value={item.result} /><p>{item.comment || '—'}</p></> : <div className="tc-field-pair"><div className="field"><label htmlFor={`smoke-prerequisite-result-${item.id}`}>Prerequisite result {position + 1}</label><select id={`smoke-prerequisite-result-${item.id}`} className="audit-select" value={item.result} onChange={event => prerequisite(item, { result: event.target.value as SmokeRunPrerequisite['result'] })}>{['Not Checked', 'Pass', 'Fail'].map(value => <option key={value} value={value}>{resultLabel(value)}</option>)}</select></div><div className="field"><label htmlFor={`smoke-prerequisite-comment-${item.id}`}>Prerequisite comment {position + 1}</label><Textarea id={`smoke-prerequisite-comment-${item.id}`} rows={2} value={item.comment} onChange={event => prerequisite(item, { comment: event.target.value })} /></div></div>}</div>)}{!prerequisites.length && <p className="muted">Prerequisites не визначено.</p>}</section>
      <h3>Smoke Tests</h3><table className="tc-table" aria-label="Smoke executions"><thead><tr>{['Test Case', 'Title', 'Area', 'Priority', 'Result'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{executions.map(item => <tr key={item.id} className={item.id === selectedId ? 'tc-selected' : ''} onClick={() => select(item.id)}><td><button className="tc-open" disabled={!!draft} onClick={() => select(item.id)}>{item.testCaseSnapshot.code}</button></td><td>{item.testCaseSnapshot.title}</td><td>{item.testCaseSnapshot.areaName || '—'}</td><td>{priorityLabel(item.testCaseSnapshot.priority)}</td><td><ResultBadge value={item.result} /></td></tr>)}</tbody></table>
    </div>{execution && <ExecutionPanel footer={<SourceDefects key={"defects-" + execution.id} projectId={run.projectId} source={{ type: "smokeExecution", id: execution.id }} disabled={!!draft} />} evidence={<OwnerEvidence key={execution.id} owner={{ projectId: run.projectId, ownerType: 'smokeExecution', ownerId: execution.id }} />} execution={execution} draft={draft} readOnly={completed} onChange={setDraft} onSave={() => { void onExecutionSave(execution.id, draft ?? execution).then(() => { setDraft(null); setError('') }).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося зберегти Smoke result.')) }} onCancel={() => setDraft(null)} onClose={() => setSelectedId('')} onPrevious={() => select(executions[index - 1].id)} onNext={() => select(executions[index + 1].id)} first={index === 0} last={index + 1 === executions.length} />}</div>
  </>
}
