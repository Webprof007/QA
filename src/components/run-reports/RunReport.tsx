import { Button } from '@/components/ui/button'
import type { Defect, SmokeRun, TestRun } from '@/types'

type ExecutionRow = { id: string; testCaseSnapshot: { code: string; title: string }; result: string; defects: Defect[] }
type Summary = { total: number; done: number; remaining: number; counts: Record<string, number>; executions: ExecutionRow[] }
type Props = {
  kind: 'Test Run' | 'Smoke Run'; run: TestRun | SmokeRun; summary: Summary
  onBack: () => void; onExecution: (id: string) => void; onDefect: (id: string) => void
  testPlan?: string; sourceSuite?: string; prerequisites?: { total: number; checked: number; remaining: number; counts: Record<string, number>; items: { id: string; textSnapshot: string; result: string }[] }
}
const date = (value?: string | null) => value ? new Date(value).toLocaleString() : '—'

export function RunReport({ kind, run, summary, onBack, onExecution, onDefect, testPlan, sourceSuite, prerequisites }: Props) {
  const executionDefects = summary.executions.flatMap(row => row.defects)
  const uniqueDefects = executionDefects.filter((defect, index) => executionDefects.findIndex(item => item.id === defect.id) === index)
  return <section className="run-report" aria-label={`${kind} report`}>
    <div className="tc-toolbar"><h2>{kind} Report</h2><Button type="button" variant="outline" size="sm" onClick={onBack}>Back to Run</Button></div>
    <dl className="run-metadata">
      <div><dt>{kind}</dt><dd>{'name' in run ? run.name : `${run.suiteCodeSnapshot} — ${run.suiteNameSnapshot}`}</dd></div>
      <div><dt>Status</dt><dd>{run.status}</dd></div>
      <div><dt>Environment / Середовище</dt><dd>{run.environmentNameSnapshot || '—'}</dd></div>
      <div><dt>Build / Збірка</dt><dd>{run.buildVersionSnapshot || '—'}</dd></div>
      {testPlan !== undefined && <div><dt>Test Plan</dt><dd>{testPlan || '—'}</dd></div>}
      {sourceSuite !== undefined && <div><dt>Source Suite</dt><dd>{sourceSuite || '—'}</dd></div>}
      <div><dt>Created</dt><dd>{date(run.createdAt)}</dd></div>
      <div><dt>Started</dt><dd>{date(run.startedAt)}</dd></div>
      <div><dt>Completed</dt><dd>{date(run.completedAt)}</dd></div>
      {'createdByUserId' in run && <div><dt>Created by</dt><dd>{run.createdByUserId ?? '—'}</dd></div>}
    </dl>
    <section className="tc-section" aria-label="Report summary"><h3>Summary</h3><div className="tc-toolbar"><strong>Total: {summary.total}</strong><span>Completed: {summary.done}</span><span>Remaining: {summary.remaining}</span>{Object.entries(summary.counts).map(([result, count]) => <span key={result}>{result}: {count}</span>)}</div></section>
    {prerequisites && <section className="tc-section" aria-label="Prerequisites report"><h3>Prerequisites</h3><div className="tc-toolbar"><strong>Total: {prerequisites.total}</strong><span>Checked: {prerequisites.checked}</span><span>Remaining: {prerequisites.remaining}</span>{Object.entries(prerequisites.counts).map(([result, count]) => <span key={result}>{result}: {count}</span>)}</div>{prerequisites.total > 0 && <table className="tc-table"><thead><tr><th>Prerequisite</th><th>Result</th></tr></thead><tbody>{prerequisites.items.map(item => <tr key={item.id}><td>{item.textSnapshot}</td><td>{item.result}</td></tr>)}</tbody></table>}</section>}
    <section className="tc-section" aria-label="Report linked defects"><h3>Linked Defects</h3>{uniqueDefects.length ? <div className="tc-panel-actions">{uniqueDefects.map(defect => <Button key={defect.id} type="button" variant="link" onClick={() => onDefect(defect.id)}>{defect.code} — {defect.title}</Button>)}</div> : <p className="muted">No linked defects.</p>}</section>
    <section className="tc-section"><h3>Executions</h3><table className="tc-table" aria-label="Report executions"><thead><tr><th>Test Case</th><th>Title</th><th>Result</th><th>Defects</th></tr></thead><tbody>{summary.executions.map(row => <tr key={row.id}><td><Button type="button" variant="link" onClick={() => onExecution(row.id)}>{row.testCaseSnapshot.code}</Button></td><td>{row.testCaseSnapshot.title}</td><td>{row.result}</td><td>{row.defects.length ? row.defects.map(defect => <Button key={defect.id} type="button" variant="link" onClick={() => onDefect(defect.id)}>{defect.code}</Button>) : '—'}</td></tr>)}</tbody></table>{!summary.total && <p className="muted">No executions in this Run.</p>}</section>
  </section>
}
