import type { Page } from '@/types'

export const navigationLabels: Record<Page, { label: string; sublabel: string }> = {
  Requirements: { label: 'Requirements', sublabel: 'Вимоги' },
  'Test Plan': { label: 'Test Plan', sublabel: 'План тестування' },
  'Test Cases': { label: 'Test Cases', sublabel: 'Тест-кейси' },
  'Test Suites': { label: 'Test Suites', sublabel: 'Набори тестів' },
  Checklists: { label: 'Checklists', sublabel: 'Чеклісти' },
  Smoke: { label: 'Smoke', sublabel: 'Смоук-тестування' },
  Coverage: { label: 'Coverage', sublabel: 'Покриття' },
  'Test Runs': { label: 'Test Runs', sublabel: 'Запуски тестів' },
  Defects: { label: 'Defects', sublabel: 'Дефекти' },
  Audit: { label: 'Audit', sublabel: 'Аудит' },
  Settings: { label: 'Settings', sublabel: 'Налаштування' },
}
