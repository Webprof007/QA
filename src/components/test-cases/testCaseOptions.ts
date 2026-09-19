import { priorityLabel } from '@/lib/domainLabels'

export const priorities = [
  { value: 'critical', label: priorityLabel('critical') },
  { value: 'high', label: priorityLabel('high') },
  { value: 'medium', label: priorityLabel('medium') },
  { value: 'low', label: priorityLabel('low') },
]
export const statuses = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'deprecated', label: 'Deprecated' },
]
export function moveItem<T>(items: T[], index: number, direction: number): T[] {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
