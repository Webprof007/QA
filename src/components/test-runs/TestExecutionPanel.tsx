import { ExecutionDefects } from '@/components/defects/ExecutionDefects'
import { ExecutionPanel, type ExecutionPanelProps } from './ExecutionPanel'
import type { Defect } from '@/types'

type Props = Omit<ExecutionPanelProps, 'footer'> & {
  defects: Defect[]; linkedDefects: Defect[]; onCreateDefect: () => void; onViewDefect: (id: string) => void; onLinkDefect: (id: string) => string | null
}
export function TestExecutionPanel({ defects, linkedDefects, onCreateDefect, onViewDefect, onLinkDefect, ...props }: Props) {
  return <ExecutionPanel {...props} footer={<ExecutionDefects key={props.execution.id} failed={(props.draft ?? props.execution).result === 'Fail'} disabled={!!props.draft} defects={defects} linked={linkedDefects} onCreate={onCreateDefect} onView={onViewDefect} onLink={onLinkDefect} />} />
}
