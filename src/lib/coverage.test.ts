import { describe, expect, it } from 'vitest'
import { initialRequirementsByProject, initialRequirementTestCaseLinks } from '@/data/requirementsMockData'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
import { coverageSummary, emptyCoverageFilters, filterCoverage, latestExecutionResult, replaceCoverageLinks, requirementsWithLinks, validCoverageLinks } from './coverage'
import type { TestExecution } from '@/types'

const requirements = initialRequirementsByProject.voicli.items
const cases = initialTestCasesByProject.voicli.items
const links = initialRequirementTestCaseLinks
const projectId = 'voicli'
const view = () => requirementsWithLinks(projectId, requirements, cases, links)

describe('Coverage relations', () => {
  it('stores many-to-many IDs without embedded definitions or a second relation array', () => {
    expect(links.filter(link => link.requirementId === requirements[0].id)).toHaveLength(2)
    expect(links.filter(link => link.testCaseId === cases[1].id)).toHaveLength(2)
    expect(Object.keys(links[0]).sort()).toEqual(['projectId', 'requirementId', 'testCaseId'])
    expect(requirements[0]).not.toHaveProperty('testCaseIds')
    expect(cases[0]).not.toHaveProperty('requirementIds')
  })
  it('deduplicates, replaces one requirement selection and preserves all other links and entities', () => {
    const before = structuredClone({ cases, requirements })
    const next = replaceCoverageLinks(links, projectId, 'requirement', requirements[0].id, [cases[0].id, cases[0].id], requirements, cases)
    expect(next.filter(link => link.requirementId === requirements[0].id)).toHaveLength(1)
    expect(next.filter(link => link.requirementId !== requirements[0].id)).toEqual(links.filter(link => link.requirementId !== requirements[0].id))
    expect({ cases, requirements }).toEqual(before)
  })
  it('updates reverse selections with multiple requirements and unlinks only that test case', () => {
    const next = replaceCoverageLinks(links, projectId, 'testCase', cases[1].id, [requirements[1].id, requirements[3].id], requirements, cases)
    expect(next.filter(link => link.testCaseId === cases[1].id).map(link => link.requirementId)).toEqual([requirements[1].id, requirements[3].id])
    expect(next.filter(link => link.testCaseId !== cases[1].id)).toEqual(links.filter(link => link.testCaseId !== cases[1].id))
  })
  it('rejects cross-project links in either direction and keeps other project links', () => {
    const otherCase = { ...cases[0], id: 'other-case', projectId: 'other' }
    const otherRequirement = { ...requirements[0], id: 'other-req', projectId: 'other' }
    const foreign = { projectId: 'other', requirementId: otherRequirement.id, testCaseId: otherCase.id }
    const allLinks = [...links, foreign]
    const next = replaceCoverageLinks(allLinks, projectId, 'requirement', requirements[0].id, [otherCase.id], [...requirements, otherRequirement], [...cases, otherCase])
    expect(next.filter(link => link.projectId === projectId && link.testCaseId === otherCase.id)).toEqual([])
    expect(next).toContainEqual(foreign)
    const reverse = replaceCoverageLinks(allLinks, projectId, 'testCase', cases[0].id, [otherRequirement.id], [...requirements, otherRequirement], [...cases, otherCase])
    expect(reverse.filter(link => link.projectId === projectId && link.requirementId === otherRequirement.id)).toEqual([])
  })
  it('ignores dangling and duplicate links, including missing requirements and test cases', () => {
    const noisy = [...links, links[0], { ...links[0], testCaseId: 'missing' }, { ...links[0], requirementId: 'missing' }, { ...links[0], projectId: 'other' }]
    expect(validCoverageLinks(projectId, noisy, requirements, cases)).toEqual(links)
    expect(requirementsWithLinks(projectId, requirements, cases, noisy)).toEqual(view())
    expect(requirementsWithLinks(projectId, requirements, [], links).every(item => item.testCaseIds.length === 0)).toBe(true)
    expect(requirementsWithLinks('other', requirements, cases, links)).toEqual([])
  })
})

describe('Design coverage', () => {
  it('counts covered requirements once and handles zero requirements', () => {
    expect(coverageSummary(view())).toEqual({ total: 4, covered: 3, uncovered: 1, percentage: 75 })
    expect(coverageSummary([])).toEqual({ total: 0, covered: 0, uncovered: 0, percentage: 0 })
  })
  it('updates coverage when a last link is added or removed', () => {
    const added = replaceCoverageLinks(links, projectId, 'requirement', requirements[3].id, [cases[0].id], requirements, cases)
    expect(coverageSummary(requirementsWithLinks(projectId, requirements, cases, added)).percentage).toBe(100)
    const removed = replaceCoverageLinks(added, projectId, 'requirement', requirements[3].id, [], requirements, cases)
    expect(coverageSummary(requirementsWithLinks(projectId, requirements, cases, removed)).percentage).toBe(75)
  })
  it('combines search, area, priority, status and coverage and searches IDs/code/title without case sensitivity', () => {
    const items = view().map(item => ({ ...item, priority: 'high' as const }))
    const base = { ...emptyCoverageFilters, areaId: requirements[0].areaId!, priority: 'high', status: 'approved', coverage: 'covered' }
    for (const search of [requirements[0].id.toUpperCase(), requirements[0].code.toLowerCase(), requirements[0].title.toUpperCase()]) {
      expect(filterCoverage(items, { ...base, search }).map(item => item.id)).toEqual([requirements[0].id])
    }
    expect(filterCoverage(items, { ...base, priority: 'low' })).toEqual([])
    expect(filterCoverage(items, { ...base, coverage: 'uncovered' })).toEqual([])
    expect(filterCoverage(items, { ...emptyCoverageFilters, coverage: 'uncovered' }).map(item => item.id)).toEqual([requirements[3].id])
    expect(filterCoverage(items, { ...emptyCoverageFilters, coverage: 'covered' })).toHaveLength(3)
  })
  it('takes the latest actually executed result in the project; it never determines coverage', () => {
    const execution = (id: string, result: TestExecution['result'], executedAt?: string, project = projectId): TestExecution => ({
      id, projectId: project, runId: 'run', testCaseId: cases[0].id,
      testCaseSnapshot: { ...cases[0], areaName: 'Auth', typeName: 'Functional' }, result, executedAt, actualResult: '', comment: '', evidenceNote: '',
    })
    const executions = [execution('2', 'Fail', '2026-09-15T12:00:00Z'), execution('1', 'Pass', '2026-09-14T12:00:00Z'), execution('3', 'Not Run', '2026-09-16T00:00:00Z'), execution('4', 'Blocked', '2026-09-17T00:00:00Z', 'other'), execution('5', 'Pass', 'invalid')]
    expect(latestExecutionResult(projectId, cases[0].id, executions)).toBe('Fail')
    expect(latestExecutionResult(projectId, cases[1].id, executions)).toBe('Never Run')
    expect(latestExecutionResult(projectId, cases[0].id, [execution('unexecuted', 'Not Run')])).toBe('Never Run')
    expect(coverageSummary(view()).covered).toBe(3)
  })
})
