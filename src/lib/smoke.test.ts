import { describe, expect, it } from 'vitest'
import { createProjectAreaData } from '@/data/projectAreaMockData'
import { createSmokeMockData } from '@/data/smokeMockData'
import { emptySmokeState, saveSmokeSuite, suiteCases, createSmokeRun, changeSmokeRunStatus, saveSmokeExecution, saveSmokeRunPrerequisite, deleteSmokeSuite } from './smoke'
import { runCounts } from './testRuns'
const context = () => { const seed = createProjectAreaData(); return { cases: seed.testCases.voicli.items, areas: seed.areas, types: seed.testCases.voicli.types } }
const metadata = { environment: 'Staging', build: '2.5.0-rc1', browser: 'Chrome', deviceOrOs: 'macOS', notes: 'Release smoke' }
function fixture() { const data = context(); const state = createSmokeMockData(data.cases); return { ...data, state, suite: state.suites[0] } }
function withRun() { const f = fixture(); const state = createSmokeRun(f.state, 'voicli', f.suite.id, metadata, f.cases, f.areas, f.types, 42); return { ...f, state, run: state.runs[0] } }
const input = { result: 'Pass' as const, actualResult: 'Observed', comment: 'Comment', evidenceNote: 'Evidence' }

describe('Smoke definitions use central cases', () => {
  it('has many-to-many ordered ID links and definitions without execution fields', () => {
    const f = fixture()
    expect(f.state.suites).toHaveLength(2)
    expect(f.cases).toHaveLength(4)
    expect(f.state.links.filter(link => link.testCaseId === f.cases[0].id)).toHaveLength(2)
    expect(suiteCases(f.state, 'voicli', f.suite.id, f.cases)).toEqual(f.cases.slice(0, 2))
    for (const entity of [...f.state.suites, ...f.state.links, ...f.state.prerequisites]) {
      for (const key of ['results', 'result', 'checked', 'actualResult', 'testCaseSnapshot']) expect(entity).not.toHaveProperty(key)
    }
    expect(f.suite.id).not.toBe(f.suite.code)
  })
  it('creates and edits suites, removes links only and retains test and prerequisite order', () => {
    const f = fixture(), before = structuredClone(f.cases)
    const draft = { id: 'new', name: 'Another', description: '', testCaseIds: [f.cases[2].id, f.cases[0].id, f.cases[2].id], prerequisites: [{ id: 'p2', text: 'Second' }, { id: 'p1', text: 'First' }] }
    const state = saveSmokeSuite(f.state, 'voicli', draft, f.cases)
    expect(state.suites[2]).toMatchObject({ code: 'SMK-003', name: 'Another' })
    expect(suiteCases(state, 'voicli', 'new', f.cases).map(item => item.id)).toEqual([f.cases[2].id, f.cases[0].id])
    expect(state.prerequisites.filter(item => item.suiteId === 'new').map(item => [item.text, item.order])).toEqual([['Second', 0], ['First', 1]])
    const updated = saveSmokeSuite(state, 'voicli', { ...draft, name: 'Renamed', testCaseIds: [f.cases[0].id], prerequisites: [...draft.prerequisites].reverse() }, f.cases)
    expect(updated.suites[2].code).toBe('SMK-003')
    expect(updated.prerequisites.filter(item => item.suiteId === 'new')[0].text).toBe('First')
    expect(f.cases).toEqual(before)
    const removed = deleteSmokeSuite(updated, 'voicli', 'new')
    expect(removed).toEqual(f.state)
  })
  it('rejects cross-project cases, suite edits and prerequisite identity collisions', () => {
    const f = fixture(), foreign = { ...f.cases[0], id: 'foreign', projectId: 'other' }
    const draft = { id: 'new', name: 'New', description: '', testCaseIds: [foreign.id], prerequisites: [] }
    expect(() => saveSmokeSuite(f.state, 'voicli', draft, [...f.cases, foreign])).toThrow()
    expect(() => saveSmokeSuite(f.state, 'other', { ...draft, id: f.suite.id, testCaseIds: [] }, f.cases)).toThrow()
    expect(() => saveSmokeSuite(f.state, 'voicli', { ...draft, testCaseIds: [], prerequisites: [{ id: f.state.prerequisites[0].id, text: 'Reuse incorrectly' }] }, f.cases)).toThrow()
    expect(suiteCases(f.state, 'other', f.suite.id, f.cases)).toEqual([])
    expect(deleteSmokeSuite(f.state, 'other', f.suite.id)).toBe(f.state)
    const other = saveSmokeSuite(emptySmokeState(), 'other', { ...draft, testCaseIds: [] }, [])
    expect(other.suites[0].code).toBe('SMK-001')
  })
})

