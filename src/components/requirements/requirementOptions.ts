export const requirementStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'deprecated', label: 'Deprecated' },
]
export function coverageLabel(count: number) { return `${count} ${count === 1 ? 'test' : 'tests'}` }
