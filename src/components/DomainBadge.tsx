import { defectStatusLabel, resultLabel } from '@/lib/domainLabels'

const resultTone: Record<string, string> = {
  Pass: 'pass',
  Fail: 'fail',
  Blocked: 'blocked',
  Skipped: 'skipped',
  'Not Run': 'not-run',
  'Not Checked': 'not-checked',
  'N/A': 'na',
}

const defectTone: Record<string, string> = {
  New: 'new',
  Open: 'open',
  'In Progress': 'in-progress',
  'Ready for Retest': 'ready-retest',
  Closed: 'closed',
  Rejected: 'rejected',
  Duplicate: 'duplicate',
}

export function ResultBadge({ value, count, compact = false }: { value: string; count?: number; compact?: boolean }) {
  const fullLabel = resultLabel(value)
  return <span title={compact ? fullLabel : undefined} className={`domain-badge result-badge result-badge-${resultTone[value] ?? 'not-run'}`}>{compact ? value : fullLabel}{count !== undefined && <>: {count}</>}</span>
}

export function DefectStatusBadge({ value, compact = false }: { value: string; compact?: boolean }) {
  const fullLabel = defectStatusLabel(value)
  const label = compact && value === 'Ready for Retest' ? 'Ready for Retest / До ретесту' : fullLabel
  return <span title={compact ? fullLabel : undefined} className={`domain-badge defect-status-badge defect-status-${defectTone[value] ?? 'duplicate'}`}>{label}</span>
}
