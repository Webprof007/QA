// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { defectFromExecution, newDefect, saveDefect, linkDefect, safeExternalUrl } from './defects'
import { createTestRun, saveExecution } from './testRuns'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
import type { DefectsState } from '@/types'
const empty = (): DefectsState => ({ items: [], links: [] })
const cases = initialTestCasesByProject.voicli
function failedRun() {
  const state = createTestRun('voicli', { name: 'Regression', environment: 'Staging', build: '2.4', browser: 'Chrome', deviceOrOs: 'macOS', notes: '', testCaseIds: cases.items.slice(0, 2).map(item => item.id) }, cases.items, [], cases.areas, cases.types)
  return state.executions.reduce((data, item) => saveExecution(data, 'voicli', item.id, { result: 'Fail', actualResult: 'Actual output', comment: 'Initial context', evidenceNote: 'Evidence text' }, 42), state)
}

describe('Defects model and execution links', () => {
  it('generates per-project codes and records creator with independent severity/priority', () => {
    const runs = failedRun(), draft = { ...newDefect('voicli', []), title: 'Bug' }
    let state = saveDefect(empty(), draft, 'voicli', 42, runs, cases.areas)
    expect(state.items[0]).toMatchObject({ code: 'BUG-001', status: 'New', severity: 'Major', priority: 'Medium', createdByUserId: 42 })
    state = saveDefect(state, { ...newDefect('voicli', state.items), title: 'Second bug' }, 'voicli', 42, runs, cases.areas)
    state = saveDefect(state, { ...newDefect('qp-notes', state.items), title: 'Other project' }, 'qp-notes', 42, runs, [])
    expect(state.items.map(item => item.code)).toEqual(['BUG-001', 'BUG-002', 'BUG-001'])
  })
  it('preserves immutable edit fields and allows Closed to be reopened', () => {
    const runs = failedRun(), draft = { ...newDefect('voicli', []), title: 'Bug' }
    let state = saveDefect(empty(), draft, 'voicli', 42, runs, cases.areas)
    const original = state.items[0]
    state = saveDefect(state, { ...original, title: 'Changed', code: 'BUG-999', createdAt: 'fake', createdByUserId: 99, status: 'Closed' }, 'voicli', 99, runs, cases.areas)
    expect(state.items[0]).toMatchObject({ id: original.id, code: original.code, projectId: original.projectId, createdAt: original.createdAt, createdByUserId: 42, status: 'Closed' })
    state = saveDefect(state, { ...state.items[0], status: 'Open' }, 'voicli', 99, runs, cases.areas)
    expect(state.items[0].status).toBe('Open')
    expect(() => saveDefect(state, { ...state.items[0], projectId: 'qp-notes' }, 'voicli', 42, runs, cases.areas)).toThrow()
  })
  it('copies Fail context and origin, preserves own values after source edits', () => {
    const runs = failedRun(), before = structuredClone(runs)
    const draft = defectFromExecution(newDefect('voicli', []), runs.executions[0], runs.runs[0], cases.areas)
    const state = saveDefect(empty(), draft, 'voicli', 42, runs, cases.areas)
    expect(state.items[0]).toMatchObject({ sourceExecutionId: runs.executions[0].id, sourceTestCaseId: runs.executions[0].testCaseId, title: 'Login valid user', environment: 'Staging', build: '2.4', browser: 'Chrome', deviceOrOs: 'macOS', description: 'Initial context', actualResult: 'Actual output', evidenceNote: 'Evidence text', areaId: cases.items[0].areaId })
    expect(state.items[0].expectedResult).toContain('The demo user reaches the signed-in screen.')
    expect(state.items[0].stepsToReproduce).toContain('Submit valid demo credentials.')
    expect(runs).toEqual(before)
    runs.executions[0].testCaseSnapshot.title = 'Changed source'; runs.executions[0].testCaseSnapshot.steps[0].expectedResult = 'Changed expected'; runs.runs[0].build = 'Different build'
    expect(state.items[0].title).toBe('Login valid user'); expect(state.items[0].build).toBe('2.4'); expect(state.items[0].expectedResult).not.toContain('Changed expected')
  })
  it('supports multiple defects per execution and multiple executions per defect without duplicate links', () => {
    const runs = failedRun()
    let state = saveDefect(empty(), defectFromExecution(newDefect('voicli', []), runs.executions[0], runs.runs[0], cases.areas), 'voicli', 42, runs, cases.areas)
    const id = state.items[0].id
    state = linkDefect(state, 'voicli', runs.executions[1].id, id, runs.executions)
    state = linkDefect(state, 'voicli', runs.executions[1].id, id, runs.executions)
    state = saveDefect(state, { ...newDefect('voicli', state.items), title: 'Second issue' }, 'voicli', 42, runs, cases.areas)
    state = linkDefect(state, 'voicli', runs.executions[0].id, state.items[1].id, runs.executions)
    expect(state.links).toHaveLength(3)
    expect(state.items).toHaveLength(2)
    expect(state.links.every(link => Object.keys(link).length === 3)).toBe(true)
  })
  it('rejects cross-project and non-Fail links and unsafe URLs', () => {
    const runs = failedRun()
    const state = saveDefect(empty(), { ...newDefect('qp-notes', []), title: 'Foreign bug' }, 'qp-notes', 42, runs, [])
    expect(() => linkDefect(state, 'voicli', runs.executions[0].id, state.items[0].id, runs.executions)).toThrow()
    expect(() => defectFromExecution(newDefect('voicli', []), { ...runs.executions[0], result: 'Pass' }, runs.runs[0], cases.areas)).toThrow()
    expect(safeExternalUrl('javascript:alert(1)')).toBe('')
    expect(safeExternalUrl('https://example.com/BUG-1')).toBe('https://example.com/BUG-1')
  })
})
