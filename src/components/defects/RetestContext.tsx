import { RichText } from '@/components/rich-text/RichText'
import type { DefectRetest } from '@/types'
import { priorityLabel } from '@/lib/domainLabels'
export function RetestContext({ value }: { value: Pick<DefectRetest, 'testCaseSnapshot' | 'defectContextSnapshot'> }) {
  const snapshot = value.testCaseSnapshot, fallback = value.defectContextSnapshot
  return <section className="tc-section" aria-label="Retest context">{snapshot ? <>
    <h3>{snapshot.code} — {snapshot.title}</h3>
    <dl className="tc-field-pair">{[['Area', snapshot.areaName], ['Priority', priorityLabel(snapshot.priority)], ['Type', snapshot.typeName], ['Status', snapshot.status]].map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text || '—'}</dd></div>)}</dl>
    <h4>Preconditions / Передумови</h4><ol>{snapshot.preconditions.map((text, index) => <li key={index}><RichText value={text} /></li>)}</ol>
    <h4>Steps</h4>{[...snapshot.steps].sort((a, b) => a.sortOrder - b.sortOrder).map((step, index) => <div className="tc-step" key={step.id}><h4>Step {index + 1}</h4><h5>Action</h5><RichText value={step.action} /><h5>Expected / Очікуваний результат</h5><RichText value={step.expectedResult} /></div>)}
    <h4>Postconditions</h4><ol>{snapshot.postconditions?.map((text, index) => <li key={index}><RichText value={text} /></li>)}</ol><h4>Notes</h4><RichText value={snapshot.notes || '—'} />
  </> : fallback ? <><h3>{fallback.title}</h3>{([['stepsToReproduce', 'Steps to reproduce / Кроки відтворення'], ['expectedResult', 'Expected result / Очікуваний результат'], ['actualResult', 'Original Actual Result / Початковий фактичний результат']] as const).map(([key, label]) => <div key={key}><h4>{label}</h4><p>{fallback[key] || '—'}</p></div>)}</> : <p>Контекст недоступний.</p>}</section>
}
