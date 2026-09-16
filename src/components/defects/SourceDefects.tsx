import { useContext } from 'react'
import { DefectContext } from './defectContext'
import { ExecutionDefects } from './ExecutionDefects'
import { linkedSourceDefects, resolveDefectSource } from '@/lib/defects'
import type { DefectSourceRef } from '@/types'
// A presentation adapter over the existing creation/link picker and shared relation state.
export function SourceDefects({ projectId, source, disabled = false }: { projectId: string; source: DefectSourceRef; disabled?: boolean }) {
  const context = useContext(DefectContext)
  if (!context) return null
  let resolved
  try { resolved = resolveDefectSource(projectId, source, context.sources) } catch { return null }
  return <ExecutionDefects failed={resolved.kind === 'auditFinding' || resolved.execution.result === 'Fail'} disabled={disabled}
    defects={context.state.items.filter(item => item.projectId === projectId)}
    linked={linkedSourceDefects(context.state, projectId, source)}
    onCreate={() => context.create(source)} onView={context.view} onLink={id => context.link(source, id)} />
}
