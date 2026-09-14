import type { AuditDictionaryValue, AuditItem, AuditStatus, AuditType, Severity } from '@/types'

export const auditStatuses: { value: AuditStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'verified', label: 'Verified' },
  { value: 'wont-fix', label: "Won’t fix" },
]
export const auditSeverities: { value: Severity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]
const seedTypes: { value: AuditType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'ui-ux', label: 'UI / UX' },
  { value: 'content', label: 'Content' },
  { value: 'localization', label: 'Localization' },
  { value: 'seo', label: 'SEO' },
  { value: 'performance', label: 'Performance' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'other', label: 'Other' },
]

// Demonstration findings only; these are not verified issues in Voicli.
export const initialAuditByProject: Record<string, AuditItem[]> = {
  voicli: [
    {
      id: 'AUD-001', projectId: 'voicli',
      title: 'Демо: непомітний фокус кнопки', area: 'Landing',
      type: 'accessibility', severity: 'high', status: 'open',
      discoveredAt: '2026-09-10', location: 'Landing → основна CTA',
      description: 'Демонстраційний приклад: під час навігації клавіатурою фокус кнопки складно розрізнити.',
      expected: 'Активний елемент має помітний індикатор фокуса.',
      actual: 'Індикатор фокуса майже зливається з фоном.',
      evidence: [], comment: 'Приклад запису для ознайомлення з Audit.', taskUrl: '',
    },
    {
      id: 'AUD-002', projectId: 'voicli',
      title: 'Демо: неперекладений підпис', area: 'Settings',
      type: 'localization', severity: 'medium', status: 'in-progress',
      discoveredAt: '2026-09-11', location: 'Settings → мова інтерфейсу',
      description: 'Демонстраційний приклад: один підпис залишився іншою мовою.',
      expected: 'Усі підписи відповідають вибраній мові.',
      actual: 'Один підпис не перекладено.', evidence: [], comment: '',
      taskUrl: 'https://example.com/tasks/demo-aud-002',
    },
    {
      id: 'AUD-003', projectId: 'voicli',
      title: 'Демо: текст виходить за межі', area: 'Pricing',
      type: 'ui-ux', severity: 'low', status: 'fixed',
      discoveredAt: '2026-09-12', location: 'Pricing → картка тарифу',
      description: 'Демонстраційний приклад: довгий текст виходить за межі картки.',
      expected: 'Текст переноситься всередині картки.',
      actual: 'Частина тексту виходить за правий край.', evidence: [],
      comment: 'У прикладі виправлення очікує повторної перевірки.', taskUrl: '',
    },
    {
      id: 'AUD-004', projectId: 'voicli',
      title: 'Демо: немає повідомлення про помилку', area: 'Registration',
      type: 'bug', severity: 'high', status: 'open',
      discoveredAt: '2026-09-13', location: 'Registration → надсилання форми',
      description: 'Демонстраційний приклад: форма не пояснює причину невдалого надсилання.',
      expected: 'Поруч із формою показано зрозуміле повідомлення.',
      actual: 'Форма залишається без зворотного зв’язку.', evidence: [], comment: '', taskUrl: '',
    },
  ],
  'qp-notes': [],
}

export const initialAuditAreas: AuditDictionaryValue[] = [...new Set(initialAuditByProject.voicli.map(item => item.area))].map(name => ({ id: name, projectId: 'voicli', name }))
export const initialAuditTypes: AuditDictionaryValue[] = seedTypes.map(option => ({ id: option.value, projectId: 'voicli', name: option.label }))
