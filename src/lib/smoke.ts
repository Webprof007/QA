import type { ProjectArea, SmokeExecution, SmokePrerequisite, SmokeRun, SmokeRunPrerequisite, SmokeState, SmokeSuite, TestCase, TestCaseDictionaryValue } from '@/types'
import { createTestCaseSnapshot } from './testCaseSnapshot'

export type SmokeSuiteInput = { id: string; name: string; description: string; testCaseIds: string[]; prerequisites: Pick<SmokePrerequisite, 'id' | 'text'>[] }
export type SmokeRunInput = Pick<SmokeRun, 'environment' | 'build' | 'browser' | 'deviceOrOs' | 'notes'>
export type SmokeExecutionInput = Pick<SmokeExecution, 'result' | 'actualResult' | 'comment' | 'evidenceNote'>
export const emptySmokeState = (): SmokeState => ({ suites: [], links: [], prerequisites: [], runs: [], runPrerequisites: [], executions: [] })
export const nextSmokeCode = (suites: SmokeSuite[], projectId: string) => `SMK-${String(Math.max(0, ...suites.filter(item => item.projectId === projectId).map(item => /^SMK-\d+$/.test(item.code) ? Number(item.code.slice(4)) : 0)) + 1).padStart(3, '0')}`

export function suiteCases(state: SmokeState, projectId: string, suiteId: string, cases: TestCase[]) {
  if (!state.suites.some(item => item.projectId === projectId && item.id === suiteId)) return []
  const seen = new Set<string>()
  return state.links.filter(link => link.projectId === projectId && link.suiteId === suiteId).sort((a, b) => a.order - b.order).flatMap(link => {
    const test = cases.find(item => item.projectId === projectId && item.id === link.testCaseId)
    if (!test || seen.has(test.id)) return []
    seen.add(test.id); return [test]
  })
}

export function saveSmokeSuite(state: SmokeState, projectId: string, input: SmokeSuiteInput, cases: TestCase[]): SmokeState {
  const existing = state.suites.find(item => item.id === input.id)
  if (existing && existing.projectId !== projectId) throw new Error('Suite належить іншому проєкту.')
  if (!input.name.trim()) throw new Error('Введіть назву Smoke Suite.')
  const ids = [...new Set(input.testCaseIds)]
  if (ids.some(id => !cases.some(item => item.projectId === projectId && item.id === id))) throw new Error('Виберіть Test Cases поточного проєкту.')
  if (input.prerequisites.some(item => !item.text.trim())) throw new Error('Заповніть текст кожного prerequisite.')
  if (new Set(input.prerequisites.map(item => item.id)).size !== input.prerequisites.length || input.prerequisites.some(item => state.prerequisites.some(value => value.id === item.id && (value.projectId !== projectId || value.suiteId !== input.id)))) throw new Error('Некоректний prerequisite ID.')
  const now = new Date().toISOString()
  const suite: SmokeSuite = { id: existing?.id ?? input.id, projectId, code: existing?.code ?? nextSmokeCode(state.suites, projectId), name: input.name.trim(), description: input.description, createdAt: existing?.createdAt ?? now, updatedAt: now }
  return {
    ...state,
    suites: existing ? state.suites.map(item => item.id === suite.id && item.projectId === projectId ? suite : item) : [...state.suites, suite],
    links: [...state.links.filter(link => link.projectId !== projectId || link.suiteId !== suite.id), ...ids.map((testCaseId, order) => ({ projectId, suiteId: suite.id, testCaseId, order }))],
    prerequisites: [...state.prerequisites.filter(item => item.projectId !== projectId || item.suiteId !== suite.id), ...input.prerequisites.map((item, order) => ({ id: item.id, projectId, suiteId: suite.id, text: item.text.trim(), order }))],
  }
}

export function deleteSmokeSuite(state: SmokeState, projectId: string, id: string): SmokeState {
  if (!state.suites.some(item => item.projectId === projectId && item.id === id)) return state
  if (state.runs.some(run => run.projectId === projectId && run.suiteId === id)) throw new Error('Suite має історію запусків. Видалення недоступне, щоб зберегти доступ до історії.')
  return { ...state, suites: state.suites.filter(item => item.projectId !== projectId || item.id !== id), links: state.links.filter(item => item.projectId !== projectId || item.suiteId !== id), prerequisites: state.prerequisites.filter(item => item.projectId !== projectId || item.suiteId !== id) }
}

