import { describe, expect, it } from 'vitest'
import { createProjectAreaData } from '@/data/projectAreaMockData'
import { initialProjectAreas } from '@/data/projectAreasMockData'
import { saveChecklistRun } from './checklists'
import { createTestRun, saveExecution } from './testRuns'
import type { Checklist, ChecklistRun } from '@/types'

describe('Domain ownership and project boundaries', () => {
  it('has one Area catalog, consistent Area IDs and no Area state in module stores', () => {
    const seed = createProjectAreaData()
    expect(seed.areas).toEqual(initialProjectAreas)
    const definitions = [...seed.testCases.voicli.items, ...seed.requirements.voicli.items, ...seed.audit.voicli]
    for (const item of definitions) expect(seed.areas.some(area => area.projectId === item.projectId && area.id === item.areaId)).toBe(true)
    expect(seed.requirements.voicli.items[0].areaId).toBe(seed.testCases.voicli.items[0].areaId)
    expect(seed.testCases.voicli).not.toHaveProperty('areas')
    expect(seed.requirements.voicli).not.toHaveProperty('areas')
    expect(new Set(seed.areas.map(area => `${area.projectId}:${area.name.toLowerCase()}`)).size).toBe(seed.areas.length)
  })
  it('creates isolated mock instances without mutating seed or another app instance', () => {
    const first = createProjectAreaData(), second = createProjectAreaData()
    first.areas[0].name = 'Renamed'
    first.testCases.voicli.items[0].steps[0].action = 'Changed'
    first.audit.voicli[0].title = 'Changed audit'
    expect(second).toEqual(createProjectAreaData())
    expect(first).not.toEqual(second)
  })
  it('execution writes cannot change records in another project even with colliding IDs', () => {
    const seed = createProjectAreaData(), data = seed.testCases.voicli
    const state = createTestRun('voicli', { name: 'Run', testCaseIds: [data.items[0].id], environment: '', build: '', browser: '', deviceOrOs: '', notes: '' }, data.items, [], seed.areas, data.types)
    const foreignRun = { ...state.runs[0], projectId: 'other' }
    const foreignExecution = { ...state.executions[0], projectId: 'other' }
    const next = saveExecution({ runs: [...state.runs, foreignRun], executions: [...state.executions, foreignExecution] }, 'voicli', state.executions[0].id, { result: 'Fail', actualResult: 'Actual', comment: '', evidenceNote: '' }, 42)
    expect(next.runs[1]).toEqual(foreignRun)
    expect(next.executions[1]).toEqual(foreignExecution)
    expect(next.executions[0].result).toBe('Fail')
  })
})

const definition: Checklist = { id: 'checklist', projectId: 'voicli', title: 'Checklist', description: '', items: [{ id: 'item', checklistId: 'checklist', text: 'Original text', order: 0 }], createdAt: '2026-09-15', updatedAt: '2026-09-15' }
const run: ChecklistRun = { id: 'run', projectId: 'voicli', checklistId: definition.id, titleSnapshot: definition.title, status: 'In Progress', startedAt: '2026-09-15', completedAt: null, items: [{ id: 'run-item', runId: 'run', checklistItemId: 'item', textSnapshot: 'Original text', result: 'Not Run', comment: '' }] }
describe('Checklist history write boundary', () => {
  it('preserves identity, ordering and snapshot fields while allowing result/comment updates', () => {
    const state = saveChecklistRun([], 'voicli', run, [definition])
    const tampered = structuredClone(run)
    tampered.titleSnapshot = 'Changed'; tampered.startedAt = 'future'
    tampered.items[0] = { ...tampered.items[0], textSnapshot: 'Changed', checklistItemId: 'different', result: 'Fail', comment: 'Reason' }
    const next = saveChecklistRun(state, 'voicli', tampered, [definition])
    expect(next[0]).toMatchObject({ titleSnapshot: run.titleSnapshot, startedAt: run.startedAt })
    expect(next[0].items[0]).toEqual({ ...run.items[0], result: 'Fail', comment: 'Reason' })
    expect(state[0]).toEqual(run)
    expect(next[0].items).not.toBe(tampered.items)
  })
  it('rejects cross-project definitions, parent changes and foreign run IDs', () => {
    expect(saveChecklistRun([], 'voicli', { ...run, projectId: 'other' }, [definition])).toEqual([])
    expect(saveChecklistRun([], 'voicli', run, [{ ...definition, projectId: 'other' }])).toEqual([])
    expect(saveChecklistRun([], 'voicli', { ...run, items: [{ ...run.items[0], runId: 'other-run' }] }, [definition])).toEqual([])
    const foreign = [{ ...run, projectId: 'other' }]
    expect(saveChecklistRun(foreign, 'voicli', run, [definition])).toBe(foreign)
    const state = [run]
    expect(saveChecklistRun(state, 'voicli', { ...run, checklistId: 'different' }, [definition])).toBe(state)
  })
  it('freezes completed runs after definition edits and rejects further result changes', () => {
    const completed = saveChecklistRun([run], 'voicli', { ...run, status: 'Completed' }, [definition])
    expect(completed[0].completedAt).toBeTruthy()
    const changedDefinition = { ...definition, items: [{ ...definition.items[0], text: 'New definition' }] }
    expect(saveChecklistRun(completed, 'voicli', { ...run, items: [{ ...run.items[0], result: 'Pass' }] }, [changedDefinition])).toBe(completed)
    expect(completed[0].items[0].textSnapshot).toBe('Original text')
  })
})
