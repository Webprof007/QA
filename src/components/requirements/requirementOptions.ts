export const requirementStatuses = [
  { value: 'draft', label: 'Draft / Чернетка' },
  { value: 'approved', label: 'Approved / Затверджено' },
  { value: 'deprecated', label: 'Deprecated / Застаріле' },
]
export function coverageLabel(count: number) { return `${count} ${count === 1 ? 'test' : 'tests'}` }
