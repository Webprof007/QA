import { EvidenceSection } from '@/components/evidence/EvidenceSection'
import { useEvidenceDraft } from '@/components/evidence/useEvidenceDraft'
import { OwnerEvidence } from '@/components/evidence/OwnerEvidence'
import type { SmokeState, EvidenceDraft } from '@/types'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ProjectContextFields } from '@/components/project-setup/ProjectContextFields'
import { RetestContext } from './RetestContext'
import { retestHistory, retestResults, retestSource, type RetestInput } from '@/lib/defectRetests'
import type { Defect, DefectRetest, ProjectArea, ProjectSetupState, TestCase, TestCaseDictionaryValue, TestRunsState } from '@/types'
export type RetestAction = 'Open' | 'Ready for Retest' | 'Close Defect' | 'Reopen Defect'
export type DefectRetestsProps = { smoke?: SmokeState; defect: Defect; retests: DefectRetest[]; setup: ProjectSetupState; cases: TestCase[]; runs: TestRunsState; areas: ProjectArea[]; types: TestCaseDictionaryValue[]; onSave: (input: RetestInput, attachments: EvidenceDraft[]) => string | null; onTransition: (action: RetestAction, retestId?: string) => string | null }
type Draft = Omit<RetestInput, 'result'> & { result: RetestInput['result'] | '' }
export function DefectRetests({ smoke, defect, retests, setup, cases, runs, areas, types, onSave, onTransition }: DefectRetestsProps) {
  const [draft, setDraft] = useState<Draft | null>(null), [context, setContext] = useState<Pick<DefectRetest, 'testCaseSnapshot' | 'defectContextSnapshot'>>({})
  const [selectedId, setSelectedId] = useState(''), [error, setError] = useState('')
  const attachments = useEvidenceDraft({ projectId: defect.projectId, ownerType: 'defectRetest', ownerId: `draft-${defect.id}` })
  const history = retestHistory(retests, defect.projectId, defect.id), latest = history.at(-1), selected = history.find(item => item.id === selectedId)
  const ready = defect.status === 'Ready for Retest'
  function start() {
    try {
      attachments.setItems([])
      setContext(retestSource(defect, cases, runs, areas, types, retests, smoke))
      setDraft({ environmentId: setup.environments.find(item => item.id === defect.environmentId && item.projectId === defect.projectId && item.isActive)?.id, buildId: setup.builds.find(item => item.id === defect.buildId && item.projectId === defect.projectId)?.id, result: '', actualResult: '', comment: '', evidenceNote: '' })
      setSelectedId(''); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Контекст Retest недоступний.') }
  }
  const transition = (action: RetestAction, id?: string) => { setError(onTransition(action, id) ?? '') }
  return <section className="tc-section" aria-label="Retest History"><h3>Retest History</h3>
    {!draft && <div className="tc-panel-actions">{defect.status === 'New' && <Button type="button" variant="outline" onClick={() => transition('Open')}>Open Defect</Button>}{['Open', 'In Progress'].includes(defect.status) && <Button type="button" variant="outline" onClick={() => transition('Ready for Retest')}>Mark Ready for Retest</Button>}{ready && <Button type="button" onClick={start}>Retest</Button>}</div>}
    {!draft && ready && latest && latest.executedAt >= defect.updatedAt && latest.result !== 'Blocked' && <div className="tc-section"><p>Latest Retest: {latest.result}. Змініть статус дефекту, якщо підтверджуєте результат.</p><Button type="button" variant="outline" onClick={() => transition(latest.result === 'Pass' ? 'Close Defect' : 'Reopen Defect', latest.id)}>{latest.result === 'Pass' ? 'Close Defect' : 'Reopen Defect'}</Button></div>}
    {draft && <form className="tc-form" aria-label="Retest form" onSubmit={event => { event.preventDefault(); if (!draft.result) { setError('Виберіть результат Retest.'); return } const message = onSave({ ...draft, result: draft.result }, attachments.items); if (message) setError(message); else { setDraft(null); attachments.setItems([]); setError('') } }}>
      <h3>Retest</h3><p className="muted">Environment — обов’язкове. Build стосується цієї переперевірки, а не початкового incident.</p><div className="tc-field-pair"><ProjectContextFields projectId={defect.projectId} setup={setup} value={draft} onChange={value => setDraft({ ...draft, ...value })} /></div>
      <RetestContext value={context} />
      <div className="field"><label htmlFor="retest-result">Result</label><select id="retest-result" className="audit-select" required value={draft.result} onChange={event => setDraft({ ...draft, result: event.target.value as Draft['result'] })}><option value="">Select result</option>{retestResults.map(result => <option key={result}>{result}</option>)}</select></div>
      {([['actualResult', 'Actual Result / Фактичний результат'], ['comment', 'Comment'], ['evidenceNote', 'Evidence note']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`retest-${key}`}>{label}</label><Textarea rows={3} id={`retest-${key}`} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></div>)}
      <EvidenceSection {...attachments.sectionProps} />
      <div className="tc-panel-actions"><Button type="submit" disabled={!ready || !draft.environmentId || !draft.result}>Save Retest</Button><Button type="button" variant="outline" onClick={() => { setDraft(null); attachments.setItems([]); setError('') }}>Cancel Retest</Button></div>
    </form>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {!history.length ? <p className="muted">No retests yet.</p> : <table className="tc-table" aria-label="Retests"><thead><tr>{['Retest', 'Build / Збірка', 'Environment / Середовище', 'Result', 'Executed by', 'Date'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{history.map((item, index) => <tr key={item.id} onClick={() => { if (!draft) setSelectedId(item.id) }}><td><button type="button" className="tc-open" disabled={!!draft} onClick={() => setSelectedId(item.id)}>Retest #{index + 1}</button></td><td>{item.buildVersionSnapshot || '—'}</td><td>{item.environmentNameSnapshot || '—'}</td><td>{item.result}</td><td>{item.executedByUserId ?? '—'}</td><td>{new Date(item.executedAt).toLocaleString()}</td></tr>)}</tbody></table>}
    {!draft && selected && <section className="tc-section" aria-label="Retest details"><h3>Retest #{history.indexOf(selected) + 1}</h3><p>Result: {selected.result}</p><p>Environment / Середовище: {selected.environmentNameSnapshot || '—'}</p><p>Build / Збірка: {selected.buildVersionSnapshot || '—'}</p><p>Executed by: {selected.executedByUserId ?? '—'}</p><p>Date: {new Date(selected.executedAt).toLocaleString()}</p><RetestContext value={selected} /><OwnerEvidence key={selected.id} owner={{ projectId: defect.projectId, ownerType: 'defectRetest', ownerId: selected.id }} />{([['actualResult', 'Actual Result / Фактичний результат'], ['comment', 'Comment'], ['evidenceNote', 'Evidence note']] as const).map(([key, label]) => <div key={key}><h4>{label}</h4><p>{selected[key] || '—'}</p></div>)}<Button variant="ghost" type="button" onClick={() => setSelectedId('')}>Close retest details</Button></section>}
  </section>
}
