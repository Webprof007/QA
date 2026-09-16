import type { TestCase, TestSuite, TestSuitesState } from '@/types'
export type TestSuiteInput = { id: string; name: string; description: string; testCaseIds: string[] }
export function testSuiteCases(state: TestSuitesState, projectId: string, suiteId: string, cases: TestCase[]) {
  if (!state.suites.some(item => item.projectId === projectId && item.id === suiteId)) return []
  const seen = new Set<string>()
  return state.links.filter(link => link.projectId === projectId && link.suiteId === suiteId).sort((a, b) => a.order - b.order).flatMap(link => {
    const test = cases.find(item => item.projectId === projectId && item.id === link.testCaseId)
    if (!test || seen.has(test.id)) return []
    seen.add(test.id); return [test]
  })
}
export function nextTestSuiteCode(state: TestSuitesState, projectId: string) {
  return `TS-${String(Math.max(0, ...state.suites.filter(item => item.projectId === projectId).map(item => /^TS-\d+$/.test(item.code) ? Number(item.code.slice(3)) : 0)) + 1).padStart(3, '0')}`
}
export function saveTestSuite(state: TestSuitesState, projectId: string, input: TestSuiteInput, cases: TestCase[]): TestSuitesState {
  const existing = state.suites.find(item => item.id === input.id)
  if (existing && existing.projectId !== projectId) throw new Error('Suite належить іншому проєкту.')
  if (!input.name.trim()) throw new Error('Введіть назву Test Suite.')
  const ids = [...new Set(input.testCaseIds)]
  if (ids.some(id => !cases.some(item => item.id === id && item.projectId === projectId))) throw new Error('Виберіть Test Cases поточного проєкту.')
  const now = new Date().toISOString()
  const suite: TestSuite = { id: input.id, projectId, code: existing?.code ?? nextTestSuiteCode(state, projectId), name: input.name.trim(), description: input.description, createdAt: existing?.createdAt ?? now, updatedAt: now }
  return { suites: existing ? state.suites.map(item => item.projectId === projectId && item.id === suite.id ? suite : item) : [...state.suites, suite], links: [...state.links.filter(link => link.projectId !== projectId || link.suiteId !== suite.id), ...ids.map((testCaseId, order) => ({ projectId, suiteId: suite.id, testCaseId, order }))] }
}
export function deleteTestSuite(state: TestSuitesState, projectId: string, id: string): TestSuitesState {
  return { suites: state.suites.filter(item => item.projectId !== projectId || item.id !== id), links: state.links.filter(item => item.projectId !== projectId || item.suiteId !== id) }
}
