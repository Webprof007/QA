import type { Requirement, RequirementTestCaseLink, RequirementWithTestCases, TestCase, TestExecution } from '@/types'

export function validCoverageLinks(projectId: string, links: RequirementTestCaseLink[], requirements: Requirement[], cases: TestCase[]) {
  const requirementIds = new Set(requirements.filter(item => item.projectId === projectId).map(item => item.id))
  const caseIds = new Set(cases.filter(item => item.projectId === projectId).map(item => item.id))
  const seen = new Set<string>()
  return links.filter(link => {
    const key = JSON.stringify([link.requirementId, link.testCaseId])
    if (link.projectId !== projectId || !requirementIds.has(link.requirementId) || !caseIds.has(link.testCaseId) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function requirementsWithLinks(projectId: string, requirements: Requirement[], cases: TestCase[], links: RequirementTestCaseLink[]): RequirementWithTestCases[] {
  const valid = validCoverageLinks(projectId, links, requirements, cases)
  return requirements.filter(item => item.projectId === projectId).map(item => ({ ...item, testCaseIds: valid.filter(link => link.requirementId === item.id).map(link => link.testCaseId) }))
}

export function replaceCoverageLinks(links: RequirementTestCaseLink[], projectId: string, direction: 'requirement' | 'testCase', id: string, selectedIds: string[], requirements: Requirement[], cases: TestCase[]) {
  const key = direction === 'requirement' ? 'requirementId' : 'testCaseId'
  const additions = selectedIds.map(selected => ({ projectId, requirementId: direction === 'requirement' ? id : selected, testCaseId: direction === 'testCase' ? id : selected }))
  const projectLinks = [...links.filter(link => link.projectId === projectId && link[key] !== id), ...additions]
  return [...links.filter(link => link.projectId !== projectId), ...validCoverageLinks(projectId, projectLinks, requirements, cases)]
}

export function coverageSummary(items: RequirementWithTestCases[]) {
  const total = items.length
  const covered = items.filter(item => item.testCaseIds.length > 0).length
  return { total, covered, uncovered: total - covered, percentage: total ? Math.round(covered / total * 100) : 0 }
}

export type CoverageFilters = { search: string; areaId: string; priority: string; status: string; coverage: string }
export const emptyCoverageFilters: CoverageFilters = { search: '', areaId: '', priority: '', status: '', coverage: '' }
export function filterCoverage(items: RequirementWithTestCases[], filters: CoverageFilters) {
  const query = filters.search.trim().toLowerCase()
  return items.filter(item => (!query || [item.id, item.code, item.title].some(value => value.toLowerCase().includes(query))) &&
    (!filters.areaId || item.areaId === filters.areaId) && (!filters.priority || item.priority === filters.priority) &&
    (!filters.status || item.status === filters.status) && (!filters.coverage || (filters.coverage === 'covered' ? item.testCaseIds.length > 0 : item.testCaseIds.length === 0)))
}

export function latestExecutionResult(projectId: string, testCaseId: string, executions: TestExecution[]) {
  return executions.filter(item => item.projectId === projectId && item.testCaseId === testCaseId && item.result !== 'Not Run' && item.executedAt && Number.isFinite(Date.parse(item.executedAt)))
    .sort((a, b) => Date.parse(b.executedAt!) - Date.parse(a.executedAt!))[0]?.result ?? 'Never Run'
}
