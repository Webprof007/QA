import type { Defect, DefectsState } from '@/types'
export function createDefectsMockData(): DefectsState {
  const examples = [
    ['Demo: required field feedback is missing', 'Major', 'High', 'New'],
    ['Demo: navigation label is truncated', 'Minor', 'Low', 'Open'],
    ['Demo: form loses input after validation', 'Critical', 'Highest', 'Ready for Retest'],
  ] as const
  const items: Defect[] = examples.map(([title, severity, priority, status], index) => ({
    id: `demo-defect-${index + 1}`, projectId: 'voicli', code: `BUG-00${index + 1}`, title, severity, priority, status,
    description: 'Демонстраційний дефект, не підтверджена проблема продукту.', stepsToReproduce: 'Відкрити демонстраційну форму та перевірити зазначену поведінку.', expectedResult: 'Очікувана поведінка відповідає погодженим вимогам.', actualResult: 'Спостереження описане в назві прикладу.', environment: '', build: '', browser: '', deviceOrOs: '', evidenceNote: '', createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z',
  }))
  return { items, links: [] }
}
