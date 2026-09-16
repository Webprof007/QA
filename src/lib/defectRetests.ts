import { createTestCaseSnapshot } from './testCaseSnapshot'
import { resolveProjectContext } from './projectSetup'
import type { Defect, DefectRetest, DefectsState, ProjectArea, ProjectSetupState, TestCase, TestCaseDictionaryValue, TestRunsState, SmokeState } from '@/types'
export const retestResults = ['Pass', 'Fail', 'Blocked'] as const
export type RetestInput = Pick<DefectRetest, 'environmentId' | 'buildId' | 'result' | 'actualResult' | 'comment' | 'evidenceNote'>
export function retestHistory(retests: DefectRetest[], projectId: string, defectId: string) {
  // Append order breaks timestamp ties consistently. Number is derived, never stored.
  return retests.filter(item => item.projectId === projectId && item.defectId === defectId).sort((a, b) => a.executedAt.localeCompare(b.executedAt))
}
export function retestSource(defect: Defect, cases: TestCase[], runs: TestRunsState, areas: ProjectArea[], types: TestCaseDictionaryValue[], retests: DefectRetest[], smoke?: SmokeState) {
  const live = cases.find(item => item.id === defect.sourceTestCaseId)
  const sourceData = defect.source?.type === 'smokeExecution' ? smoke : defect.source?.type === 'testExecution' ? runs : undefined
  const source = sourceData?.executions.find(item => item.id === defect.source?.id)
  if (live && live.projectId !== defect.projectId || source && (source.projectId !== defect.projectId || source.testCaseId !== defect.sourceTestCaseId)) throw new Error('Контекст Test Case належить іншому проєкту або джерелу.')
  if (source && sourceData?.runs.some(item => item.id === source.runId && item.projectId !== defect.projectId)) throw new Error('Джерело Run належить іншому проєкту.')
  const previous = retestHistory(retests, defect.projectId, defect.id).filter(item => item.sourceTestCaseId === defect.sourceTestCaseId && item.testCaseSnapshot).at(-1)
  const snapshot = live ? createTestCaseSnapshot(live, areas, types) : source?.testCaseSnapshot ?? previous?.testCaseSnapshot
  return snapshot ? { testCaseSnapshot: structuredClone(snapshot) } : { defectContextSnapshot: { title: defect.title, stepsToReproduce: defect.stepsToReproduce, expectedResult: defect.expectedResult, actualResult: defect.actualResult } }
}
export function saveRetest(retests: DefectRetest[], projectId: string, defectId: string, input: RetestInput, defects: Defect[], cases: TestCase[], runs: TestRunsState, setup: ProjectSetupState, areas: ProjectArea[], types: TestCaseDictionaryValue[], userId?: number, smoke?: SmokeState): DefectRetest[] {
  const defect = defects.find(item => item.id === defectId && item.projectId === projectId)
  if (!defect || defect.status !== 'Ready for Retest') throw new Error('Retest доступний лише для Ready for Retest поточного проєкту.')
  if (!input.environmentId) throw new Error('Виберіть Environment для Retest.')
  if (!retestResults.includes(input.result)) throw new Error('Виберіть результат Retest.')
  const context = resolveProjectContext(setup, projectId, input)
  const now = new Date().toISOString()
  // No update/delete operation: every save appends a new focused verification record.
  return [...retests, { id: crypto.randomUUID(), projectId, defectId, sourceTestCaseId: defect.sourceTestCaseId, sourceExecutionId: defect.source?.type === 'testExecution' ? defect.source.id : undefined, ...retestSource(defect, cases, runs, areas, types, retests, smoke), ...context, result: input.result, actualResult: input.actualResult, comment: input.comment, evidenceNote: input.evidenceNote, executedByUserId: userId, executedAt: now, createdAt: now }]
}
export function retestTransition(state: DefectsState, projectId: string, defectId: string, action: 'Open' | 'Ready for Retest' | 'Close Defect' | 'Reopen Defect', retests: DefectRetest[], retestId?: string): DefectsState {
  const defect = state.items.find(item => item.id === defectId && item.projectId === projectId)
  if (!defect) throw new Error('Defect поточного проєкту не знайдено.')
  const latest = retestHistory(retests, projectId, defectId).at(-1)
  let status: Defect['status']
  if (action === 'Open' && defect.status === 'New') status = 'Open'
  else if (action === 'Ready for Retest' && ['Open', 'In Progress'].includes(defect.status)) status = 'Ready for Retest'
  else if (defect.status === 'Ready for Retest' && latest && latest.executedAt >= defect.updatedAt && latest.id === retestId && action === 'Close Defect' && latest.result === 'Pass') status = 'Closed'
  else if (defect.status === 'Ready for Retest' && latest && latest.executedAt >= defect.updatedAt && latest.id === retestId && action === 'Reopen Defect' && latest.result === 'Fail') status = 'Open'
  else throw new Error('Цей перехід недоступний для поточного статусу або результату Retest.')
  return { ...state, items: state.items.map(item => item.id === defectId && item.projectId === projectId ? { ...item, status, updatedAt: new Date().toISOString() } : item) }
}
