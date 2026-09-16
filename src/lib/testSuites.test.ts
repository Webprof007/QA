import { describe, expect, it } from 'vitest'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
import { createTestSuitesMockData } from '@/data/testSuitesMockData'
import { deleteTestSuite, saveTestSuite, testSuiteCases } from './testSuites'
import { createTestRun, type RunInput } from './testRuns'
const source = () => structuredClone(initialTestCasesByProject.voicli)
const input = { id: 'suite-a', name: 'Regression', description: 'Description', testCaseIds: ['demo-test-case-2', 'demo-test-case-1'] }
describe('Test Suites domain and historical source', () => {
  it('uses distinct codes and IDs, project-local numbering, many-to-many ordered ID links without copies', () => {
    const { items } = source()
    let state = saveTestSuite({ suites: [], links: [] }, 'voicli', { ...input, testCaseIds: [...input.testCaseIds, input.testCaseIds[0]] }, items)
    state = saveTestSuite(state, 'voicli', { ...input, id: 'suite-b' }, items)
    state = saveTestSuite(state, 'qp-notes', { ...input, id: 'suite-c', testCaseIds: [] }, items)
    expect(state.suites.map(item => item.code)).toEqual(['TS-001', 'TS-002', 'TS-001'])
    expect(state.suites[0].id).not.toBe(state.suites[0].code)
    expect(state.suites[0]).not.toHaveProperty('testCases')
    expect(state.links).toHaveLength(4)
    expect(state.links[0]).toEqual({ projectId: 'voicli', suiteId: 'suite-a', testCaseId: input.testCaseIds[0], order: 0 })
    expect(testSuiteCases(state, 'voicli', 'suite-a', items).map(item => item.id)).toEqual(input.testCaseIds)
    const updated = saveTestSuite(state, 'voicli', { ...input, name: 'Updated', description: 'New', testCaseIds: [...input.testCaseIds].reverse() }, items)
    expect(updated.suites[0]).toMatchObject({ code: 'TS-001', name: 'Updated', description: 'New', createdAt: state.suites[0].createdAt })
    expect(testSuiteCases(updated, 'voicli', 'suite-a', items).map(item => item.id)).toEqual([...input.testCaseIds].reverse())
    expect(testSuiteCases(updated, 'voicli', 'suite-b', items).map(item => item.id)).toEqual(input.testCaseIds)
    expect(items).toEqual(source().items)
  })
  it('validates both relation endpoints and safely excludes missing and foreign cases', () => {
    const { items } = source(), state = saveTestSuite({ suites: [], links: [] }, 'voicli', input, items)
    expect(() => saveTestSuite(state, 'qp-notes', input, items)).toThrow()
    expect(() => saveTestSuite(state, 'qp-notes', { ...input, id: 'foreign' }, items)).toThrow()
    expect(() => saveTestSuite(state, 'voicli', { ...input, testCaseIds: ['missing'] }, items)).toThrow()
    expect(testSuiteCases(state, 'qp-notes', input.id, items)).toEqual([])
    expect(testSuiteCases(state, 'voicli', input.id, items.filter(item => item.id === input.testCaseIds[0]))).toHaveLength(1)
    const corrupt = { ...state, links: [...state.links, { ...state.links[0], projectId: 'qp-notes' }, state.links[0]] }
    expect(testSuiteCases(corrupt, 'voicli', input.id, items)).toHaveLength(2)
  })
  it('freezes run content and suite context across membership, name, live case edits and suite deletion', () => {
    const data = source()
    let state = saveTestSuite({ suites: [], links: [] }, 'voicli', input, data.items)
    const runInput = (): RunInput => ({ name: 'Release', browser: '', deviceOrOs: '', notes: '', sourceTestSuiteId: input.id, testCaseIds: testSuiteCases(state, 'voicli', input.id, data.items).map(item => item.id) })
    const first = createTestRun('voicli', runInput(), data.items, [], data.areas, data.types, state.suites), frozen = structuredClone(first)
    expect(first.runs[0]).toMatchObject({ sourceTestSuiteId: input.id, sourceTestSuiteCodeSnapshot: 'TS-001', sourceTestSuiteNameSnapshot: 'Regression' })
    expect(first.executions.map(item => item.testCaseId)).toEqual(input.testCaseIds)
    expect(first.executions.every(item => item.result === 'Not Run')).toBe(true)
    state = saveTestSuite(state, 'voicli', { ...input, name: 'New suite', testCaseIds: ['demo-test-case-1', 'demo-test-case-3'] }, data.items)
    data.items[0].steps[0].action = 'Changed action'; data.items[0].title = 'Changed title'
    const second = createTestRun('voicli', runInput(), data.items, [], data.areas, data.types, state.suites)
    expect(second.executions.map(item => item.testCaseId)).toEqual(['demo-test-case-1', 'demo-test-case-3'])
    expect(second.executions[0].testCaseSnapshot.title).toBe('Changed title')
    expect(second.runs[0].sourceTestSuiteNameSnapshot).toBe('New suite')
    state = deleteTestSuite(state, 'voicli', input.id)
    expect(state).toEqual({ suites: [], links: [] }); expect(data.items).toHaveLength(4)
    expect(first).toEqual(frozen)
    expect(() => createTestRun('voicli', { ...runInput(), testCaseIds: [data.items[0].id] }, data.items, [], data.areas, data.types, state.suites)).toThrow()
  })
  it('allows changed run selection without changing suite and rejects foreign source context', () => {
    const data = source(), state = createTestSuitesMockData(data.items), before = structuredClone(state)
    const runInput: RunInput = { name: 'Custom', browser: '', deviceOrOs: '', notes: '', sourceTestSuiteId: state.suites[0].id, testCaseIds: [data.items[2].id] }
    expect(createTestRun('voicli', runInput, data.items, [], data.areas, data.types, state.suites).executions).toHaveLength(1)
    expect(state).toEqual(before)
    expect(() => createTestRun('voicli', runInput, data.items, [], data.areas, data.types, state.suites.map(item => ({ ...item, projectId: 'other' })))).toThrow()
    const deleted = deleteTestSuite(state, 'voicli', state.suites[0].id)
    expect(deleted.suites).toEqual([state.suites[1]])
    expect(testSuiteCases(deleted, 'voicli', state.suites[1].id, data.items)).toHaveLength(2)
  })
})