describe('Smoke historical runs', () => {
  it('creates separate Draft run/prerequisites/executions with snapshots and current user', () => {
    const f = withRun()
    expect(f.state.runs).toHaveLength(1)
    expect(f.run).toMatchObject({ ...metadata, status: 'Draft', suiteNameSnapshot: f.suite.name, suiteCodeSnapshot: f.suite.code, createdByUserId: 42 })
    expect(f.run.startedAt).toBeUndefined()
    expect(f.state.runPrerequisites[0]).toMatchObject({ runId: f.run.id, textSnapshot: f.state.prerequisites[0].text, result: 'Not Checked', comment: '', order: 0 })
    expect(f.state.executions).toHaveLength(2)
    f.state.executions.forEach((execution, index) => {
      expect(execution).toMatchObject({ result: 'Not Run', projectId: 'voicli', runId: f.run.id, order: index })
      expect(execution.testCaseSnapshot).toMatchObject({ code: f.cases[index].code, steps: f.cases[index].steps, areaName: 'Auth', typeName: index ? 'Negative' : 'Functional' })
    })
    expect(changeSmokeRunStatus(f.state, 'voicli', f.run.id, 'In Progress').runs[0].startedAt).toBeTruthy()
    expect(changeSmokeRunStatus(f.state, 'voicli', f.run.id, 'In Progress').runs[0].status).toBe('In Progress')
  })
  it('freezes case content, dictionary labels, suite membership and prerequisites independently', () => {
    const f = withRun(), original = structuredClone(f.state.executions), originalPrerequisites = structuredClone(f.state.runPrerequisites)
    f.cases[0].title = 'New title'; f.cases[0].steps[0].action = 'New action'; f.cases[0].steps[0].expectedResult = 'New expected'; f.cases[0].preconditions[0] = 'New precondition'; f.cases[0].postconditions = ['New postcondition']; f.cases[0].notes = 'New notes'
    f.areas.find(area => area.id === f.cases[0].areaId)!.name = 'New area'
    f.types[0].name = 'New type'
    const changed = saveSmokeSuite(f.state, 'voicli', { id: f.suite.id, name: 'New suite name', description: '', testCaseIds: [f.cases[0].id, f.cases[3].id], prerequisites: [{ id: f.state.prerequisites[0].id, text: 'New prerequisite' }] }, f.cases)
    const next = createSmokeRun(changed, 'voicli', f.suite.id, metadata, f.cases, f.areas, f.types)
    expect(next.executions.slice(0, 2)).toEqual(original)
    expect(next.runPrerequisites[0]).toEqual(originalPrerequisites[0])
    expect(next.runs[0].suiteNameSnapshot).toBe('Main Smoke')
    expect(next.runs[1].suiteNameSnapshot).toBe('New suite name')
    expect(next.executions.slice(2).map(item => item.testCaseId)).toEqual([f.cases[0].id, f.cases[3].id])
    expect(next.executions[2].testCaseSnapshot).toMatchObject({ title: 'New title', areaName: 'New area', typeName: 'New type', postconditions: ['New postcondition'], notes: 'New notes' })
    expect(next.runPrerequisites[1].textSnapshot).toBe('New prerequisite')
  })
  it('retains historical records with missing live cases, but requires fixing invalid suite links before new runs', () => {
    const f = withRun(), before = structuredClone(f.state.executions), remaining = f.cases.slice(1)
    expect(suiteCases(f.state, 'voicli', f.suite.id, remaining)).toHaveLength(1)
    expect(() => createSmokeRun(f.state, 'voicli', f.suite.id, metadata, remaining, f.areas, f.types)).toThrow(/недоступні/)
    expect(f.state.executions).toEqual(before)
    expect(() => deleteSmokeSuite(f.state, 'voicli', f.suite.id)).toThrow(/історію/)
  })
  it('rejects missing, empty or cross-project suite/run links', () => {
    const f = fixture()
    expect(() => createSmokeRun(f.state, 'other', f.suite.id, metadata, f.cases, f.areas, f.types)).toThrow()
    expect(() => createSmokeRun(f.state, 'voicli', 'missing', metadata, f.cases, f.areas, f.types)).toThrow()
    const empty = saveSmokeSuite(f.state, 'voicli', { id: 'empty', name: 'Empty', description: '', testCaseIds: [], prerequisites: [] }, f.cases)
    expect(() => createSmokeRun(empty, 'voicli', 'empty', metadata, f.cases, f.areas, f.types)).toThrow()
    const invalid = { ...f.state, links: [{ projectId: 'voicli', suiteId: f.suite.id, testCaseId: 'foreign', order: 0 }] }
    expect(() => createSmokeRun(invalid, 'voicli', f.suite.id, metadata, [{ ...f.cases[0], id: 'foreign', projectId: 'other' }], f.areas, f.types)).toThrow()
  })
  it.each(['Pass', 'Fail', 'Blocked', 'Skipped'] as const)('records %s with execution fields, time/user, progress and no definition mutations', result => {
    const f = withRun(), before = structuredClone(f.state)
    const next = saveSmokeExecution(f.state, 'voicli', f.state.executions[0].id, { ...input, result }, 42)
    expect(next.executions[0]).toMatchObject({ ...input, result, executedByUserId: 42 })
    expect(next.executions[0].executedAt).toBeTruthy()
    expect(next.runs[0].status).toBe('In Progress')
    expect(next.executions[1]).toEqual(before.executions[1])
    expect(next.suites).toEqual(before.suites); expect(next.prerequisites).toEqual(before.prerequisites)
    expect(f.state).toEqual(before)
    expect(runCounts(next.executions)).toMatchObject({ done: 1, total: 2, counts: { [result]: 1, 'Not Run': 1 } })
    const reset = saveSmokeExecution(next, 'voicli', next.executions[0].id, { ...input, result: 'Not Run' }, 42)
    expect(reset.executions[0].executedAt).toBeUndefined(); expect(reset.executions[0].executedByUserId).toBeUndefined(); expect(runCounts(reset.executions).done).toBe(0)
  })
  it.each(['Pass', 'Fail'] as const)('stores prerequisite %s/comment on the run, preserving the definition', result => {
    const f = withRun()
    const next = saveSmokeRunPrerequisite(f.state, 'voicli', f.state.runPrerequisites[0].id, { result, comment: 'Checked environment' })
    expect(next.runPrerequisites[0]).toMatchObject({ result, comment: 'Checked environment' })
    expect(next.prerequisites).toEqual(f.state.prerequisites)
    expect(next.runs[0].status).toBe('Draft')
  })
  it('scopes writes to their run project and ignores attempted snapshot/identity overwrites', () => {
    const f = withRun(), first = f.state.executions[0], prerequisite = f.state.runPrerequisites[0]
    const foreignRun = { ...f.run, projectId: 'other' }, foreignExecution = { ...first, projectId: 'other' }, foreignPrerequisite = { ...prerequisite, projectId: 'other' }
    const state = { ...f.state, runs: [...f.state.runs, foreignRun], executions: [...f.state.executions, foreignExecution], runPrerequisites: [...f.state.runPrerequisites, foreignPrerequisite] }
    const tampered = { ...input, testCaseSnapshot: { ...first.testCaseSnapshot, title: 'Forged' }, runId: 'other', testCaseId: 'other' }
    const updated = saveSmokeExecution(state, 'voicli', first.id, tampered, 42)
    expect(updated.executions[0].testCaseSnapshot).toEqual(first.testCaseSnapshot)
    expect(updated.executions[0].testCaseId).toBe(first.testCaseId)
    expect(updated.executions.at(-1)).toEqual(foreignExecution)
    expect(updated.runs.at(-1)).toEqual(foreignRun)
    const prerequisiteUpdate = { result: 'Fail' as const, comment: 'Reason', textSnapshot: 'Forged', sourcePrerequisiteId: 'other' }
    const next = saveSmokeRunPrerequisite(updated, 'voicli', prerequisite.id, prerequisiteUpdate)
    expect(next.runPrerequisites[0].textSnapshot).toBe(prerequisite.textSnapshot)
    expect(next.runPrerequisites[0].sourcePrerequisiteId).toBe(prerequisite.sourcePrerequisiteId)
    expect(next.runPrerequisites.at(-1)).toEqual(foreignPrerequisite)
  })
  it('completes with outstanding checks and refuses all historical/foreign writes', () => {
    const f = withRun(), execId = f.state.executions[0].id, prerequisiteId = f.state.runPrerequisites[0].id
    expect(saveSmokeExecution(f.state, 'other', execId, input)).toBe(f.state)
    expect(saveSmokeRunPrerequisite(f.state, 'other', prerequisiteId, { result: 'Pass', comment: '' })).toBe(f.state)
    expect(changeSmokeRunStatus(f.state, 'other', f.run.id, 'Completed')).toEqual(f.state)
    const completed = changeSmokeRunStatus(f.state, 'voicli', f.run.id, 'Completed')
    expect(completed.runs[0].completedAt).toBeTruthy()
    expect(completed.executions[0].result).toBe('Not Run'); expect(completed.runPrerequisites[0].result).toBe('Not Checked')
    expect(saveSmokeExecution(completed, 'voicli', execId, input)).toBe(completed)
    expect(saveSmokeRunPrerequisite(completed, 'voicli', prerequisiteId, { result: 'Fail', comment: 'Changed' })).toBe(completed)
    expect(changeSmokeRunStatus(completed, 'voicli', f.run.id, 'In Progress')).toEqual(completed)
  })
})
