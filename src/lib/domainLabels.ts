const labels: Record<string, string> = {
  'Not Run': 'Not Run / Не виконано',
  'Not Checked': 'Not Checked / Не перевірено',
  Pass: 'Pass / Пройдено',
  Fail: 'Fail / Не пройдено',
  Blocked: 'Blocked / Заблоковано',
  Skipped: 'Skipped / Пропущено',
  'N/A': 'N/A / Не застосовується',
  New: 'New / Новий',
  Open: 'Open / Відкритий',
  'In Progress': 'In Progress / У роботі',
  'Ready for Retest': 'Ready for Retest / Готовий до повторного тестування',
  Closed: 'Closed / Закритий',
  Rejected: 'Rejected / Відхилений',
  Duplicate: 'Duplicate / Дублікат',
  Blocker: 'Blocker / Блокуючий',
  Critical: 'Critical / Критичний',
  Major: 'Major / Значний',
  Minor: 'Minor / Незначний',
  Trivial: 'Trivial / Тривіальний',
  Highest: 'Highest / Найвищий',
  High: 'High / Високий',
  Medium: 'Medium / Середній',
  Low: 'Low / Низький',
  critical: 'Critical / Критичний',
  high: 'High / Високий',
  medium: 'Medium / Середній',
  low: 'Low / Низький',
}

export const domainValueLabel = (value?: string | null) => value ? labels[value] ?? value : '—'
export const resultLabel = (value?: string | null) => domainValueLabel(value)
export const defectStatusLabel = (value?: string | null) => domainValueLabel(value)
export const priorityLabel = (value?: string | null) => domainValueLabel(value)
export const severityLabel = (value?: string | null) => domainValueLabel(value)
