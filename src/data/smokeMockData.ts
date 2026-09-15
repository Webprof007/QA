import { emptySmokeState, saveSmokeSuite } from '@/lib/smoke'
import type { TestCase } from '@/types'

export function createSmokeMockData(cases: TestCase[]) {
  const existingIds = (ids: string[]) => ids.filter(id => cases.some(item => item.projectId === 'voicli' && item.id === id))
  let state = emptySmokeState()
  state = saveSmokeSuite(state, 'voicli', { id: 'demo-smoke-main', name: 'Main Smoke', description: 'Демонстраційний набір із центральних Test Cases.', testCaseIds: existingIds(['demo-test-case-1', 'demo-test-case-2']), prerequisites: [{ id: 'demo-smoke-prerequisite', text: 'Демонстраційне середовище доступне' }] }, cases)
  return saveSmokeSuite(state, 'voicli', { id: 'demo-smoke-critical', name: 'Critical Smoke', description: '', testCaseIds: existingIds(['demo-test-case-1', 'demo-test-case-4']), prerequisites: [] }, cases)
}
