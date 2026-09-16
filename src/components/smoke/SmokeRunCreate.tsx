import { ProjectContextFields } from '@/components/project-setup/ProjectContextFields'
import { emptyProjectSetup } from '@/lib/projectSetup'
import type { ProjectSetupState } from '@/types'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { SmokeRunInput } from '@/lib/smoke'
export function SmokeRunCreate({ projectId, setup = emptyProjectSetup, onCreate, onCancel }: { projectId: string; setup?: ProjectSetupState; onCreate: (input: SmokeRunInput) => string | null; onCancel: () => void }) {
  const [input, setInput] = useState<SmokeRunInput>({ environmentId: undefined, buildId: undefined, browser: '', deviceOrOs: '', notes: '' })
  const [error, setError] = useState('')
  return <aside className="tc-panel" aria-label="New Smoke Run"><div className="panel-heading"><h2>Run Smoke</h2><Button variant="ghost" onClick={onCancel}>Close run creation</Button></div><form className="tc-form" onSubmit={event => { event.preventDefault(); setError(onCreate(input) ?? '') }}>
    <div className="tc-field-pair"><ProjectContextFields projectId={projectId} setup={setup} value={input} onChange={value => setInput({ ...input, ...value })} />{([['browser', 'Browser'], ['deviceOrOs', 'Device / OS']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`smoke-${key}`}>{label}</label><Input id={`smoke-${key}`} value={input[key]} onChange={event => setInput({ ...input, [key]: event.target.value })} /></div>)}</div>
    <div className="field"><label htmlFor="smoke-run-notes">Notes</label><Textarea id="smoke-run-notes" rows={3} value={input.notes} onChange={event => setInput({ ...input, notes: event.target.value })} /></div>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="tc-panel-actions"><Button type="submit">Create Draft</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
  </form></aside>
}
