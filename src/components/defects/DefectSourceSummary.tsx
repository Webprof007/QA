import { Button } from '@/components/ui/button'
import { useDefectContext } from './defectContext'
import { resolveDefectSource } from '@/lib/defects'
import type { Defect } from '@/types'
import { resultLabel } from '@/lib/domainLabels'
export function DefectSourceSummary({ defect, disabled }: { defect: Defect; disabled: boolean }) {
  const context = useDefectContext()
  if (!defect.source) return null
  let value
  try { value = resolveDefectSource(defect.projectId, defect.source, context.sources) }
  catch { return <section className="tc-section" aria-label="Source"><h3>Source</h3><p>Джерело більше недоступне. Дані дефекту збережено.</p></section> }
  return <section className="tc-section" aria-label="Source"><h3>Source</h3>
    {value.kind === 'auditFinding' ? <><p>Audit: {value.audit.code} — {value.audit.title}</p><p>Finding: {value.finding.code} — {value.finding.title}</p></> : <><p>{defect.source.type === 'smokeExecution' ? 'Smoke Run' : 'Test Run'}: {'name' in value.run ? value.run.name : value.run.suiteNameSnapshot}</p><p>Test Case: {value.execution.testCaseSnapshot.code} — {value.execution.testCaseSnapshot.title}</p><p>Execution Result: {resultLabel(value.execution.result)}</p><p>Executed at: {value.execution.executedAt ? new Date(value.execution.executedAt).toLocaleString() : '—'}</p></>}
    <Button type="button" variant="outline" disabled={disabled} onClick={() => context.viewSource(defect.source!)}>{value.kind === 'auditFinding' ? 'View Finding' : 'View Execution'}</Button>
  </section>
}
