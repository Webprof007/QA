import { EvidenceSection } from '@/components/evidence/EvidenceSection'
import { useEvidenceDraft } from '@/components/evidence/useEvidenceDraft'
import { OwnerEvidence } from '@/components/evidence/OwnerEvidence'
import type { SmokeState, EvidenceDraft } from '@/types'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { ProjectContextFields } from '@/components/project-setup/ProjectContextFields'
import { RetestContext } from './RetestContext'
import { retestHistory, retestResults, retestSource, type RetestInput } from '@/lib/defectRetests'
import type { Defect, DefectRetest, ProjectArea, ProjectSetupState, TestCase, TestCaseDictionaryValue, TestRunsState } from '@/types'
import { resultLabel } from '@/lib/domainLabels'
export type RetestAction = 'Open' | 'Ready for Retest' | 'Close Defect' | 'Reopen Defect'
export type RetestEvidenceAttachment = { draft: EvidenceDraft; file?: File }
export type RetestSaveResult = { saved: boolean; error?: string }
export type DefectRetestsProps = { autoStart?: boolean; smoke?: SmokeState; defect: Defect; retests: DefectRetest[]; setup: ProjectSetupState; cases: TestCase[]; runs: TestRunsState; areas: ProjectArea[]; types: TestCaseDictionaryValue[]; onSave: (input: RetestInput, attachments: RetestEvidenceAttachment[]) => Promise<RetestSaveResult>; onTransition: (action: RetestAction, retestId?: string) => Promise<string | null> }
type Draft = Omit<RetestInput, 'result'> & { result: RetestInput['result'] | '' }
export function DefectRetests({ autoStart = false, smoke, defect, retests, setup, cases, runs, areas, types, onSave, onTransition }: DefectRetestsProps) {
  const ready = defect.status === 'Ready for Retest'
  const [initial] = useState(() => {
    if (!autoStart || !ready) return { draft: null as Draft | null, context: {} as Pick<DefectRetest, 'testCaseSnapshot' | 'defectContextSnapshot'>, error: '' }
    try {
      return {
        draft: { environmentId: setup.environments.find(item => item.id === defect.environmentId && item.projectId === defect.projectId && item.isActive)?.id, buildId: setup.builds.find(item => item.id === defect.buildId && item.projectId === defect.projectId)?.id, result: '', actualResult: '', comment: '', evidenceNote: '' } as Draft,
        context: retestSource(defect, cases, runs, areas, types, retests, smoke),
        error: '',
      }
    } catch (cause) { return { draft: null as Draft | null, context: {}, error: cause instanceof Error ? cause.message : 'Контекст Retest недоступний.' } }
  })
  const [draft, setDraft] = useState<Draft | null>(initial.draft), [context, setContext] = useState<Pick<DefectRetest, 'testCaseSnapshot' | 'defectContextSnapshot'>>(initial.context)
  const [selectedId, setSelectedId] = useState(''), [error, setError] = useState(initial.error)
  const attachments = useEvidenceDraft({ projectId: defect.projectId, ownerType: 'defectRetest', ownerId: `draft-${defect.id}` })
  const history = retestHistory(retests, defect.projectId, defect.id), latest = history.at(-1), selected = history.find(item => item.id === selectedId)
  function start() {
    try {
      attachments.setItems([])
      setContext(retestSource(defect, cases, runs, areas, types, retests, smoke))
      setDraft({ environmentId: setup.environments.find(item => item.id === defect.environmentId && item.projectId === defect.projectId && item.isActive)?.id, buildId: setup.builds.find(item => item.id === defect.buildId && item.projectId === defect.projectId)?.id, result: '', actualResult: '', comment: '', evidenceNote: '' })
      setSelectedId(''); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Контекст Retest недоступний.') }
  }
  const transition = (action: RetestAction, id?: string) => { void onTransition(action, id).then(message => setError(message ?? '')).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося змінити статус.')) }
  return <section className="tc-section" aria-label="Retest History"><h3>Retest History</h3>
    {!draft && ready && <div className="tc-panel-actions"><Button type="button" aria-label="Retest" onClick={start}>Retest / Повторне тестування</Button></div>}
    {!draft && ready && latest && latest.executedAt >= defect.updatedAt && latest.result !== 'Blocked' && <div className="tc-section"><p>Latest Retest: {resultLabel(latest.result)}. Змініть статус дефекту, якщо підтверджуєте результат.</p><Button type="button" variant="outline" aria-label={latest.result === 'Pass' ? 'Close Defect' : 'Reopen Defect'} onClick={() => transition(latest.result === 'Pass' ? 'Close Defect' : 'Reopen Defect', latest.id)}>{latest.result === 'Pass' ? 'Close Defect / Закрити дефект' : 'Reopen Defect / Відкрити дефект повторно'}</Button></div>}
    {draft && <form className="tc-form" aria-label="Retest form" onSubmit={event => { event.preventDefault(); if (!draft.result) { setError('Виберіть результат Retest.'); return } void onSave({ ...draft, result: draft.result }, attachments.items.map(item => ({ draft: item, file: attachments.fileFor(item.id) }))).then(outcome => { if (outcome.saved) { setDraft(null); attachments.setItems([]) }; setError(outcome.error ?? '') }).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося зберегти Retest.')) }}>
      <h3>Retest</h3><p className="muted">Environment — обов’язкове. Build стосується цієї переперевірки, а не початкового incident.</p><div className="tc-field-pair"><ProjectContextFields projectId={defect.projectId} setup={setup} value={draft} onChange={value => setDraft({ ...draft, ...value })} /></div>
      <RetestContext value={context} />
      <div className="field"><label htmlFor="retest-result">Result</label><select id="retest-result" className="audit-select" required value={draft.result} onChange={event => setDraft({ ...draft, result: event.target.value as Draft['result'] })}><option value="">Select result</option>{retestResults.map(result => <option key={result} value={result}>{resultLabel(result)}</option>)}</select></div>
      {([['actualResult', 'Actual Result / Фактичний результат'], ['comment', 'Comment'], ['evidenceNote', 'Evidence note']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`retest-${key}`}>{label}</label><Textarea rows={3} id={`retest-${key}`} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></div>)}
      <EvidenceSection {...attachments.sectionProps} />
      <div className="tc-panel-actions"><Button type="submit" disabled={!ready || !draft.environmentId || !draft.result}>Save Retest</Button><Button type="button" variant="outline" onClick={() => { setDraft(null); attachments.setItems([]); setError('') }}>Cancel Retest</Button></div>
    </form>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {!history.length ? <p className="muted">No retests yet.</p> : <table className="tc-table" aria-label="Retests"><thead><tr>{['Retest', 'Build / Збірка', 'Environment / Середовище', 'Result', 'Executed by', 'Date'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{history.map((item, index) => <tr key={item.id} onClick={() => { if (!draft) setSelectedId(item.id) }}><td><button type="button" className="tc-open" disabled={!!draft} onClick={() => setSelectedId(item.id)}>Retest #{index + 1}</button></td><td>{item.buildVersionSnapshot || '—'}</td><td>{item.environmentNameSnapshot || '—'}</td><td>{resultLabel(item.result)}</td><td>{item.executedByUserId ?? '—'}</td><td>{new Date(item.executedAt).toLocaleString()}</td></tr>)}</tbody></table>}
    {!draft && selected && <section className="tc-section" aria-label="Retest details"><h3>Retest #{history.indexOf(selected) + 1}</h3><p>Result: {resultLabel(selected.result)}</p><p>Environment / Середовище: {selected.environmentNameSnapshot || '—'}</p><p>Build / Збірка: {selected.buildVersionSnapshot || '—'}</p><p>Executed by: {selected.executedByUserId ?? '—'}</p><p>Date: {new Date(selected.executedAt).toLocaleString()}</p><RetestContext value={selected} /><OwnerEvidence key={selected.id} owner={{ projectId: defect.projectId, ownerType: 'defectRetest', ownerId: selected.id }} />{([['actualResult', 'Actual Result / Фактичний результат'], ['comment', 'Comment'], ['evidenceNote', 'Evidence note']] as const).map(([key, label]) => <div key={label}><h4>{label}</h4><p>{selected[key] || '—'}</p></div>)}<Button variant="ghost" size="icon" type="button" aria-label="Close retest details" title="Close retest details" onClick={() => setSelectedId('')}><X /></Button></section>}
  </section>
}
