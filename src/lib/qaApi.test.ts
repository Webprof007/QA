import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import {
  backendId,
  createProject,
  createRequirementTestCaseLink,
  deleteArea,
  deleteProject,
  deleteRequirement,
  deleteRequirementTestCaseLink,
  deleteTestCase,
  deleteTestSuite,
  loadAreas,
  loadProjects,
  loadRequirements,
  loadRequirementTestCaseLinks,
  loadTestCases,
  loadTestCaseTypes,
  loadTestPlans,
  loadTestSuiteTestCaseLinks,
  loadTestSuites,
  saveArea,
  saveRequirement,
  saveTestCase,
  saveTestCaseType,
  saveTestPlan,
  saveTestSuite,
  saveTestSuiteTestCaseLinks,
} from './qaApi'
import type { Requirement, TestCase, TestPlan, TestSuite } from '@/types'

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const project = { id: 3, name: 'Voicli', description: null, createdByUserId: 42, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' }
const area = { id: 7, projectId: 3, name: 'Authentication', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' }
const requirement = { id: 11, projectId: 3, code: 'REQ-011', title: 'Login', description: null, areaId: 7, priority: 'High', status: 'Approved', source: null, notes: null, createdByUserId: 42, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' }
const plan = { id: 12, projectId: 3, title: 'Release 2.6', version: '2.6', status: 'Active', objective: 'Regression', scopeIn: null, scopeOut: null, environment: 'Staging and Production', entryCriteria: null, exitCriteria: null, risks: null, startDate: null, endDate: null, notes: null, createdByUserId: 42, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' }
const testCase = { id: 21, projectId: 3, code: 'TC-021', title: 'Login', areaId: 7, typeId: 5, priority: 'high', status: 'active', preconditions: ['Account exists'], steps: [{ id: 91, action: 'Open login', expectedResult: 'Form opens', sortOrder: 0 }], postconditions: ['Sign out'], notes: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' }
const suite = { id: 31, projectId: 3, code: 'TS-001', name: 'Regression', description: null, createdByUserId: 42, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' }

beforeEach(() => vi.unstubAllGlobals())

describe('QA API boundary', () => {
  it('loads Projects with credentials and normalizes backend IDs once', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ success: true, projects: [project] }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadProjects()).resolves.toEqual([expect.objectContaining({ id: '3', name: 'Voicli', description: '', createdByUserId: 42 })])
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/projects\/$/), expect.objectContaining({ credentials: 'include', method: 'GET' }))
    expect(backendId('3')).toBe(3)
    expect(() => backendId('project-3')).toThrow('Некоректний backend ID')
  })

  it('creates and deletes Projects with the exact contract', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, project }, 201))
      .mockResolvedValueOnce(json({ success: true, deletedProjectId: 3 }))
    vi.stubGlobal('fetch', fetch)
    await expect(createProject('Voicli', 'QA')).resolves.toEqual(expect.objectContaining({ id: '3' }))
    await expect(deleteProject('3')).resolves.toBe('3')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ name: 'Voicli', description: 'QA' })
    expect(fetch.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ id: 3 })
    expect(fetch.mock.calls[1][1].method).toBe('DELETE')
  })

  it('loads, creates, updates and deletes project Areas without leaking string IDs', async () => {
    const renamed = { ...area, name: 'Login' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, areas: [area] }))
      .mockResolvedValueOnce(json({ success: true, area }, 201))
      .mockResolvedValueOnce(json({ success: true, area: renamed }))
      .mockResolvedValueOnce(json({ success: true }))
      .mockResolvedValueOnce(json({ success: true }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadAreas('3')).resolves.toEqual([{ id: '7', projectId: '3', name: 'Authentication' }])
    await saveArea('3', 'Authentication')
    await saveArea('3', 'Login', '7')
    await deleteArea('3', '7')
    expect(fetch.mock.calls[0][0]).toMatch(/\/project-areas\/\?projectId=3$/)
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ projectId: 3, name: 'Authentication' })
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ projectId: 3, id: 7, name: 'Login' })
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ projectId: 3, id: 7 })
  })

  it('loads and mutates Requirements using backend IDs and nullable fields', async () => {
    const input: Requirement = { id: '11', projectId: '3', code: 'REQ-011', title: 'Login', description: '', areaId: '7', priority: 'high', status: 'approved', source: '', notes: '', createdAt: '', updatedAt: '' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, requirements: [requirement] }))
      .mockResolvedValueOnce(json({ success: true, requirement }, 201))
      .mockResolvedValueOnce(json({ success: true, requirement: { ...requirement, title: 'Updated' } }))
      .mockResolvedValueOnce(json({ success: true }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadRequirements('3')).resolves.toEqual([expect.objectContaining({ id: '11', projectId: '3', areaId: '7', description: '', priority: 'high', status: 'approved' })])
    await saveRequirement(input, true)
    await saveRequirement({ ...input, title: 'Updated' }, false)
    await deleteRequirement('3', '11')
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(expect.objectContaining({ projectId: 3, areaId: 7, priority: 'High', status: 'Approved', description: null, source: null, notes: null }))
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual(expect.objectContaining({ projectId: 3, id: 11, title: 'Updated', priority: 'High', status: 'Approved' }))
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ projectId: 3, id: 11 })
  })

  it('surfaces backend validation details without returning a fake entity', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: false, message: 'Code already exists', errors: { code: 'Duplicate' } }, 409)))
    const input: Requirement = { id: 'temp', projectId: '3', code: 'REQ-011', title: 'Login', description: '', priority: 'high', status: 'approved', createdAt: '', updatedAt: '' }
    const error = await saveRequirement(input, true).catch(value => value)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'Code already exists', errors: { code: 'Duplicate' } })
  })

  it('loads and mutates many Test Plans per project', async () => {
    const input: TestPlan = { id: '12', projectId: '3', title: 'Release 2.6', version: '2.6', status: 'Active', objective: 'Regression', scopeIn: '', scopeOut: '', environment: 'Staging and Production', entryCriteria: '', exitCriteria: '', risks: '', startDate: '', endDate: '', notes: '', updatedAt: '' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, testPlans: [plan, { ...plan, id: 13, title: 'Regression' }] }))
      .mockResolvedValueOnce(json({ success: true, testPlan: plan }, 201))
      .mockResolvedValueOnce(json({ success: true, testPlan: { ...plan, title: 'Updated' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadTestPlans('3')).resolves.toHaveLength(2)
    await saveTestPlan(input, true)
    await saveTestPlan({ ...input, title: 'Updated' }, false)
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(expect.objectContaining({ projectId: 3, startDate: null, endDate: null }))
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual(expect.objectContaining({ id: 12, title: 'Updated' }))
  })

  it('loads and mutates current-project Test Case Types', async () => {
    const type = { id: 5, projectId: 3, name: 'Functional', createdAt: '', updatedAt: '' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, types: [type] }))
      .mockResolvedValueOnce(json({ success: true, type }, 201))
      .mockResolvedValueOnce(json({ success: true, type: { ...type, name: 'Regression' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadTestCaseTypes('3')).resolves.toEqual([{ id: '5', projectId: '3', name: 'Functional' }])
    await saveTestCaseType('3', 'Functional')
    await saveTestCaseType('3', 'Regression', '5')
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ projectId: 3, id: 5, name: 'Regression' })
  })

  it('loads and mutates Test Cases while normalizing nested IDs only at the boundary', async () => {
    const input: TestCase = { id: 'temp-id', projectId: '3', code: 'TC-021', title: 'Login', areaId: '7', typeId: '5', priority: 'high', status: 'active', preconditions: ['Account exists'], steps: [{ id: 'temporary-step', action: 'Open login', expectedResult: 'Form opens', sortOrder: 0 }], postconditions: ['Sign out'], notes: '', createdAt: '', updatedAt: '' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, testCases: [testCase] }))
      .mockResolvedValueOnce(json({ success: true, testCase }, 201))
      .mockResolvedValueOnce(json({ success: true, testCase: { ...testCase, title: 'Updated', steps: [{ ...testCase.steps[0], id: 92 }] } }))
      .mockResolvedValueOnce(json({ success: true, deletedTestCaseId: 21 }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadTestCases('3')).resolves.toEqual([expect.objectContaining({ id: '21', projectId: '3', areaId: '7', typeId: '5', preconditions: ['Account exists'], steps: [{ id: '91', action: 'Open login', expectedResult: 'Form opens', sortOrder: 0 }], postconditions: ['Sign out'], notes: '' })])
    await expect(saveTestCase(input, true)).resolves.toEqual(expect.objectContaining({ id: '21', steps: [expect.objectContaining({ id: '91' })] }))
    await expect(saveTestCase({ ...input, id: '21', title: 'Updated' }, false)).resolves.toEqual(expect.objectContaining({ title: 'Updated', steps: [expect.objectContaining({ id: '92' })] }))
    await expect(deleteTestCase('3', '21')).resolves.toBe('21')
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(expect.objectContaining({ projectId: 3, areaId: 7, typeId: 5, steps: [{ action: 'Open login', expectedResult: 'Form opens', sortOrder: 0 }], notes: null }))
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual(expect.objectContaining({ projectId: 3, id: 21, title: 'Updated' }))
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ projectId: 3, id: 21 })
  })

  it('loads and saves Test Suites with ordered Test Case ID links', async () => {
    const input: TestSuite = { id: '31', projectId: '3', code: 'TS-001', name: 'Regression', description: '', createdAt: '', updatedAt: '' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, testSuites: [suite] }))
      .mockResolvedValueOnce(json({ success: true, links: [{ projectId: 3, testSuiteId: 31, testCaseId: 21, sortOrder: 2 }] }))
      .mockResolvedValueOnce(json({ success: true, testSuite: suite }, 201))
      .mockResolvedValueOnce(json({ success: true, testSuite: { ...suite, name: 'Updated' } }))
      .mockResolvedValueOnce(json({ success: true }))
      .mockResolvedValueOnce(json({ success: true }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadTestSuites('3')).resolves.toEqual([expect.objectContaining({ id: '31', projectId: '3', description: '' })])
    await expect(loadTestSuiteTestCaseLinks('3')).resolves.toEqual([{ projectId: '3', suiteId: '31', testCaseId: '21', order: 2 }])
    await saveTestSuite(input, true)
    await saveTestSuite({ ...input, name: 'Updated' }, false)
    await saveTestSuiteTestCaseLinks('3', '31', ['21', '22'])
    await deleteTestSuite('3', '31')
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ projectId: 3, name: 'Regression', description: null })
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ projectId: 3, name: 'Updated', description: null, id: 31 })
    expect(JSON.parse(fetch.mock.calls[4][1].body)).toEqual({ projectId: 3, testSuiteId: 31, testCaseIds: [21, 22] })
    expect(JSON.parse(fetch.mock.calls[5][1].body)).toEqual({ projectId: 3, id: 31 })
  })

  it('loads, creates and removes Requirement ↔ Test Case ID links', async () => {
    const link = { projectId: '3', requirementId: '11', testCaseId: '21' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ success: true, links: [{ projectId: 3, requirementId: 11, testCaseId: 21, createdAt: '' }] }))
      .mockResolvedValueOnce(json({ success: true }))
      .mockResolvedValueOnce(json({ success: true }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadRequirementTestCaseLinks('3')).resolves.toEqual([link])
    await createRequirementTestCaseLink(link)
    await deleteRequirementTestCaseLink(link)
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ projectId: 3, requirementId: 11, testCaseId: 21 })
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ projectId: 3, requirementId: 11, testCaseId: 21 })
  })

  it('recognizes 401 as an API error for the existing auth flow', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: false, message: 'Unauthorized' }, 401)))
    await expect(loadProjects()).rejects.toMatchObject({ status: 401, message: 'Unauthorized' })
  })
})