export function createSmokeRun(state: SmokeState, projectId: string, suiteId: string, input: SmokeRunInput, cases: TestCase[], areas: ProjectArea[], types: TestCaseDictionaryValue[], userId?: number): SmokeState {
  const suite = state.suites.find(item => item.projectId === projectId && item.id === suiteId)
  if (!suite) throw new Error('Виберіть Smoke Suite поточного проєкту.')
  const members = state.links.filter(link => link.projectId === projectId && link.suiteId === suiteId)
  if (members.some(link => !cases.some(test => test.projectId === projectId && test.id === link.testCaseId))) throw new Error('У Suite є недоступні Test Cases. Оновіть склад набору перед запуском.')
  const selected = suiteCases(state, projectId, suiteId, cases)
  if (!selected.length) throw new Error('Додайте щонайменше один Test Case до Suite.')
  const id = crypto.randomUUID(), now = new Date().toISOString()
  const run: SmokeRun = { id, projectId, suiteId, suiteCodeSnapshot: suite.code, suiteNameSnapshot: suite.name, environment: input.environment, build: input.build, browser: input.browser, deviceOrOs: input.deviceOrOs, notes: input.notes, status: 'Draft', createdByUserId: userId, createdAt: now, updatedAt: now }
  return { ...state, runs: [...state.runs, run],
    executions: [...state.executions, ...selected.map((test, order): SmokeExecution => ({ id: crypto.randomUUID(), projectId, runId: id, testCaseId: test.id, order, testCaseSnapshot: createTestCaseSnapshot(test, areas, types), result: 'Not Run', actualResult: '', comment: '', evidenceNote: '' }))],
    runPrerequisites: [...state.runPrerequisites, ...state.prerequisites.filter(item => item.projectId === projectId && item.suiteId === suiteId).sort((a, b) => a.order - b.order).map((item, order): SmokeRunPrerequisite => ({ id: crypto.randomUUID(), projectId, runId: id, sourcePrerequisiteId: item.id, order, textSnapshot: item.text, result: 'Not Checked', comment: '' }))],
  }
}

export function changeSmokeRunStatus(state: SmokeState, projectId: string, id: string, status: 'In Progress' | 'Completed'): SmokeState {
  const now = new Date().toISOString()
  return { ...state, runs: state.runs.map(run => run.id !== id || run.projectId !== projectId || run.status === 'Completed' ? run : { ...run, status, startedAt: run.startedAt ?? now, completedAt: status === 'Completed' ? now : undefined, updatedAt: now }) }
}
export function saveSmokeExecution(state: SmokeState, projectId: string, id: string, input: SmokeExecutionInput, userId?: number): SmokeState {
  const execution = state.executions.find(item => item.projectId === projectId && item.id === id)
  const run = state.runs.find(item => item.projectId === projectId && item.id === execution?.runId)
  if (!execution || !run || run.status === 'Completed') return state
  const performed = input.result !== 'Not Run', now = new Date().toISOString()
  return { ...state,
    runs: state.runs.map(item => item.projectId === projectId && item.id === run.id ? { ...item, status: performed ? 'In Progress' : item.status, startedAt: performed ? item.startedAt ?? now : item.startedAt, updatedAt: now } : item),
    executions: state.executions.map(item => item.projectId === projectId && item.id === id ? { ...item, result: input.result, actualResult: input.actualResult, comment: input.comment, evidenceNote: input.evidenceNote, executedAt: performed ? now : undefined, executedByUserId: performed ? userId : undefined } : item),
  }
}
export function saveSmokeRunPrerequisite(state: SmokeState, projectId: string, id: string, input: Pick<SmokeRunPrerequisite, 'result' | 'comment'>): SmokeState {
  const prerequisite = state.runPrerequisites.find(item => item.projectId === projectId && item.id === id)
  const run = state.runs.find(item => item.projectId === projectId && item.id === prerequisite?.runId)
  if (!prerequisite || !run || run.status === 'Completed') return state
  return { ...state, runs: state.runs.map(item => item.projectId === projectId && item.id === run.id ? { ...item, updatedAt: new Date().toISOString() } : item), runPrerequisites: state.runPrerequisites.map(item => item.projectId === projectId && item.id === id ? { ...item, result: input.result, comment: input.comment } : item) }
}
