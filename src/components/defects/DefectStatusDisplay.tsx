import { defectStatusLabel } from '@/lib/domainLabels'

const tones: Record<string, string> = {
  New: 'new',
  Open: 'open',
  'In Progress': 'in-progress',
  'Ready for Retest': 'ready-retest',
  Closed: 'closed',
  Rejected: 'rejected',
  Duplicate: 'duplicate',
}

/** Local Defect presentation: the badge stays concise; translation remains readable below it. */
export function DefectStatusDisplay({ value }: { value: string }) {
  const [, ukrainian = '—'] = defectStatusLabel(value).split(' / ')
  return <span className="defect-status-display"><span title={defectStatusLabel(value)} className={`domain-badge defect-status-badge defect-status-${tones[value] ?? 'duplicate'}`}>{value}</span><small>{ukrainian}</small></span>
}
