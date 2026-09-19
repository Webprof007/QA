import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createChecklistRunApi, createDefectRetestApi, createDefectSourceLinkApi, createSmokeRunApi, createTestRunApi,
  loadBuilds, loadChecklistRunItems, loadChecklistRuns, loadChecklists, loadDefectRetests, loadDefectSourceLinks,
  loadDefects, loadEnvironments, loadReleases, loadSmokeExecutions, loadSmokePrerequisites, loadSmokeRunPrerequisites,
  loadSmokeRuns, loadSmokeSuiteLinks, loadSmokeSuites, loadTestExecutions, loadTestRuns, replaceSmokePrerequisitesApi,
  saveBuildApi, saveChecklistApi, saveChecklistRunItemApi, saveDefectApi, saveEnvironmentApi, saveReleaseApi,
  saveSmokeExecutionApi, saveSmokeRunPrerequisiteApi, saveSmokeSuiteApi, saveSmokeSuiteLinksApi,
  saveTestExecutionApi, updateChecklistRunApi, updateSmokeRunApi, updateTestRunStatusApi,
} from './qaApi'
import type { Build, Checklist, Defect, Environment, Release, SmokeRunPrerequisite, SmokeSuite } from '@/types'

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const snapshot = { id: 21, code: 'TC-021', title: 'Login', areaId: 7, areaLabel: 'Auth', typeId: 5, typeLabel: 'Functional', priority: 'high', status: 'active', preconditions: ['Account'], steps: [{ id: 91, action: 'Open', expectedResult: 'Opened', sortOrder: 0 }], postconditions: [], notes: '' }
const run = { id: 41, projectId: 3, name: 'Regression', status: 'Draft', testPlanId: null, testPlanTitleSnapshot: '', sourceSuiteId: 31, sourceTestSuiteCodeSnapshot: 'TS-001', sourceTestSuiteNameSnapshot: 'Regression', environmentId: 8, environmentNameSnapshot: 'Staging', buildId: 10, buildVersionSnapshot: '2.6-rc1', browser: '', deviceOrOs: '', notes: '', createdAt: 'now', updatedAt: 'now' }
const execution = { id: 51, projectId: 3, runId: 41, testCaseId: 21, testCaseSnapshot: snapshot, order: 0, result: 'Not Run', actualResult: '', comment: '', evidenceNote: '' }

afterEach(() => vi.unstubAllGlobals())

