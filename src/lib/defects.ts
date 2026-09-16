import { copyProjectContext, emptyProjectSetup, resolveProjectContext } from './projectSetup'
import type { AuditState, DefectSourceRef, DefectOrigin, SmokeState, SmokeExecution, SmokeRun, ProjectSetupState } from '@/types'
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
  return { id: crypto.randomUUID(), projectId, code: nextDefectCode(items, projectId), title: '', description: '', stepsToReproduce: '', expectedResult: '', actualResult: '', severity: 'Major', priority: 'Medium', status: 'New', browser: '', deviceOrOs: '', evidenceNote: '', externalTaskUrl: '', createdAt: now, updatedAt: now }
}
export function defectFromExecution(draft: Defect, execution: TestExecution | SmokeExecution, run: TestRun | SmokeRun, areas: ProjectArea[], sourceType: 'testExecution' | 'smokeExecution' = 'testExecution'): Defect {
  if (execution.projectId !== draft.projectId || run.projectId !== draft.projectId || execution.runId !== run.id || execution.result !== 'Fail') throw new Error('Виберіть збережений Fail поточного проєкту.')
  const snapshot = execution.testCaseSnapshot, steps = [...snapshot.steps].sort((a, b) => a.sortOrder - b.sortOrder)
  return { ...draft, title: snapshot.title, description: execution.comment, stepsToReproduce: steps.map((step, index) => `${index + 1}. ${richTextPlain(step.action)}`).join('\n'), expectedResult: steps.map((step, index) => `${index + 1}. ${richTextPlain(step.expectedResult)}`).join('\n'), actualResult: execution.actualResult, evidenceNote: execution.evidenceNote, source: { type: sourceType, id: execution.id, runId: run.id }, sourceTestCaseId: execution.testCaseId, areaId: areas.some(area => area.projectId === draft.projectId && area.id === snapshot.areaId) ? snapshot.areaId : undefined, ...copyProjectContext(run), browser: run.browser, deviceOrOs: run.deviceOrOs }
}
export function safeExternalUrl(value?: string) {
  if (!value) return ''
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}
export type DefectSources = { testRuns: TestRunsState; smoke: SmokeState; audits: AuditState }
export const emptyDefectSources: DefectSources = { testRuns: { runs: [], executions: [] }, smoke: { suites: [], links: [], prerequisites: [], runs: [], runPrerequisites: [], executions: [] }, audits: { audits: [], checks: [], findings: [] } }
export function resolveDefectSource(projectId: string, ref: DefectSourceRef, sources: DefectSources) {
  if (ref.type === 'auditFinding') {
    const finding = sources.audits.findings.find(item => item.projectId === projectId && item.id === ref.id)
    const audit = finding && sources.audits.audits.find(item => item.projectId === projectId && item.id === finding.auditId)
    if (!finding || !audit) throw new Error('Audit Finding поточного проєкту недоступне.')
    const origin: DefectOrigin = { type: 'auditFinding', id: finding.id, auditId: audit.id }
    return { kind: 'auditFinding' as const, finding, audit, origin }
  }
  const data = ref.type === 'testExecution' ? sources.testRuns : ref.type === 'smokeExecution' ? sources.smoke : null
  const execution = data?.executions.find(item => item.projectId === projectId && item.id === ref.id)
  const run = execution && data?.runs.find(item => item.projectId === projectId && item.id === execution.runId)
  if (!execution || !run) throw new Error('Execution поточного проєкту недоступне.')
  const origin: DefectOrigin = { type: ref.type, id: execution.id, runId: run.id }
  return { kind: 'execution' as const, execution, run, origin }
}
export function defectFromSource(draft: Defect, ref: DefectSourceRef, sources: DefectSources, areas: ProjectArea[]) {
  const source = resolveDefectSource(draft.projectId, ref, sources)
  if (source.kind === 'execution') return defectFromExecution(draft, source.execution, source.run, areas, ref.type as 'testExecution' | 'smokeExecution')
  const finding = source.finding
  // Different severity scales: explicit suggested mapping, editable before Save.
  const severity = { critical: 'Critical', high: 'Major', medium: 'Minor', low: 'Trivial' } as const
  return { ...draft, source: source.origin, title: finding.title,
    description: [richTextPlain(finding.description), finding.location ? 'Location / Де виявлено: ' + finding.location : '', richTextPlain(finding.comment)].filter(Boolean).join('\n\n'),
    expectedResult: richTextPlain(finding.expected), actualResult: richTextPlain(finding.actual),
    evidenceNote: richTextPlain(finding.evidenceNote ?? ''), severity: severity[finding.severity],
    areaId: areas.some(area => area.projectId === draft.projectId && area.id === finding.areaId) ? finding.areaId : undefined,
  }
}
export function linkSourceDefect(state: DefectsState, projectId: string, ref: DefectSourceRef, defectId: string, sources: DefectSources): DefectsState {
  const source = resolveDefectSource(projectId, ref, sources)
  if (!state.items.some(item => item.id === defectId && item.projectId === projectId) || source.kind === 'execution' && source.execution.result !== 'Fail') throw new Error('Виберіть Defect та збережений Fail / Finding поточного проєкту.')
  if (state.links.some(link => link.projectId === projectId && link.sourceType === ref.type && link.sourceId === ref.id && link.defectId === defectId)) return state
  return { ...state, links: [...state.links, { projectId, sourceType: ref.type, sourceId: ref.id, defectId }] }
}
export function linkedSourceDefects(state: DefectsState, projectId: string, ref: DefectSourceRef) {
  return state.items.filter(item => item.projectId === projectId && state.links.some(link => link.projectId === projectId && link.sourceType === ref.type && link.sourceId === ref.id && link.defectId === item.id))
}
// Existing Test Run caller uses the same relation helper and validates the parent run.
export function linkDefect(state: DefectsState, projectId: string, executionId: string, defectId: string, runs: TestRunsState): DefectsState {
  return linkSourceDefect(state, projectId, { type: 'testExecution', id: executionId }, defectId, { ...emptyDefectSources, testRuns: runs })
}
export function saveDefect(state: DefectsState, draft: Defect, projectId: string, userId: number | undefined, runs: TestRunsState, areas: ProjectArea[], setup: ProjectSetupState = emptyProjectSetup, sources: DefectSources = { ...emptyDefectSources, testRuns: runs }): DefectsState {
  if (draft.projectId !== projectId || state.items.some(item => item.id === draft.id && item.projectId !== projectId)) throw new Error('Defect належить іншому проєкту.')
  if (!draft.title.trim()) throw new Error('Введіть назву дефекту.')
  if (draft.areaId && !areas.some(area => area.projectId === projectId && area.id === draft.areaId)) throw new Error('Виберіть Area поточного проєкту.')
  if (draft.externalTaskUrl?.trim() && !safeExternalUrl(draft.externalTaskUrl.trim())) throw new Error('Введіть коректне посилання http або https.')
  const existing = state.items.find(item => item.id === draft.id)
  const source = !existing && draft.source ? resolveDefectSource(projectId, draft.source, sources) : undefined
  if (source?.kind === 'execution' && source.execution.result !== 'Fail') throw new Error('Джерело має бути збереженим Fail.')
  const context = resolveProjectContext(setup, projectId, draft, existing ?? (source?.kind === 'execution' ? source.run : undefined))
  const saved: Defect = { ...draft, ...context, title: draft.title.trim(), externalTaskUrl: draft.externalTaskUrl?.trim(), id: existing?.id ?? draft.id, code: existing?.code ?? nextDefectCode(state.items, projectId), projectId, createdAt: existing?.createdAt ?? new Date().toISOString(), createdByUserId: existing ? existing.createdByUserId : userId, source: existing ? existing.source : source?.origin, sourceTestCaseId: existing ? existing.sourceTestCaseId : source?.kind === 'execution' ? source.execution.testCaseId : undefined, updatedAt: new Date().toISOString() }
  let next = { ...state, items: existing ? state.items.map(item => item.id === saved.id ? saved : item) : [...state.items, saved] }
  if (!existing && saved.source) next = linkSourceDefect(next, projectId, saved.source, saved.id, sources)
  return next
}
