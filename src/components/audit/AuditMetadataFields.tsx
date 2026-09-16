import { AuditDictionarySelect } from './AuditDictionarySelect'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/rich-text/RichTextEditor'
import { auditSeverities, auditStatuses } from '@/data/auditMockData'
import type { AuditFinding } from '@/types'

type Props = { item: AuditFinding; onChange: (item: AuditFinding) => void; prefix: string }

export function AuditMetadataFields({ item, onChange, prefix }: Props) {
  return <>
    <div className="audit-field-pair">
      <div className="field">
        <label id={`${prefix}-severity-label`} htmlFor={`${prefix}-severity`}>Severity / Критичність</label>
        <select id={`${prefix}-severity`} className="audit-select" value={item.severity} onChange={event => onChange({ ...item, severity: event.target.value as AuditFinding['severity'] })}>
          {auditSeverities.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label id={`${prefix}-status-label`} htmlFor={`${prefix}-status`}>Status</label>
        <select id={`${prefix}-status`} className="audit-select" value={item.status} onChange={event => onChange({ ...item, status: event.target.value as AuditFinding['status'] })}>
          {auditStatuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
    </div>
    <div className="audit-field-pair">
      <div className="field"><label id={`${prefix}-date-label`} htmlFor={`${prefix}-date`}>Date</label><Input id={`${prefix}-date`} type="date" required value={item.discoveredAt} onChange={event => onChange({ ...item, discoveredAt: event.target.value })} /></div>
      <AuditDictionarySelect kind="area" id={`${prefix}-area`} value={item.areaId} onChange={areaId => onChange({ ...item, areaId })} />
    </div>
    <AuditDictionarySelect manage kind="type" id={`${prefix}-type`} value={item.type} onChange={type => onChange({ ...item, type })} />
    <div className="field"><label id={`${prefix}-task-label`} htmlFor={`${prefix}-task`}>Task URL</label><Input id={`${prefix}-task`} type="url" pattern="https?://.*" title="Посилання має починатися з http:// або https://" placeholder="https://…" value={item.taskUrl} onChange={event => onChange({ ...item, taskUrl: event.target.value })} /></div>
    <div className="field"><label id={`${prefix}-comment-label`} htmlFor={`${prefix}-comment`}>Comment</label><RichTextEditor id={`${prefix}-comment`} rows={4} value={item.comment} onValueChange={value => onChange({ ...item, comment: value })} placeholder="Додаткові нотатки" /></div>
  </>
}
