import type { DefectsState, SmokeRun, SmokeRunPrerequisite, SmokeState, TestRun, TestRunsState } from '@/types'

type ExecutionLike = { id: string; projectId: string; runId: string; testCaseSnapshot: { code: string; title: string }; result: string }

function linked(defects: DefectsState, projectId: string, sourceType: 'testExecution' | 'smokeExecution', sourceId: string) {
  return defects.items.filter(defect => defect.projectId === projectId && defects.links.some(link => link.projectId === projectId && link.sourceType === sourceType && link.sourceId === sourceId && link.defectId === defect.id))
}

function executionReport<T extends ExecutionLike>(executions: T[], defects: DefectsState, projectId: string, sourceType: 'testExecution' | 'smokeExecution') {
  const results = ['Not Run', 'Pass', 'Fail', 'Blocked', 'Skipped'] as const
  const counts = Object.fromEntries(results.map(result => [result, executions.filter(execution => execution.result === result).length])) as Record<typeof results[number], number>
  return {
    total: executions.length,
    done: executions.length - counts['Not Run'],
    remaining: counts['Not Run'],
    counts,
    executions: executions.map(execution => ({ ...execution, defects: linked(defects, projectId, sourceType, execution.id) })),
  }
}

export function testRunReport(data: TestRunsState, defects: DefectsState, projectId: string, run: TestRun) {
  if (run.projectId !== projectId) throw new Error('Test Run належить іншому проєкту.')
  return executionReport(data.executions.filter(execution => execution.projectId === projectId && execution.runId === run.id), defects, projectId, 'testExecution')
}

export function smokeRunReport(data: SmokeState, defects: DefectsState, projectId: string, run: SmokeRun) {
  if (run.projectId !== projectId) throw new Error('Smoke Run належить іншому проєкту.')
  const executions = executionReport(data.executions.filter(execution => execution.projectId === projectId && execution.runId === run.id).sort((a, b) => a.order - b.order), defects, projectId, 'smokeExecution')
  const prerequisites = data.runPrerequisites.filter(item => item.projectId === projectId && item.runId === run.id)
  return { ...executions, prerequisites: prerequisiteSummary(prerequisites) }
}

export function prerequisiteSummary(items: SmokeRunPrerequisite[]) {
  const counts = { 'Not Checked': 0, Pass: 0, Fail: 0 }
  for (const item of items) counts[item.result] += 1
  return { total: items.length, checked: items.length - counts['Not Checked'], remaining: counts['Not Checked'], counts, items }
}
