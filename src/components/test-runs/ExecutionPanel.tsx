import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RichText } from '@/components/rich-text/RichText'
import { executionResults, type ExecutionInput } from '@/lib/testRuns'
import type { TestCaseSnapshot, TestExecutionResult } from '@/types'
// Presentation contract shared by TestRun and SmokeRun; neither owns the other's state.
export type ExecutionView = { id: string; testCaseSnapshot: TestCaseSnapshot; result: TestExecutionResult; actualResult: string; comment: string; evidenceNote: string; executedAt?: string; executedByUserId?: number }
export type ExecutionPanelProps = {
  execution: ExecutionView; draft: ExecutionInput | null; readOnly: boolean; onChange: (input: ExecutionInput) => void
  onSave: () => void; onCancel: () => void; onClose: () => void; onPrevious: () => void; onNext: () => void; first: boolean; last: boolean
  footer?: ReactNode
}
export function ExecutionPanel({ execution, draft, readOnly, onChange, onSave, onCancel, onClose, onPrevious, onNext, first, last, footer }: ExecutionPanelProps) {
  const snapshot = execution.testCaseSnapshot, input = draft ?? execution
  return <aside className="tc-panel" aria-label="Execution panel"><div className="panel-heading"><div><p className="test-id">{snapshot.code}</p><h2>{snapshot.title}</h2></div><Button variant="ghost" disabled={!!draft} onClick={onClose}>Close execution</Button></div>
    <div className="tc-form"><div className="tc-panel-actions"><Button variant="outline" disabled={first || !!draft} onClick={onPrevious}>Previous</Button><Button variant="outline" disabled={last || !!draft} onClick={onNext}>Next</Button></div>
      <dl className="tc-field-pair">{[['Area', snapshot.areaName], ['Priority', snapshot.priority], ['Type', snapshot.typeName], ['Status', snapshot.status]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
      <section className="tc-section"><h3>Preconditions / Передумови</h3>{snapshot.preconditions.length ? <ol>{snapshot.preconditions.map((value, index) => <li key={index}><RichText value={value} /></li>)}</ol> : <p>—</p>}</section>
      <section className="tc-section"><h3>Steps</h3>{[...snapshot.steps].sort((a, b) => a.sortOrder - b.sortOrder).map((step, index) => <div className="tc-step" key={step.id}><h4>Step {index + 1}</h4><h5>Action</h5><RichText value={step.action} /><h5>Expected / Очікуваний результат</h5><RichText value={step.expectedResult} /></div>)}</section>
      <section className="tc-section"><h3>Postconditions</h3>{snapshot.postconditions?.length ? <ol>{snapshot.postconditions.map((value, index) => <li key={index}><RichText value={value} /></li>)}</ol> : <p>—</p>}</section>
      <section className="tc-section"><h3>Notes</h3><RichText value={snapshot.notes || '—'} /></section>
      <form className="tc-form" onSubmit={event => { event.preventDefault(); if (!readOnly) onSave() }}>
        <div className="field"><label htmlFor="execution-result">Result</label>{readOnly ? <p>{execution.result}</p> : <select id="execution-result" className="audit-select" value={input.result} onChange={event => onChange({ ...input, result: event.target.value as ExecutionView['result'] })}>{executionResults.map(value => <option key={value}>{value}</option>)}</select>}</div>
        {([['actualResult', 'Actual Result / Фактичний результат'], ['comment', 'Comment'], ['evidenceNote', 'Evidence note']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`execution-${key}`}>{label}</label>{readOnly ? <p>{execution[key] || '—'}</p> : <Textarea id={`execution-${key}`} rows={3} value={input[key]} onChange={event => onChange({ ...input, [key]: event.target.value })} />}</div>)}
        <p>Executed at: {execution.executedAt ? new Date(execution.executedAt).toLocaleString() : '—'}</p><p>Executed by: {execution.executedByUserId ?? '—'}</p>
        {!readOnly && <div className="tc-panel-actions"><Button type="submit">Save result</Button>{draft && <Button type="button" variant="outline" onClick={onCancel}>Cancel changes</Button>}</div>}
        {draft && <p className="muted">Збережіть або скасуйте зміни перед переходом до іншого тесту.</p>}
      </form>
      {footer}
    </div>
  </aside>
}
