import { createTestCaseSnapshot } from './testCaseSnapshot'
import type { ProjectArea, TestCase, TestCaseDictionaryValue, TestExecution, TestExecutionResult, TestPlan, TestRun, TestRunsState } from '@/types'
export const executionResults: TestExecutionResult[] = ['Not Run', 'Pass', 'Fail', 'Blocked', 'Skipped']
export type RunInput = Pick<TestRun, 'name' | 'testPlanId' | 'environment' | 'build' | 'browser' | 'deviceOrOs' | 'notes'> & { testCaseIds: string[] }
export type ExecutionInput = Pick<TestExecution, 'result' | 'actualResult' | 'comment' | 'evidenceNote'>
export function runCounts(executions: Pick<TestExecution, 'result'>[]) {
  const counts = Object.fromEntries(executionResults.map(result => [result, executions.filter(item => item.result === result).length])) as Record<TestExecutionResult, number>
  return { counts, total: executions.length, done: executions.length - counts['Not Run'] }
}
export function createTestRun(projectId: string, input: RunInput, cases: TestCase[], plans: TestPlan[], areas: ProjectArea[], types: TestCaseDictionaryValue[]): TestRunsState {
  const ids = [...new Set(input.testCaseIds)]
  const selected = ids.map(id => cases.find(item => item.id === id && item.projectId === projectId))
  if (!input.name.trim()) throw new Error('Введіть назву запуску.')
  if (!ids.length || selected.some(item => !item)) throw new Error('Виберіть Test Cases поточного проєкту.')
  const plan = plans.find(item => item.id === input.testPlanId && item.projectId === projectId)
  if (input.testPlanId && !plan) throw new Error('Виберіть Test Plan поточного проєкту.')
  const now = new Date().toISOString(), runId = crypto.randomUUID()
  const run: TestRun = { id: runId, projectId, name: input.name.trim(), testPlanId: plan?.id ?? null, testPlanTitleSnapshot: plan?.title, environment: input.environment, build: input.build, browser: input.browser, deviceOrOs: input.deviceOrOs, notes: input.notes, status: 'Draft', startedAt: null, completedAt: null, createdAt: now, updatedAt: now }
  const executions: TestExecution[] = selected.map(item => {
    const test = item!
    return { id: crypto.randomUUID(), projectId, runId, testCaseId: test.id, testCaseSnapshot: createTestCaseSnapshot(test, areas, types), result: 'Not Run', actualResult: '', comment: '', evidenceNote: '' }
  })
  return { runs: [run], executions }
}
export function changeRunStatus(state: TestRunsState, projectId: string, id: string, status: 'In Progress' | 'Completed'): TestRunsState {
  const now = new Date().toISOString()
  return { ...state, runs: state.runs.map(run => run.projectId !== projectId || run.id !== id || run.status === 'Completed' ? run : { ...run, status, startedAt: run.startedAt ?? now, completedAt: status === 'Completed' ? now : null, updatedAt: now }) }
}
export function saveExecution(state: TestRunsState, projectId: string, executionId: string, input: ExecutionInput, userId?: number): TestRunsState {
  const execution = state.executions.find(item => item.id === executionId && item.projectId === projectId)
  const run = state.runs.find(item => item.id === execution?.runId && item.projectId === projectId)
  if (!execution || !run || run.status === 'Completed') return state
  const now = new Date().toISOString(), performed = input.result !== 'Not Run'
  return { runs: state.runs.map(item => item.projectId !== projectId || item.id !== run.id ? item : { ...item, status: performed ? 'In Progress' : item.status, startedAt: performed ? item.startedAt ?? now : item.startedAt, updatedAt: now }), executions: state.executions.map(item => item.projectId !== projectId || item.id !== execution.id ? item : { ...item, result: input.result, actualResult: input.actualResult, comment: input.comment, evidenceNote: input.evidenceNote, executedAt: performed ? now : undefined, executedByUserId: performed ? userId : undefined }) }
}
