import { richTextPlain } from './richText'
import type { Defect, DefectsState, ProjectArea, TestExecution, TestRun, TestRunsState } from '@/types'
export const defectSeverities = ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial'] as const
export const defectPriorities = ['Highest', 'High', 'Medium', 'Low'] as const
export const defectStatuses = ['New', 'Open', 'In Progress', 'Ready for Retest', 'Closed', 'Rejected', 'Duplicate'] as const
export function nextDefectCode(items: Defect[], projectId: string) {
  return `BUG-${String(Math.max(0, ...items.filter(item => item.projectId === projectId).map(item => /^BUG-\d+$/.test(item.code) ? Number(item.code.slice(4)) : 0)) + 1).padStart(3, '0')}`
}
export function newDefect(projectId: string, items: Defect[]): Defect {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), projectId, code: nextDefectCode(items, projectId), title: '', description: '', stepsToReproduce: '', expectedResult: '', actualResult: '', severity: 'Major', priority: 'Medium', status: 'New', environment: '', build: '', browser: '', deviceOrOs: '', evidenceNote: '', externalTaskUrl: '', createdAt: now, updatedAt: now }
}
export function defectFromExecution(draft: Defect, execution: TestExecution, run: TestRun, areas: ProjectArea[]): Defect {
  if (execution.projectId !== draft.projectId || run.projectId !== draft.projectId || execution.runId !== run.id || execution.result !== 'Fail') throw new Error('Виберіть збережений Fail поточного проєкту.')
  const snapshot = execution.testCaseSnapshot, steps = [...snapshot.steps].sort((a, b) => a.sortOrder - b.sortOrder)
  return { ...draft, title: snapshot.title, description: execution.comment, stepsToReproduce: steps.map((step, index) => `${index + 1}. ${richTextPlain(step.action)}`).join('\n'), expectedResult: steps.map((step, index) => `${index + 1}. ${richTextPlain(step.expectedResult)}`).join('\n'), actualResult: execution.actualResult, evidenceNote: execution.evidenceNote, sourceExecutionId: execution.id, sourceTestCaseId: execution.testCaseId, areaId: areas.some(area => area.projectId === draft.projectId && area.id === snapshot.areaId) ? snapshot.areaId : undefined, environment: run.environment, build: run.build, browser: run.browser, deviceOrOs: run.deviceOrOs }
}
export function safeExternalUrl(value?: string) {
  if (!value) return ''
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}
export function linkDefect(state: DefectsState, projectId: string, executionId: string, defectId: string, executions: TestExecution[]): DefectsState {
  if (!state.items.some(item => item.id === defectId && item.projectId === projectId) || !executions.some(item => item.id === executionId && item.projectId === projectId && item.result === 'Fail')) throw new Error('Пов’язувати можна лише Defect і Fail поточного проєкту.')
  if (state.links.some(link => link.projectId === projectId && link.executionId === executionId && link.defectId === defectId)) return state
  return { ...state, links: [...state.links, { projectId, executionId, defectId }] }
}
export function saveDefect(state: DefectsState, draft: Defect, projectId: string, userId: number | undefined, runs: TestRunsState, areas: ProjectArea[]): DefectsState {
  if (draft.projectId !== projectId || state.items.some(item => item.id === draft.id && item.projectId !== projectId)) throw new Error('Defect належить іншому проєкту.')
  if (!draft.title.trim()) throw new Error('Введіть назву дефекту.')
  if (draft.areaId && !areas.some(area => area.projectId === projectId && area.id === draft.areaId)) throw new Error('Виберіть Area поточного проєкту.')
  if (draft.externalTaskUrl?.trim() && !safeExternalUrl(draft.externalTaskUrl.trim())) throw new Error('Введіть коректне посилання http або https.')
  const existing = state.items.find(item => item.id === draft.id)
  const saved: Defect = { ...draft, title: draft.title.trim(), externalTaskUrl: draft.externalTaskUrl?.trim(), id: existing?.id ?? draft.id, code: existing?.code ?? nextDefectCode(state.items, projectId), projectId, createdAt: existing?.createdAt ?? new Date().toISOString(), createdByUserId: existing ? existing.createdByUserId : userId, sourceExecutionId: existing ? existing.sourceExecutionId : draft.sourceExecutionId, sourceTestCaseId: existing ? existing.sourceTestCaseId : draft.sourceTestCaseId, updatedAt: new Date().toISOString() }
  let next = { ...state, items: existing ? state.items.map(item => item.id === saved.id ? saved : item) : [...state.items, saved] }
  if (!existing && saved.sourceExecutionId) {
    const execution = runs.executions.find(item => item.id === saved.sourceExecutionId && item.projectId === projectId)
    if (!execution || execution.testCaseId !== saved.sourceTestCaseId || !runs.runs.some(run => run.projectId === projectId && run.id === execution.runId)) throw new Error('Джерело виконання недоступне.')
    next = linkDefect(next, projectId, execution.id, saved.id, runs.executions)
  }
  return next
}
