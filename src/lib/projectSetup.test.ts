// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createProjectSetupMockData } from '@/data/projectSetupMockData'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
import { createSmokeMockData } from '@/data/smokeMockData'
import { saveBuild, saveEnvironment, saveRelease, resolveProjectContext, deleteSetupEntity } from './projectSetup'
import { createTestRun, changeRunStatus, saveExecution } from './testRuns'
import { createSmokeRun, changeSmokeRunStatus, saveSmokeExecution } from './smoke'
import { defectFromExecution, newDefect, saveDefect } from './defects'
const cases = initialTestCasesByProject.voicli
const selected = { environmentId: 'env-voicli-staging', buildId: 'build-voicli-26-rc1' }
const input = { ...selected, name: 'Release run', testCaseIds: [cases.items[0].id], browser: '', deviceOrOs: '', notes: '' }
const create = (setup = createProjectSetupMockData()) => createTestRun('voicli', input, cases.items, [], cases.areas, cases.types, [], setup)
const expected = { ...selected, environmentNameSnapshot: 'Staging', buildVersionSnapshot: '2.6.0-rc1' }
describe('Shared project setup', () => {
  it('supports many entities per project, separate technical IDs, optional release and edits', () => {
    let state = createProjectSetupMockData()
    const env = { ...state.environments[0], id: 'new-env', name: 'QA', baseUrl: 'https://qa.example.com' }
    state = saveEnvironment(state, 'voicli', env)
    state = saveEnvironment(state, 'voicli', { ...env, name: 'QA renamed', isActive: false })
    expect(state.environments).toHaveLength(4); expect(state.environments.find(item => item.id === env.id)).toMatchObject({ name: 'QA renamed', isActive: false })
    state = saveRelease(state, 'voicli', { ...state.releases[0], id: 'new-release', name: 'Next', status: 'Planning' })
    state = saveBuild(state, 'voicli', { ...state.builds[0], id: 'standalone', version: 'Nightly', releaseId: undefined })
    state = saveBuild(state, 'voicli', { ...state.builds[0], id: 'related', version: 'Next rc', releaseId: 'new-release' })
    expect(state.releases).toHaveLength(3); expect(state.builds).toHaveLength(5)
    expect(state.builds.find(item => item.id === 'related')?.releaseId).toBe('new-release')
    expect(state.builds.find(item => item.id === 'standalone')?.releaseId).toBeUndefined()
  })
  it('rejects cross-project entity writes and build to release relations', () => {
    const state = createProjectSetupMockData()
    expect(() => saveEnvironment(state, 'qp-notes', state.environments[0])).toThrow()
    expect(() => saveRelease(state, 'qp-notes', state.releases[0])).toThrow()
    expect(() => saveBuild(state, 'qp-notes', { ...state.builds[0], projectId: 'qp-notes', id: 'foreign' })).toThrow()
    expect(() => saveBuild(state, 'voicli', { ...state.builds[0], releaseId: 'missing' })).toThrow()
    expect(() => saveEnvironment(state, 'voicli', { ...state.environments[0], name: ' ' })).toThrow()
    expect(() => saveEnvironment(state, 'voicli', { ...state.environments[0], baseUrl: 'javascript:alert(1)' })).toThrow()
  })
  it('keeps existing archived release links but rejects assigning archived releases to new builds', () => {
    let state = createProjectSetupMockData()
    state = saveRelease(state, 'voicli', { ...state.releases[0], status: 'Archived' })
    expect(() => saveBuild(state, 'voicli', { ...state.builds[0], description: 'Edit existing' })).not.toThrow()
    expect(() => saveBuild(state, 'voicli', { ...state.builds[0], id: 'new' })).toThrow()
  })
  it('resolves IDs to snapshots and rejects inactive, foreign or missing choices', () => {
    let state = createProjectSetupMockData()
    expect(resolveProjectContext(state, 'voicli', selected)).toEqual(expected)
    expect(() => resolveProjectContext(state, 'qp-notes', selected)).toThrow()
    expect(() => resolveProjectContext(state, 'voicli', { buildId: 'missing' })).toThrow()
    state = saveEnvironment(state, 'voicli', { ...state.environments[1], isActive: false })
    expect(() => resolveProjectContext(state, 'voicli', selected)).toThrow()
    expect(resolveProjectContext(state, 'voicli', selected, expected)).toEqual(expected)
  })
  it('TestRun snapshots survive rename and deletion, and completed executions stay read-only', () => {
    let setup = createProjectSetupMockData()
    const run = create(setup), frozen = structuredClone(run)
    expect(run.runs[0]).toMatchObject(expected); expect(run.runs[0]).not.toHaveProperty('environment'); expect(run.runs[0]).not.toHaveProperty('build')
    setup = saveEnvironment(setup, 'voicli', { ...setup.environments[1], name: 'Renamed stage' })
    setup = saveBuild(setup, 'voicli', { ...setup.builds[1], version: 'Renamed build' })
    expect(create(setup).runs[0]).toMatchObject({ environmentNameSnapshot: 'Renamed stage', buildVersionSnapshot: 'Renamed build' })
    setup = deleteSetupEntity(setup, 'voicli', 'environments', selected.environmentId)
    setup = deleteSetupEntity(setup, 'voicli', 'builds', selected.buildId)
    expect(setup.environments.some(item => item.id === selected.environmentId)).toBe(false)
    expect(setup.builds.some(item => item.id === selected.buildId)).toBe(false)
    expect(run).toEqual(frozen)
    const completed = changeRunStatus(run, 'voicli', run.runs[0].id, 'Completed')
    expect(saveExecution(completed, 'voicli', run.executions[0].id, { result: 'Pass', actualResult: '', comment: '', evidenceNote: '' })).toBe(completed)
  })
  it('SmokeRun uses the same entities/snapshots and keeps its own completion guard', () => {
    const setup = createProjectSetupMockData(), seed = createSmokeMockData(cases.items)
    const state = createSmokeRun(seed, 'voicli', seed.suites[0].id, input, cases.items, cases.areas, cases.types, 42, setup)
    expect(state.runs[0]).toMatchObject(expected)
    const completed = changeSmokeRunStatus(state, 'voicli', state.runs[0].id, 'Completed')
    expect(saveSmokeExecution(completed, 'voicli', state.executions[0].id, { result: 'Pass', actualResult: '', comment: '', evidenceNote: '' }, 42)).toBe(completed)
    expect(() => createSmokeRun(seed, 'voicli', seed.suites[0].id, { ...input, environmentId: 'foreign' }, cases.items, cases.areas, cases.types, 42, setup)).toThrow()
  })
  it('Defect copies incident context from Fail, preserves it on unrelated edits and updates explicit choices', () => {
    let setup = createProjectSetupMockData(), runs = create(setup)
    runs = saveExecution(runs, 'voicli', runs.executions[0].id, { result: 'Fail', actualResult: 'Error', comment: '', evidenceNote: '' }, 42)
    const draft = defectFromExecution(newDefect('voicli', []), runs.executions[0], runs.runs[0], cases.areas)
    let state = saveDefect({ items: [], links: [] }, draft, 'voicli', 42, runs, cases.areas, setup)
    expect(state.items[0]).toMatchObject(expected)
    setup = saveEnvironment(setup, 'voicli', { ...setup.environments[1], name: 'Changed' })
    setup = saveBuild(setup, 'voicli', { ...setup.builds[1], version: 'Changed' })
    state = saveDefect(state, { ...state.items[0], title: 'Edit title', environmentNameSnapshot: 'Spoofed' }, 'voicli', 42, runs, cases.areas, setup)
    expect(state.items[0]).toMatchObject(expected)
    state = saveDefect(state, { ...state.items[0], environmentId: 'env-voicli-production', buildId: 'build-voicli-25' }, 'voicli', 42, runs, cases.areas, setup)
    expect(state.items[0]).toMatchObject({ environmentNameSnapshot: 'Production', buildVersionSnapshot: '2.5.0' })
    const deleted = deleteSetupEntity(deleteSetupEntity(setup, 'voicli', 'environments', 'env-voicli-production'), 'voicli', 'builds', 'build-voicli-25')
    expect(saveDefect(state, { ...state.items[0], status: 'Closed' }, 'voicli', 42, runs, cases.areas, deleted).items[0]).toMatchObject({ environmentNameSnapshot: 'Production', buildVersionSnapshot: '2.5.0' })
    expect(() => saveDefect({ items: [], links: [] }, { ...newDefect('qp-notes', []), title: 'Foreign', ...selected }, 'qp-notes', 42, { runs: [], executions: [] }, [], setup)).toThrow()
  })
  it('manual defects validate IDs and do not accept supplied snapshot labels as truth', () => {
    const setup = createProjectSetupMockData(), runs = { runs: [], executions: [] }
    const draft = { ...newDefect('voicli', []), title: 'Manual', ...selected, environmentNameSnapshot: 'Arbitrary' }
    expect(saveDefect({ items: [], links: [] }, draft, 'voicli', 42, runs, cases.areas, setup).items[0]).toMatchObject(expected)
    expect(() => saveDefect({ items: [], links: [] }, { ...draft, buildId: 'missing' }, 'voicli', 42, runs, cases.areas, setup)).toThrow()
  })
})
