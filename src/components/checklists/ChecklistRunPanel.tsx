import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { useRef, useState } from 'react'
import type { ChecklistRun, ChecklistRunItem } from '@/types'
import { resultLabel } from '@/lib/domainLabels'
import { ResultBadge } from '@/components/DomainBadge'
export function ChecklistRunPanel({ run, onItemSave, onComplete, onClose }: { run: ChecklistRun; onItemSave: (item: ChecklistRunItem) => Promise<void>; onComplete: () => Promise<void>; onClose: () => void }) {
  const completed = run.status === 'Completed'
  const count = run.items.filter(item => item.result !== 'Not Run').length
  const drafts = useRef(new Map<string, ChecklistRunItem>())
  const queues = useRef(new Map<string, Promise<void>>())
  const [error, setError] = useState('')
  function update(id: string, patch: Partial<ChecklistRunItem>) {
    const item = run.items.find(value => value.id === id)
    if (!completed && item) {
      const next = { ...(drafts.current.get(id) ?? item), ...patch }
      drafts.current.set(id, next)
      const queued = (queues.current.get(id) ?? Promise.resolve()).then(() => onItemSave(next)).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося зберегти результат.'))
      queues.current.set(id, queued)
    }
  }
  const flush = () => Promise.all(queues.current.values())
  return <aside className="tc-panel" aria-label="Checklist run"><div className="panel-heading"><h2>{run.titleSnapshot}</h2><Button variant="ghost" size="icon" aria-label="Close run" title="Close run" onClick={() => void flush().then(onClose)}><X /></Button></div>
    <div className="tc-form"><p className="test-id">{run.id}</p><p>Status: {run.status}</p><p>Started at: {new Date(run.startedAt).toLocaleString()}</p><p>Progress: {count} / {run.items.length}</p>{run.completedAt && <p>Completed at: {new Date(run.completedAt).toLocaleString()}</p>}
      {run.items.map((item, index) => <section className="tc-section checklist-run-item" key={item.id}><h3>{index + 1}. {item.textSnapshot}</h3>
        <div className="field"><label htmlFor={`result-${item.id}`}>Result {index + 1}</label>{completed ? <ResultBadge value={item.result} /> : <select id={`result-${item.id}`} className="audit-select" value={item.result} onChange={event => update(item.id, { result: event.target.value as ChecklistRunItem['result'] })}>{['Not Run', 'Pass', 'Fail', 'Blocked', 'N/A'].map(value => <option key={value} value={value}>{resultLabel(value)}</option>)}</select>}</div>
        <div className="field"><label htmlFor={`comment-${item.id}`}>Comment {index + 1}</label>{completed ? <p>{item.comment || '—'}</p> : <Textarea id={`comment-${item.id}`} rows={2} value={item.comment} onChange={event => update(item.id, { comment: event.target.value })} />}</div>
      </section>)}
      {error && <p role="alert" className="form-error">{error}</p>}
      {!completed && <Button aria-label="Complete Run" onClick={() => void flush().then(onComplete).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося завершити Run.'))}>Complete Run / Завершити запуск</Button>}
    </div>
  </aside>
}
