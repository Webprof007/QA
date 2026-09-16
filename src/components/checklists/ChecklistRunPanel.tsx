import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import type { ChecklistRun, ChecklistRunItem } from '@/types'
export function ChecklistRunPanel({ run, onChange, onClose }: { run: ChecklistRun; onChange: (run: ChecklistRun) => void; onClose: () => void }) {
  const completed = run.status === 'Completed'
  const count = run.items.filter(item => item.result !== 'Not Run').length
  function update(id: string, patch: Partial<ChecklistRunItem>) {
    if (!completed) onChange({ ...run, items: run.items.map(item => item.id === id ? { ...item, ...patch } : item) })
  }
  return <aside className="tc-panel" aria-label="Checklist run"><div className="panel-heading"><h2>{run.titleSnapshot}</h2><Button variant="ghost" size="icon" aria-label="Close run" title="Close run" onClick={onClose}><X /></Button></div>
    <div className="tc-form"><p className="test-id">{run.id}</p><p>Status: {run.status}</p><p>Started at: {new Date(run.startedAt).toLocaleString()}</p><p>Progress: {count} / {run.items.length}</p>{run.completedAt && <p>Completed at: {new Date(run.completedAt).toLocaleString()}</p>}
      {run.items.map((item, index) => <section className="tc-section checklist-run-item" key={item.id}><h3>{index + 1}. {item.textSnapshot}</h3>
        <div className="field"><label htmlFor={`result-${item.id}`}>Result {index + 1}</label>{completed ? <p>{item.result}</p> : <select id={`result-${item.id}`} className="audit-select" value={item.result} onChange={event => update(item.id, { result: event.target.value as ChecklistRunItem['result'] })}>{['Not Run', 'Pass', 'Fail', 'Blocked', 'N/A'].map(value => <option key={value}>{value}</option>)}</select>}</div>
        <div className="field"><label htmlFor={`comment-${item.id}`}>Comment {index + 1}</label>{completed ? <p>{item.comment || '—'}</p> : <Textarea id={`comment-${item.id}`} rows={2} value={item.comment} onChange={event => update(item.id, { comment: event.target.value })} />}</div>
      </section>)}
      {!completed && <Button onClick={() => onChange({ ...run, status: 'Completed', completedAt: new Date().toISOString() })}>Complete Run</Button>}
    </div>
  </aside>
}