describe('API-backed project execution modules', () => {
  it('normalizes and mutates shared Environment, Release and Build catalogs', async () => {
    const environment = { id: 8, projectId: 3, name: 'Staging', description: null, baseUrl: null, isActive: true, createdAt: 'now', updatedAt: 'now' }
    const release = { id: 9, projectId: 3, name: '2.6', description: null, status: 'Active', startDate: null, releaseDate: null, createdAt: 'now', updatedAt: 'now' }
    const build = { id: 10, projectId: 3, version: '2.6-rc1', releaseId: 9, description: null, createdAt: 'now', updatedAt: 'now' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, environments: [environment] }))
      .mockResolvedValueOnce(json({ success: true, releases: [release] }))
      .mockResolvedValueOnce(json({ success: true, builds: [build] }))
      .mockResolvedValueOnce(json({ success: true, environment }))
      .mockResolvedValueOnce(json({ success: true, release }))
      .mockResolvedValueOnce(json({ success: true, build }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadEnvironments('3')).resolves.toEqual([expect.objectContaining({ id: '8', projectId: '3' })])
    await expect(loadReleases('3')).resolves.toEqual([expect.objectContaining({ id: '9', projectId: '3' })])
    await expect(loadBuilds('3')).resolves.toEqual([expect.objectContaining({ id: '10', releaseId: '9' })])
    await saveEnvironmentApi({ ...environment, id: '8', projectId: '3', description: '', baseUrl: '' } as Environment, false)
    await saveReleaseApi({ ...release, id: '9', projectId: '3', description: '', startDate: '', releaseDate: '' } as Release, false)
    await saveBuildApi({ ...build, id: '10', projectId: '3', releaseId: '9', description: '' } as Build, false)
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual(expect.objectContaining({ projectId: 3, id: 8, description: null }))
    expect(JSON.parse(fetch.mock.calls[5][1].body)).toEqual(expect.objectContaining({ projectId: 3, id: 10, releaseId: 9 }))
  })

  it('creates Test Runs from ordered IDs and uses backend execution snapshots and lifecycle', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, testRuns: [run] }))
      .mockResolvedValueOnce(json({ success: true, testExecutions: [execution] }))
      .mockResolvedValueOnce(json({ success: true, testRun: run, executions: [execution] }, 201))
      .mockResolvedValueOnce(json({ success: true, testExecution: { ...execution, result: 'Pass', executedAt: 'later' } }))
      .mockResolvedValueOnce(json({ success: true, testRun: { ...run, status: 'Completed', completedAt: 'later' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadTestRuns('3')).resolves.toEqual([expect.objectContaining({ id: '41', sourceTestSuiteId: '31', environmentId: '8', buildId: '10' })])
    await expect(loadTestExecutions('3')).resolves.toEqual([expect.objectContaining({ id: '51', testCaseSnapshot: expect.objectContaining({ id: '21', steps: [expect.objectContaining({ id: '91' })] }) })])
    const created = await createTestRunApi('3', { name: 'Regression', testCaseIds: ['21', '22'], sourceTestSuiteId: '31', environmentId: '8', buildId: '10', browser: '', deviceOrOs: '', notes: '' })
    expect(created.executions[0].testCaseSnapshot.title).toBe('Login')
    expect(JSON.parse(fetch.mock.calls[2][1].body).testCaseIds).toEqual([21, 22])
    await expect(saveTestExecutionApi('3', '51', { result: 'Pass', actualResult: 'OK', comment: '', evidenceNote: '' })).resolves.toEqual(expect.objectContaining({ result: 'Pass' }))
    await expect(updateTestRunStatusApi('3', '41', 'Completed')).resolves.toEqual(expect.objectContaining({ status: 'Completed' }))
  })

  it('persists Defects, typed source links and immutable Retests through their own endpoints', async () => {
    const defect = { id: 61, projectId: 3, code: 'BUG-001', title: 'Login fails', description: '', stepsToReproduce: '', expectedResult: '', actualResult: '', severity: 'Major', priority: 'Medium', status: 'Open', areaId: 7, environmentId: 8, environmentNameSnapshot: 'Staging', buildId: 10, buildVersionSnapshot: '2.6-rc1', browser: '', deviceOrOs: '', evidenceNote: '', sourceTestCaseId: 21, externalTaskUrl: null, createdAt: 'now', updatedAt: 'now' }
    const retest = { id: 71, projectId: 3, defectId: 61, sourceTestCaseId: 21, sourceExecutionId: 51, testCaseSnapshot: snapshot, environmentId: 8, environmentNameSnapshot: 'Staging', buildId: 10, buildVersionSnapshot: '2.6-rc1', result: 'Pass', actualResult: 'Fixed', comment: '', evidenceNote: '', executedByUserId: 42, executedAt: 'later', createdAt: 'later' }
    const link = { projectId: 3, sourceType: 'testExecution', sourceId: 51, defectId: 61 }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, defects: [defect] }))
      .mockResolvedValueOnce(json({ success: true, links: [link] }))
      .mockResolvedValueOnce(json({ success: true, defectRetests: [retest] }))
      .mockResolvedValueOnce(json({ success: true, defect }))
      .mockResolvedValueOnce(json({ success: true }))
      .mockResolvedValueOnce(json({ success: true, defectRetest: retest }, 201))
    vi.stubGlobal('fetch', fetch)
    await expect(loadDefects('3')).resolves.toEqual([expect.objectContaining({ id: '61', areaId: '7' })])
    await expect(loadDefectSourceLinks('3')).resolves.toEqual([{ projectId: '3', sourceType: 'testExecution', sourceId: '51', defectId: '61' }])
    await expect(loadDefectRetests('3')).resolves.toEqual([expect.objectContaining({ id: '71', testCaseSnapshot: expect.objectContaining({ id: '21' }) })])
    await saveDefectApi({ ...defect, id: '61', projectId: '3', areaId: '7', environmentId: '8', buildId: '10', sourceTestCaseId: '21', externalTaskUrl: '' } as Defect, false)
    await createDefectSourceLinkApi({ projectId: '3', sourceType: 'testExecution', sourceId: '51', defectId: '61' })
    await createDefectRetestApi('3', '61', { environmentId: '8', buildId: '10', result: 'Pass', actualResult: 'Fixed', comment: '', evidenceNote: '' })
    expect(JSON.parse(fetch.mock.calls[4][1].body)).toEqual({ projectId: 3, sourceType: 'testExecution', sourceId: 51, defectId: 61 })
  })

  it('hydrates Checklist snapshots and persists definition, run item and completion separately', async () => {
    const checklist = { id: 81, projectId: 3, title: 'Release checks', areaId: 7, description: null, items: [{ id: 82, checklistId: 81, text: 'Open app', sortOrder: 0 }], createdAt: 'now', updatedAt: 'now' }
    const checklistRun = { id: 83, projectId: 3, checklistId: 81, titleSnapshot: 'Release checks', status: 'In Progress', startedAt: 'now', completedAt: null }
    const item = { id: 84, runId: 83, checklistItemId: 82, textSnapshot: 'Open app', result: 'Not Run', comment: '' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, checklists: [checklist] }))
      .mockResolvedValueOnce(json({ success: true, checklistRuns: [checklistRun] }))
      .mockResolvedValueOnce(json({ success: true, items: [item] }))
      .mockResolvedValueOnce(json({ success: true, checklist }))
      .mockResolvedValueOnce(json({ success: true, checklistRun }))
      .mockResolvedValueOnce(json({ success: true, item: { ...item, result: 'Pass' } }))
      .mockResolvedValueOnce(json({ success: true, checklistRun: { ...checklistRun, status: 'Completed', completedAt: 'later' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadChecklists('3')).resolves.toEqual([expect.objectContaining({ id: '81', items: [expect.objectContaining({ id: '82', order: 0 })] })])
    await expect(loadChecklistRuns('3')).resolves.toEqual([expect.objectContaining({ id: '83', items: [] })])
    await expect(loadChecklistRunItems('3')).resolves.toEqual([expect.objectContaining({ id: '84', runId: '83' })])
    const input = { ...checklist, id: '81', projectId: '3', areaId: '7', description: '', items: [{ id: '82', checklistId: '81', text: 'Open app', order: 0 }] } as Checklist
    await saveChecklistApi(input, false)
    await createChecklistRunApi('3', '81')
    await saveChecklistRunItemApi('3', { id: '84', runId: '83', checklistItemId: '82', textSnapshot: 'Open app', result: 'Pass', comment: '' })
    await expect(updateChecklistRunApi('3', '83', 'Completed')).resolves.toEqual(expect.objectContaining({ status: 'Completed' }))
  })

  it('hydrates normalized Smoke definitions and historical run data and persists ordered membership/results', async () => {
    const suite = { id: 91, projectId: 3, code: 'SMK-001', name: 'Critical', description: null, createdAt: 'now', updatedAt: 'now' }
    const prerequisite = { id: 92, projectId: 3, smokeSuiteId: 91, text: 'API ready', sortOrder: 0 }
    const smokeRun = { id: 93, projectId: 3, suiteId: 91, suiteCodeSnapshot: 'SMK-001', suiteNameSnapshot: 'Critical', environmentId: 8, environmentNameSnapshot: 'Staging', buildId: 10, buildVersionSnapshot: '2.6-rc1', browser: '', deviceOrOs: '', status: 'Draft', notes: '', createdAt: 'now', updatedAt: 'now' }
    const runPrerequisite = { id: 94, projectId: 3, runId: 93, sourcePrerequisiteId: 92, textSnapshot: 'API ready', order: 0, result: 'Not Checked', comment: '' }
    const smokeExecution = { ...execution, id: 95, runId: 93 }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, smokeSuites: [suite] }))
      .mockResolvedValueOnce(json({ success: true, links: [{ projectId: 3, smokeSuiteId: 91, testCaseId: 21, sortOrder: 0 }] }))
      .mockResolvedValueOnce(json({ success: true, prerequisites: [prerequisite] }))
      .mockResolvedValueOnce(json({ success: true, smokeRuns: [smokeRun] }))
      .mockResolvedValueOnce(json({ success: true, prerequisites: [runPrerequisite] }))
      .mockResolvedValueOnce(json({ success: true, executions: [smokeExecution] }))
      .mockResolvedValueOnce(json({ success: true, smokeSuite: suite }))
      .mockResolvedValueOnce(json({ success: true }))
      .mockResolvedValueOnce(json({ success: true }))
      .mockResolvedValueOnce(json({ success: true, smokeRun, prerequisites: [runPrerequisite], executions: [smokeExecution] }))
      .mockResolvedValueOnce(json({ success: true, smokeRun: { ...smokeRun, status: 'In Progress', startedAt: 'later' } }))
      .mockResolvedValueOnce(json({ success: true, prerequisite: { ...runPrerequisite, result: 'Pass' } }))
      .mockResolvedValueOnce(json({ success: true, execution: { ...smokeExecution, result: 'Fail' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadSmokeSuites('3')).resolves.toEqual([expect.objectContaining({ id: '91', description: '' })])
    await expect(loadSmokeSuiteLinks('3')).resolves.toEqual([{ projectId: '3', suiteId: '91', testCaseId: '21', order: 0 }])
    await expect(loadSmokePrerequisites('3')).resolves.toEqual([expect.objectContaining({ id: '92', suiteId: '91' })])
    await expect(loadSmokeRuns('3')).resolves.toEqual([expect.objectContaining({ id: '93', environmentId: '8' })])
    await expect(loadSmokeRunPrerequisites('3')).resolves.toEqual([expect.objectContaining({ id: '94', sourcePrerequisiteId: '92' })])
    await expect(loadSmokeExecutions('3')).resolves.toEqual([expect.objectContaining({ id: '95', testCaseSnapshot: expect.objectContaining({ title: 'Login' }) })])
    await saveSmokeSuiteApi({ ...suite, id: '91', projectId: '3', description: '' } as SmokeSuite, false)
    await saveSmokeSuiteLinksApi('3', '91', ['21'])
    await replaceSmokePrerequisitesApi('3', '91', [{ text: 'API ready' }])
    await createSmokeRunApi('3', '91', { environmentId: '8', buildId: '10', browser: '', deviceOrOs: '', notes: '' })
    await updateSmokeRunApi('3', '93', 'In Progress')
    await saveSmokeRunPrerequisiteApi('3', { ...runPrerequisite, id: '94', projectId: '3', runId: '93', sourcePrerequisiteId: '92' } as SmokeRunPrerequisite)
    await expect(saveSmokeExecutionApi('3', '95', { result: 'Fail', actualResult: 'Broken', comment: '', evidenceNote: '' })).resolves.toEqual(expect.objectContaining({ result: 'Fail' }))
    expect(JSON.parse(fetch.mock.calls[7][1].body)).toEqual({ projectId: 3, smokeSuiteId: 91, testCaseIds: [21] })
  })
})
