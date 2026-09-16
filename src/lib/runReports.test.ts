// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
import { createProjectSetupMockData } from '@/data/projectSetupMockData'
import { createSmokeMockData } from '@/data/smokeMockData'
import { createTestRun, saveExecution } from './testRuns'
import { changeSmokeRunStatus, createSmokeRun, saveSmokeExecution, saveSmokeRunPrerequisite } from './smoke'
import { linkSourceDefect } from './defects'
import { smokeRunReport, testRunReport } from './runReports'
import type { DefectsState } from '@/types'

const projectId = 'voicli'
function defects(): DefectsState {
  return { items: [{ id: 'bug-1', projectId, code: 'BUG-001', title: 'Shared issue', description: '', stepsToReproduce: '', expectedResult: '', actualResult: '', severity: 'Major', priority: 'Medium', status: 'New', browser: '', deviceOrOs: '', evidenceNote: '', externalTaskUrl: '', createdAt: '', updatedAt: '' }], links: [] }
}

describe('Derived Run Reports', () => {
  it('calculates Test Run counts from executions and keeps snapshots/defect links read-only', () => {
    const cases = structuredClone(initialTestCasesByProject.voicli), setup = createProjectSetupMockData()
    let data = createTestRun(projectId, { name: 'Regression 2.6', testCaseIds: cases.items.slice(0, 3).map(item => item.id), environmentId: 'env-voicli-staging', buildId: 'build-voicli-26-rc1', browser: '', deviceOrOs: '', notes: '' }, cases.items, [], cases.areas, cases.types, [], setup)
    data = saveExecution(data, projectId, data.executions[0].id, { result: 'Pass', actualResult: '', comment: '', evidenceNote: '' }, 42)
    data = saveExecution(data, projectId, data.executions[1].id, { result: 'Fail', actualResult: 'Broken', comment: '', evidenceNote: '' }, 42)
    const before = structuredClone(data), source = { testRuns: data, smoke: createSmokeMockData(cases.items), audits: { audits: [], checks: [], findings: [] } }
    const state = linkSourceDefect(defects(), projectId, { type: 'testExecution', id: data.executions[1].id }, 'bug-1', source)
    const report = testRunReport(data, state, projectId, data.runs[0])
    expect(report).toMatchObject({ total: 3, done: 2, remaining: 1, counts: { 'Not Run': 1, Pass: 1, Fail: 1, Blocked: 0, Skipped: 0 } })
    expect(report.executions[1].defects.map(item => item.code)).toEqual(['BUG-001'])
    expect(report.executions[1].testCaseSnapshot.title).toBe('Wrong password')
    cases.items[1].title = 'Changed live case'
    expect(report.executions[1].testCaseSnapshot.title).toBe('Wrong password')
    expect(data).toEqual(before)
  })

  it('calculates empty/not-run Smoke execution and prerequisite summaries with typed Defect links', () => {
    const cases = structuredClone(initialTestCasesByProject.voicli), setup = createProjectSetupMockData()
    let smoke = createSmokeMockData(cases.items)
    smoke = createSmokeRun(smoke, projectId, smoke.suites[0].id, { environmentId: 'env-voicli-staging', buildId: 'build-voicli-26-rc1', browser: '', deviceOrOs: '', notes: '' }, cases.items, cases.areas, cases.types, 42, setup)
    const initial = smokeRunReport(smoke, defects(), projectId, smoke.runs[0])
    expect(initial).toMatchObject({ total: 2, done: 0, remaining: 2, counts: { 'Not Run': 2 }, prerequisites: { total: 1, checked: 0, remaining: 1, counts: { 'Not Checked': 1, Pass: 0, Fail: 0 } } })
    smoke = saveSmokeExecution(smoke, projectId, smoke.executions[0].id, { result: 'Fail', actualResult: 'Broken', comment: '', evidenceNote: '' }, 42)
    smoke = saveSmokeRunPrerequisite(smoke, projectId, smoke.runPrerequisites[0].id, { result: 'Pass', comment: 'Ready' })
    smoke = changeSmokeRunStatus(smoke, projectId, smoke.runs[0].id, 'Completed')
    const before = structuredClone(smoke), sources = { testRuns: { runs: [], executions: [] }, smoke, audits: { audits: [], checks: [], findings: [] } }
    const state = linkSourceDefect(defects(), projectId, { type: 'smokeExecution', id: smoke.executions[0].id }, 'bug-1', sources)
    const report = smokeRunReport(smoke, state, projectId, smoke.runs[0])
    expect(report).toMatchObject({ total: 2, done: 1, remaining: 1, counts: { 'Not Run': 1, Fail: 1 }, prerequisites: { total: 1, checked: 1, remaining: 0, counts: { 'Not Checked': 0, Pass: 1, Fail: 0 } } })
    expect(report.executions[0].defects[0].code).toBe('BUG-001')
    expect(smoke).toEqual(before)
  })

  it('rejects reports for a different project', () => {
    const cases = initialTestCasesByProject.voicli
    const data = createTestRun(projectId, { name: 'Run', testCaseIds: [cases.items[0].id], browser: '', deviceOrOs: '', notes: '' }, cases.items, [], cases.areas, cases.types)
    expect(() => testRunReport(data, defects(), 'other', data.runs[0])).toThrow()
    const smoke = createSmokeMockData(cases.items)
    expect(() => smokeRunReport(smoke, defects(), 'other', smoke.runs[0])).toThrow()
  })
})
