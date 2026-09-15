import { useState, type Dispatch, type SetStateAction } from 'react'
import { AccountBackButton } from '@/components/AccountBackButton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ExecutionPanel } from '@/components/test-runs/ExecutionPanel'
import { changeSmokeRunStatus, saveSmokeExecution, saveSmokeRunPrerequisite, type SmokeExecutionInput } from '@/lib/smoke'
import { runCounts, executionResults } from '@/lib/testRuns'
import type { SmokeRun, SmokeRunPrerequisite, SmokeState } from '@/types'
const date = (value?: string) => value ? new Date(value).toLocaleString() : '—'
export function SmokeRunDetail({ run, data, userId, onChange, onBack }: { run: SmokeRun; data: SmokeState; userId?: number; onChange: Dispatch<SetStateAction<SmokeState>>; onBack: () => void }) {
  const [selectedId, setSelectedId] = useState(''), [draft, setDraft] = useState<SmokeExecutionInput | null>(null), [confirm, setConfirm] = useState(false)
  const executions = data.executions.filter(item => item.projectId === run.projectId && item.runId === run.id).sort((a, b) => a.order - b.order)
  const prerequisites = data.runPrerequisites.filter(item => item.projectId === run.projectId && item.runId === run.id).sort((a, b) => a.order - b.order)
  const execution = executions.find(item => item.id === selectedId), index = executions.findIndex(item => item.id === selectedId)
  const stats = runCounts(executions), unchecked = prerequisites.filter(item => item.result === 'Not Checked').length, completed = run.status === 'Completed'
  const complete = () => { onChange(current => changeSmokeRunStatus(current, run.projectId, run.id, 'Completed')); setConfirm(false) }
  const select = (id: string) => { if (!draft) setSelectedId(id) }
  function prerequisite(item: SmokeRunPrerequisite, patch: Partial<Pick<SmokeRunPrerequisite, 'result' | 'comment'>>) { onChange(current => saveSmokeRunPrerequisite(current, run.projectId, item.id, { ...item, ...patch })) }
  return <>
    <AccountBackButton disabled={!!draft} onClick={onBack}>← Smoke Suite</AccountBackButton>
    <div className="tc-toolbar"><p className="test-id">{run.suiteCodeSnapshot}</p><h2>{run.suiteNameSnapshot}</h2><span>{run.status}</span>{!completed && <>{run.status === 'Draft' && <Button variant="outline" disabled={!!draft} onClick={() => onChange(current => changeSmokeRunStatus(current, run.projectId, run.id, 'In Progress'))}>Start Run</Button>}<Button disabled={!!draft} onClick={() => stats.counts['Not Run'] || unchecked ? setConfirm(true) : complete()}>Complete Run</Button></>}</div>
    <dl className="run-metadata">{[['Environment / Середовище', run.environment], ['Build / Збірка', run.build], ['Browser', run.browser], ['Device / OS', run.deviceOrOs], ['Started', date(run.startedAt)], ['Completed', date(run.completedAt)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
    {run.notes && <p className="run-notes">{run.notes}</p>}
    <div className="tc-toolbar" aria-label="Smoke progress"><strong>Progress: {stats.done} / {stats.total}</strong>{executionResults.map(result => <span key={result}>{result}: {stats.counts[result]}</span>)}</div>
    {confirm && !completed && <div role="alert" className="tc-section"><p>{stats.counts['Not Run']} Test Cases залишаються Not Run. {unchecked} prerequisites залишаються Not Checked. Завершити запуск?</p><div className="tc-panel-actions"><Button onClick={complete}>Завершити все одно</Button><Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button></div></div>}
    <div className={`tc-layout ${execution ? 'tc-with-panel' : ''}`}><div className="tc-list">
      <section className="tc-section smoke-run-prerequisites" aria-label="Run prerequisites"><h3>Prerequisites</h3>{prerequisites.map((item, position) => <div key={item.id} className="tc-step"><p>{item.textSnapshot}</p>{completed ? <><p>{item.result}</p><p>{item.comment || '—'}</p></> : <div className="tc-field-pair"><div className="field"><label htmlFor={`smoke-prerequisite-result-${item.id}`}>Prerequisite result {position + 1}</label><select id={`smoke-prerequisite-result-${item.id}`} className="audit-select" value={item.result} onChange={event => prerequisite(item, { result: event.target.value as SmokeRunPrerequisite['result'] })}>{['Not Checked', 'Pass', 'Fail'].map(value => <option key={value}>{value}</option>)}</select></div><div className="field"><label htmlFor={`smoke-prerequisite-comment-${item.id}`}>Prerequisite comment {position + 1}</label><Textarea id={`smoke-prerequisite-comment-${item.id}`} rows={2} value={item.comment} onChange={event => prerequisite(item, { comment: event.target.value })} /></div></div>}</div>)}{!prerequisites.length && <p className="muted">Prerequisites не визначено.</p>}</section>
      <h3>Smoke Tests</h3><table className="tc-table" aria-label="Smoke executions"><thead><tr>{['Test Case', 'Title', 'Area', 'Priority', 'Result'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{executions.map(item => <tr key={item.id} className={item.id === selectedId ? 'tc-selected' : ''} onClick={() => select(item.id)}><td><button className="tc-open" disabled={!!draft} onClick={() => select(item.id)}>{item.testCaseSnapshot.code}</button></td><td>{item.testCaseSnapshot.title}</td><td>{item.testCaseSnapshot.areaName || '—'}</td><td>{item.testCaseSnapshot.priority}</td><td>{item.result}</td></tr>)}</tbody></table>
    </div>{execution && <ExecutionPanel execution={execution} draft={draft} readOnly={completed} onChange={setDraft} onSave={() => { onChange(current => saveSmokeExecution(current, run.projectId, execution.id, draft ?? execution, userId)); setDraft(null) }} onCancel={() => setDraft(null)} onClose={() => setSelectedId('')} onPrevious={() => select(executions[index - 1].id)} onNext={() => select(executions[index + 1].id)} first={index === 0} last={index + 1 === executions.length} />}</div>
  </>
}
