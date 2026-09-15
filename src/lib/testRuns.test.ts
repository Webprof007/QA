import { describe, expect, it } from 'vitest'
import { createTestRun, changeRunStatus, saveExecution, runCounts, executionResults, type RunInput } from './testRuns'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
import type { TestPlan } from '@/types'
const source = () => structuredClone(initialTestCasesByProject.voicli)
const input: RunInput = { name: 'Regression', environment: 'Staging', build: '2.4-rc3', browser: 'Chrome', deviceOrOs: 'macOS', notes: '', testCaseIds: ['demo-test-case-1', 'demo-test-case-2'] }
const create = () => { const data = source(); return createTestRun('voicli', input, data.items, [], data.areas, data.types) }

describe('Test Run execution model', () => {
  it('creates unique runs and executions, without requiring a unique name', () => {
    const first = create(), second = create()
    expect(first.runs[0].name).toBe(second.runs[0].name)
    expect(first.runs[0].id).not.toBe(second.runs[0].id)
    expect(first.runs[0].status).toBe('Draft'); expect(first.runs[0].startedAt).toBeNull()
    expect(first.executions).toHaveLength(2)
    expect(new Set(first.executions.map(item => item.id)).size).toBe(2)
    for (const execution of first.executions) { expect(execution.result).toBe('Not Run'); expect(execution.runId).toBe(first.runs[0].id); expect(execution.projectId).toBe('voicli') }
  })
  it('deep copies all test content and dictionary labels', () => {
    const data = source(); data.items[0].postconditions = ['Restore state']
    const state = createTestRun('voicli', input, data.items, [], data.areas, data.types), snapshot = state.executions[0].testCaseSnapshot
    expect(snapshot).toMatchObject({ code: 'TC-001', title: 'Login valid user', areaName: 'Auth', typeName: 'Functional', priority: 'high', status: 'active', postconditions: ['Restore state'] })
    const expected = structuredClone(snapshot)
    data.items[0].title = 'Changed'; data.items[0].steps[0].action = 'Changed action'; data.items[0].steps[0].expectedResult = 'Changed expected'; data.items[0].preconditions[0] = 'Changed'; data.items[0].postconditions[0] = 'Changed'; data.items[0].notes = 'Changed'; data.areas.find(area => area.id === data.items[0].areaId)!.name = 'Renamed'; data.types[0].name = 'Renamed'
    expect(snapshot).toEqual(expected)
  })
  it('rejects missing cases and cross-project cases/plans', () => {
    const data = source()
    expect(() => createTestRun('voicli', { ...input, testCaseIds: [] }, data.items, [], data.areas, data.types)).toThrow()
    expect(() => createTestRun('qp-notes', input, data.items, [], data.areas, data.types)).toThrow()
    const otherPlan = { id: 'other-plan', projectId: 'qp-notes' } as TestPlan
    expect(() => createTestRun('voicli', { ...input, testPlanId: otherPlan.id }, data.items, [otherPlan], data.areas, data.types)).toThrow()
  })
  it.each(executionResults.filter(value => value !== 'Not Run'))('records %s separately with timestamps and user, leaving the source and other execution unchanged', result => {
    const state = create(), before = structuredClone(state)
    const next = saveExecution(state, 'voicli', state.executions[0].id, { result, actualResult: 'Actual', comment: 'Reason', evidenceNote: 'Evidence' }, 42)
    expect(next.runs[0].status).toBe('In Progress'); expect(next.runs[0].startedAt).toBeTruthy()
    expect(next.executions[0]).toMatchObject({ result, actualResult: 'Actual', comment: 'Reason', evidenceNote: 'Evidence', executedByUserId: 42 })
    expect(next.executions[0].executedAt).toBeTruthy(); expect(next.executions[0].testCaseSnapshot).toEqual(before.executions[0].testCaseSnapshot)
    expect(next.executions[1]).toEqual(before.executions[1]); expect(state).toEqual(before)
    expect(runCounts(next.executions)).toMatchObject({ done: 1, total: 2, counts: { [result]: 1, 'Not Run': 1 } })
    const cleared = saveExecution(next, 'voicli', next.executions[0].id, { result: 'Not Run', actualResult: '', comment: '', evidenceNote: '' }, 42)
    expect(cleared.executions[0].executedAt).toBeUndefined(); expect(cleared.executions[0].executedByUserId).toBeUndefined(); expect(runCounts(cleared.executions).done).toBe(0)
  })
  it('starts explicitly, completes with Not Run and prevents historical and foreign-project changes', () => {
    const state = create(), id = state.runs[0].id
    const started = changeRunStatus(state, 'voicli', id, 'In Progress')
    expect(started.runs[0].status).toBe('In Progress'); expect(started.runs[0].startedAt).toBeTruthy()
    const completed = changeRunStatus(started, 'voicli', id, 'Completed')
    expect(completed.runs[0].completedAt).toBeTruthy(); expect(completed.executions[0].result).toBe('Not Run')
    expect(changeRunStatus(completed, 'voicli', id, 'In Progress')).toEqual(completed)
    expect(saveExecution(completed, 'voicli', completed.executions[0].id, { result: 'Pass', actualResult: '', comment: '', evidenceNote: '' }, 42)).toBe(completed)
    expect(saveExecution(state, 'qp-notes', state.executions[0].id, { result: 'Fail', actualResult: '', comment: '', evidenceNote: '' })).toBe(state)
    expect(changeRunStatus(state, 'qp-notes', id, 'Completed')).toEqual(state)
  })
})
