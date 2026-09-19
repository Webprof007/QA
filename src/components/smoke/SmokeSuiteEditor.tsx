import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TestCaseLinkPicker } from '@/components/requirements/TestCaseLinkPicker'
import { moveItem } from '@/components/test-cases/testCaseOptions'
import type { ProjectArea, TestCase, TestCaseDictionaryValue } from '@/types'
import type { SmokeSuiteInput } from '@/lib/smoke'

type Props = { initial: SmokeSuiteInput; code: string; cases: TestCase[]; areas: ProjectArea[]; types: TestCaseDictionaryValue[]; onSave: (input: SmokeSuiteInput) => Promise<string | null>; onCancel: () => void }
export function SmokeSuiteEditor({ initial, code, cases, areas, types, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(() => structuredClone(initial))
  const [picker, setPicker] = useState(false), [error, setError] = useState('')
  const orderButtons = (index: number, count: number, label: string, move: (direction: number) => void, remove: () => void) => <div className="tc-order"><Button type="button" variant="ghost" size="sm" disabled={index === 0} aria-label={`Move ${label} up`} onClick={() => move(-1)}>↑</Button><Button type="button" variant="ghost" size="sm" disabled={index + 1 === count} aria-label={`Move ${label} down`} onClick={() => move(1)}>↓</Button><Button type="button" variant="ghost" size="sm" aria-label={`Remove ${label}`} onClick={remove}>Remove</Button></div>
  return <aside className="tc-panel" aria-label="Smoke suite editor"><div className="panel-heading"><div><p className="test-id">{code}</p><h2>Smoke Suite</h2></div><Button variant="ghost" size="icon" aria-label="Close suite editor" title="Close suite editor" onClick={onCancel}><X /></Button></div>
    <form className="tc-form" onSubmit={event => { event.preventDefault(); void onSave(draft).then(message => setError(message ?? '')).catch(cause => setError(cause instanceof Error ? cause.message : 'Не вдалося зберегти Suite.')) }}>
      <div className="field"><label htmlFor="smoke-name">Name</label><Input id="smoke-name" required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></div>
      <div className="field"><label htmlFor="smoke-description">Description</label><Textarea id="smoke-description" rows={3} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></div>
      <section className="tc-section"><h3>Prerequisites</h3>{draft.prerequisites.map((item, index) => <div key={item.id}><label htmlFor={`prerequisite-${item.id}`}>Prerequisite {index + 1}</label><Textarea id={`prerequisite-${item.id}`} rows={2} value={item.text} onChange={event => setDraft({ ...draft, prerequisites: draft.prerequisites.map(value => value.id === item.id ? { ...value, text: event.target.value } : value) })} />{orderButtons(index, draft.prerequisites.length, `prerequisite ${index + 1}`, direction => setDraft({ ...draft, prerequisites: moveItem(draft.prerequisites, index, direction) }), () => setDraft({ ...draft, prerequisites: draft.prerequisites.filter(value => value.id !== item.id) }))}</div>)}<Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, prerequisites: [...draft.prerequisites, { id: crypto.randomUUID(), text: '' }] })}>Add prerequisite</Button></section>
      <section className="tc-section"><h3>Test Cases</h3><ol aria-label="Selected smoke cases">{draft.testCaseIds.map((id, index) => { const test = cases.find(item => item.id === id); return <li key={id}><span>{test ? `${test.code} — ${test.title}` : 'Недоступний Test Case'}</span>{orderButtons(index, draft.testCaseIds.length, `test case ${index + 1}`, direction => setDraft({ ...draft, testCaseIds: moveItem(draft.testCaseIds, index, direction) }), () => setDraft({ ...draft, testCaseIds: draft.testCaseIds.filter(value => value !== id) }))}</li> })}</ol><Button type="button" variant="outline" size="sm" onClick={() => setPicker(true)}>Select Test Cases</Button></section>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="tc-panel-actions"><Button type="submit">Save Suite</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
    </form>
    {picker && <TestCaseLinkPicker testCases={cases} areas={areas} types={types} selectedIds={draft.testCaseIds} onClose={() => setPicker(false)} onApply={ids => { setDraft({ ...draft, testCaseIds: [...draft.testCaseIds.filter(id => ids.includes(id)), ...ids.filter(id => !draft.testCaseIds.includes(id))] }); setPicker(false) }} />}
  </aside>
}
