// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createDefectsMockData } from '@/data/defectsMockData'
import { createProjectSetupMockData } from '@/data/projectSetupMockData'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
import { createTestRun, saveExecution } from './testRuns'
import { defectFromExecution, newDefect } from './defects'
import { saveRetest, retestSource, retestTransition, retestHistory, type RetestInput } from './defectRetests'
import type { DefectRetest, DefectsState } from '@/types'
const input: RetestInput = { environmentId: 'env-voicli-staging', buildId: 'build-voicli-26-rc2', result: 'Pass', actualResult: 'Fixed output', comment: 'Verified twice', evidenceNote: 'Evidence note' }
function fixture() {
  const data = structuredClone(initialTestCasesByProject.voicli), setup = createProjectSetupMockData()
  let runs = createTestRun('voicli', { name: 'Incident', environmentId: input.environmentId, buildId: 'build-voicli-26-rc1', testCaseIds: [data.items[0].id], browser: '', deviceOrOs: '', notes: '' }, data.items, [], data.areas, data.types, [], setup)
  runs = saveExecution(runs, 'voicli', runs.executions[0].id, { result: 'Fail', actualResult: 'Original error', comment: '', evidenceNote: '' }, 42)
  const defect = { ...defectFromExecution(newDefect('voicli', []), runs.executions[0], runs.runs[0], data.areas), status: 'Ready for Retest' as const }
  const state: DefectsState = { items: [defect], links: [{ projectId: 'voicli', sourceType: 'testExecution', sourceId: runs.executions[0].id, defectId: defect.id }] }
  const save = (retests: DefectRetest[] = [], draft = input) => saveRetest(retests, 'voicli', defect.id, draft, state.items, data.items, runs, setup, data.areas, data.types, 42)
  return { data, setup, runs, defect, state, save }
}
describe('Defect focused retests', () => {
  it.each(['Pass', 'Fail', 'Blocked'] as const)('appends immutable %s verification separately with actor/date and own context', result => {
    const f = fixture(), before = structuredClone({ state: f.state, runs: f.runs })
    const history = f.save([], { ...input, result }), second = f.save(history, { ...input, result })
    expect(history).toHaveLength(1); expect(second).toHaveLength(2); expect(second[0]).toEqual(history[0]); expect(second[1].id).not.toBe(history[0].id)
    expect(second[1]).toMatchObject({ projectId: 'voicli', defectId: f.defect.id, sourceTestCaseId: f.data.items[0].id, sourceExecutionId: f.runs.executions[0].id, ...input, result, environmentNameSnapshot: 'Staging', buildVersionSnapshot: '2.6.0-rc2', executedByUserId: 42 })
    expect(second[1].executedAt).toBeTruthy(); expect(second[1].createdAt).toBe(second[1].executedAt)
    expect(second[1]).not.toHaveProperty('runId'); expect(f.defect).not.toHaveProperty('retests')
    expect({ state: f.state, runs: f.runs }).toEqual(before)
    expect(f.defect.buildVersionSnapshot).toBe('2.6.0-rc1')
  })
  it('uses current central case version, freezes past retests and falls back to source execution then previous retest', () => {
    const f = fixture(), first = f.save(), snapshot = structuredClone(first[0].testCaseSnapshot)
    f.data.items[0].title = 'Current definition'; f.data.items[0].steps[0].expectedResult = 'Current expected'
    const second = f.save(first)
    expect(second[1].testCaseSnapshot?.title).toBe('Current definition'); expect(second[0].testCaseSnapshot).toEqual(snapshot)
    const fallback = retestSource(f.defect, [], f.runs, f.data.areas, f.data.types, second)
    expect(fallback.testCaseSnapshot).toEqual(f.runs.executions[0].testCaseSnapshot)
    const previous = retestSource(f.defect, [], { runs: [], executions: [] }, [], [], second)
    expect(previous.testCaseSnapshot?.title).toBe('Current definition')
    f.runs.executions[0].testCaseSnapshot.title = 'Changed source'
    expect(second[0].testCaseSnapshot).toEqual(snapshot)
  })
  it('freezes manual defect fallback context without inventing a TestCase', () => {
    const f = fixture(), manual = createDefectsMockData().items[2]
    const first = saveRetest([], 'voicli', manual.id, input, [manual], [], { runs: [], executions: [] }, f.setup, [], [], 42)
    expect(first[0].testCaseSnapshot).toBeUndefined(); expect(first[0].defectContextSnapshot?.stepsToReproduce).toBe(manual.stepsToReproduce)
    manual.stepsToReproduce = 'Edited definition'; expect(first[0].defectContextSnapshot?.stepsToReproduce).not.toBe(manual.stepsToReproduce)
  })
  it('validates defect, current Environment/Build and case/execution project ownership', () => {
    const f = fixture()
    expect(() => f.save([], { ...input, environmentId: undefined })).toThrow()
    expect(() => f.save([], { ...input, environmentId: 'missing' })).toThrow()
    expect(() => f.save([], { ...input, buildId: 'missing' })).toThrow()
    f.setup.environments[1].projectId = 'foreign'; expect(() => f.save()).toThrow(); f.setup.environments[1].projectId = 'voicli'
    f.setup.builds[2].projectId = 'foreign'; expect(() => f.save()).toThrow(); f.setup.builds[2].projectId = 'voicli'
    f.setup.environments[1].isActive = false; expect(() => f.save()).toThrow(); f.setup.environments[1].isActive = true
    f.data.items[0].projectId = 'foreign'; expect(() => f.save()).toThrow(); f.data.items[0].projectId = 'voicli'
    f.runs.executions[0].projectId = 'foreign'; expect(() => f.save()).toThrow(); f.runs.executions[0].projectId = 'voicli'
    f.defect.projectId = 'foreign'; expect(() => f.save()).toThrow()
  })
  it('keeps history snapshots after catalog renames and deletion, new attempts capture new labels', () => {
    const f = fixture(), first = f.save()
    f.setup.environments[1].name = 'Renamed'; f.setup.builds[2].version = 'Renamed version'
    const second = f.save(first)
    expect(first[0]).toMatchObject({ environmentNameSnapshot: 'Staging', buildVersionSnapshot: '2.6.0-rc2' })
    expect(second[1]).toMatchObject({ environmentNameSnapshot: 'Renamed', buildVersionSnapshot: 'Renamed version' })
    f.setup.environments = []; f.setup.builds = []
    expect(second[0]).toEqual(first[0]); expect(f.defect.buildVersionSnapshot).toBe('2.6.0-rc1')
  })
  it('supports explicit status transitions only after matching latest outcomes and preserves incident and links', () => {
    const f = fixture(), failed = f.save([], { ...input, result: 'Fail' })
    expect(f.defect.status).toBe('Ready for Retest')
    const reopened = retestTransition(f.state, 'voicli', f.defect.id, 'Reopen Defect', failed, failed[0].id)
    expect(reopened.items[0].status).toBe('Open'); expect(reopened.items[0].buildVersionSnapshot).toBe('2.6.0-rc1'); expect(reopened.links).toEqual(f.state.links)
    const ready = retestTransition(reopened, 'voicli', f.defect.id, 'Ready for Retest', failed)
    const passed = saveRetest(failed, 'voicli', f.defect.id, input, ready.items, f.data.items, f.runs, f.setup, f.data.areas, f.data.types, 42)
    const closed = retestTransition(ready, 'voicli', f.defect.id, 'Close Defect', passed, passed[1].id)
    expect(closed.items[0].status).toBe('Closed'); expect(passed).toHaveLength(2)
    expect(() => saveRetest(passed, 'voicli', f.defect.id, input, closed.items, f.data.items, f.runs, f.setup, [], [], 42)).toThrow()
    expect(() => retestTransition(f.state, 'voicli', f.defect.id, 'Close Defect', failed, failed[0].id)).toThrow()
    expect(() => retestTransition(ready, 'voicli', f.defect.id, 'Reopen Defect', passed, failed[0].id)).toThrow()
    expect(() => retestTransition(ready, 'foreign', f.defect.id, 'Close Defect', passed, passed[1].id)).toThrow()
    const blocked = f.save([], { ...input, result: 'Blocked' }); expect(() => retestTransition(f.state, 'voicli', f.defect.id, 'Close Defect', blocked, blocked[0].id)).toThrow()
    const newlyOpened = retestTransition({ items: [{ ...f.defect, status: 'New' }], links: [] }, 'voicli', f.defect.id, 'Open', [])
    expect(newlyOpened.items[0].status).toBe('Open')
  })
  it.each(['New', 'Open', 'In Progress', 'Closed', 'Rejected', 'Duplicate'] as const)('rejects retest save for %s', status => {
    const f = fixture(); f.state.items = [{ ...f.defect, status }]; expect(() => f.save()).toThrow()
  })
  it('derives stable chronological numbering and excludes foreign histories', () => {
    const f = fixture(), history = f.save(f.save())
    expect(retestHistory([...history, { ...history[0], id: 'foreign', projectId: 'foreign' }], 'voicli', f.defect.id)).toEqual(history)
  })
})
