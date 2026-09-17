import { ApiError, apiRequest } from './api'
import type { Project, ProjectArea, Requirement, RequirementTestCaseLink, TestCase, TestCaseDictionaryValue, TestPlan } from '@/types'

type BackendProject = { id: number; name: string; description: string | null; createdByUserId: number | null; createdAt: string; updatedAt: string }
type BackendArea = { id: number; projectId: number; name: string; createdAt: string; updatedAt: string }
type BackendRequirement = { id: number; projectId: number; code: string; title: string; description: string | null; areaId: number | null; priority: string; status: string; source: string | null; notes: string | null; createdByUserId: number | null; createdAt: string; updatedAt: string }
type BackendTestPlan = { id: number; projectId: number; title: string; version: string; status: string; objective: string | null; scopeIn: string | null; scopeOut: string | null; environment: string | null; entryCriteria: string | null; exitCriteria: string | null; risks: string | null; startDate: string | null; endDate: string | null; notes: string | null; createdByUserId: number | null; createdAt: string; updatedAt: string }
type BackendType = { id: number; projectId: number; name: string; createdAt: string; updatedAt: string }
type BackendTestStep = { id: number; action: string; expectedResult: string; sortOrder: number }
type BackendTestCase = { id: number; projectId: number; code: string; title: string; areaId: number | null; typeId: number | null; priority: TestCase['priority']; status: TestCase['status']; preconditions: string[]; steps: BackendTestStep[]; postconditions: string[]; notes: string | null; createdAt: string; updatedAt: string }
type BackendRequirementTestCaseLink = { projectId: number; requirementId: number; testCaseId: number; createdAt: string }

const id = (value: number) => String(value)
export function backendId(value: string) {
  if (!/^\d+$/.test(value)) throw new ApiError('Некоректний backend ID.')
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw new ApiError('Некоректний backend ID.')
  return parsed
}
const query = (projectId: string) => `?projectId=${encodeURIComponent(String(backendId(projectId)))}`
const nullable = (value?: string) => value?.trim() ? value : null
const requirementPriorities = ['critical', 'high', 'medium', 'low'] as const
const requirementStatuses = ['draft', 'approved', 'deprecated'] as const
function normalizeRequirementValue<T extends string>(value: string, supported: readonly T[], field: string): T {
  const normalized = value.trim().toLowerCase()
  const match = supported.find(option => option === normalized)
  if (!match) throw new ApiError(`Backend повернув непідтримуваний Requirement ${field}: ${value}.`)
  return match
}
const backendLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

export const adaptProject = (value: BackendProject): Project => ({ id: id(value.id), name: value.name, description: value.description ?? '', createdByUserId: value.createdByUserId ?? undefined, createdAt: value.createdAt, updatedAt: value.updatedAt, userIds: [] })
export const adaptArea = (value: BackendArea): ProjectArea => ({ id: id(value.id), projectId: id(value.projectId), name: value.name })
export function adaptRequirement(value: BackendRequirement): Requirement {
  const priority = normalizeRequirementValue(value.priority, requirementPriorities, 'priority')
  const status = normalizeRequirementValue(value.status, requirementStatuses, 'status')
  return { id: id(value.id), projectId: id(value.projectId), code: value.code, title: value.title, description: value.description ?? '', areaId: value.areaId === null ? undefined : id(value.areaId), priority: priority as TestCase['priority'], status, source: value.source ?? '', notes: value.notes ?? '', createdAt: value.createdAt, updatedAt: value.updatedAt }
}
export function adaptTestPlan(value: BackendTestPlan): TestPlan {
  if (!['Draft', 'Active', 'Completed'].includes(value.status)) throw new ApiError('Backend повернув непідтримуваний Test Plan status.')
  return { id: id(value.id), projectId: id(value.projectId), title: value.title, version: value.version, status: value.status as TestPlan['status'], objective: value.objective ?? '', scopeIn: value.scopeIn ?? '', scopeOut: value.scopeOut ?? '', environment: value.environment ?? '', entryCriteria: value.entryCriteria ?? '', exitCriteria: value.exitCriteria ?? '', risks: value.risks ?? '', startDate: value.startDate ?? '', endDate: value.endDate ?? '', notes: value.notes ?? '', updatedAt: value.updatedAt }
}
export const adaptType = (value: BackendType): TestCaseDictionaryValue => ({ id: id(value.id), projectId: id(value.projectId), name: value.name })
export const adaptTestCase = (value: BackendTestCase): TestCase => ({
  id: id(value.id), projectId: id(value.projectId), code: value.code, title: value.title,
  areaId: value.areaId === null ? undefined : id(value.areaId), typeId: value.typeId === null ? undefined : id(value.typeId),
  priority: value.priority, status: value.status, preconditions: value.preconditions ?? [],
  steps: (value.steps ?? []).map(step => ({ id: id(step.id), action: step.action, expectedResult: step.expectedResult, sortOrder: step.sortOrder })),
  postconditions: value.postconditions ?? [], notes: value.notes ?? '', createdAt: value.createdAt, updatedAt: value.updatedAt,
})
export const adaptRequirementTestCaseLink = (value: BackendRequirementTestCaseLink): RequirementTestCaseLink => ({ projectId: id(value.projectId), requirementId: id(value.requirementId), testCaseId: id(value.testCaseId) })

export async function loadProjects(signal?: AbortSignal) { return (await apiRequest<{ success: true; projects: BackendProject[] }>('/projects/', { signal })).projects.map(adaptProject) }
export async function createProject(name: string, description = '') { return adaptProject((await apiRequest<{ success: true; project: BackendProject }>('/projects/', { method: 'POST', body: { name, description } })).project) }
export async function deleteProject(idValue: string) {
  const response = await apiRequest<{ success: true; deletedProjectId: number }>('/projects/', { method: 'DELETE', body: { id: backendId(idValue) } })
  return id(response.deletedProjectId)
}

export async function loadAreas(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; areas: BackendArea[] }>(`/project-areas/${query(projectId)}`, { signal })).areas.map(adaptArea) }
export async function saveArea(projectId: string, name: string, idValue?: string) {
  const body = idValue ? { projectId: backendId(projectId), id: backendId(idValue), name } : { projectId: backendId(projectId), name }
  return adaptArea((await apiRequest<{ success: true; area: BackendArea }>('/project-areas/', { method: idValue ? 'PATCH' : 'POST', body })).area)
}
export async function deleteArea(projectId: string, idValue: string) { await apiRequest('/project-areas/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(idValue) } }) }

const requirementBody = (item: Requirement) => ({ projectId: backendId(item.projectId), code: item.code, title: item.title, description: nullable(item.description), areaId: item.areaId ? backendId(item.areaId) : null, priority: backendLabel(item.priority ?? 'medium'), status: backendLabel(item.status), source: nullable(item.source), notes: nullable(item.notes) })
export async function loadRequirements(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; requirements: BackendRequirement[] }>(`/requirements/${query(projectId)}`, { signal })).requirements.map(adaptRequirement) }
export async function saveRequirement(item: Requirement, creating: boolean) {
  const values = requirementBody(item)
  const body = creating ? values : { ...values, id: backendId(item.id) }
  return adaptRequirement((await apiRequest<{ success: true; requirement: BackendRequirement }>('/requirements/', { method: creating ? 'POST' : 'PATCH', body })).requirement)
}
export async function deleteRequirement(projectId: string, idValue: string) { await apiRequest('/requirements/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(idValue) } }) }

const testPlanBody = (item: TestPlan) => ({ projectId: backendId(item.projectId), title: item.title, version: item.version, status: item.status, objective: item.objective, scopeIn: item.scopeIn, scopeOut: item.scopeOut, environment: item.environment, entryCriteria: item.entryCriteria, exitCriteria: item.exitCriteria, risks: item.risks, startDate: nullable(item.startDate), endDate: nullable(item.endDate), notes: item.notes })
export async function loadTestPlans(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; testPlans: BackendTestPlan[] }>(`/test-plans/${query(projectId)}`, { signal })).testPlans.map(adaptTestPlan) }
export async function saveTestPlan(item: TestPlan, creating: boolean) {
  const values = testPlanBody(item)
  const body = creating ? values : { ...values, id: backendId(item.id) }
  return adaptTestPlan((await apiRequest<{ success: true; testPlan: BackendTestPlan }>('/test-plans/', { method: creating ? 'POST' : 'PATCH', body })).testPlan)
}
export async function deleteTestPlan(projectId: string, idValue: string) { await apiRequest('/test-plans/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(idValue) } }) }

export async function loadTestCaseTypes(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; types: BackendType[] }>(`/test-case-types/${query(projectId)}`, { signal })).types.map(adaptType) }
export async function saveTestCaseType(projectId: string, name: string, idValue?: string) {
  const body = idValue ? { projectId: backendId(projectId), id: backendId(idValue), name } : { projectId: backendId(projectId), name }
  return adaptType((await apiRequest<{ success: true; type: BackendType }>('/test-case-types/', { method: idValue ? 'PATCH' : 'POST', body })).type)
}
export async function deleteTestCaseType(projectId: string, idValue: string) { await apiRequest('/test-case-types/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(idValue) } }) }

const testCaseBody = (item: TestCase) => ({
  projectId: backendId(item.projectId), code: item.code, title: item.title,
  areaId: item.areaId ? backendId(item.areaId) : null, typeId: item.typeId ? backendId(item.typeId) : null,
  priority: item.priority, status: item.status, preconditions: item.preconditions,
  steps: [...item.steps].sort((left, right) => left.sortOrder - right.sortOrder).map(step => ({ action: step.action, expectedResult: step.expectedResult, sortOrder: step.sortOrder })),
  postconditions: item.postconditions ?? [], notes: nullable(item.notes),
})
export async function loadTestCases(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; testCases: BackendTestCase[] }>(`/test-cases/${query(projectId)}`, { signal })).testCases.map(adaptTestCase) }
export async function saveTestCase(item: TestCase, creating: boolean) {
  const values = testCaseBody(item)
  const body = creating ? values : { ...values, id: backendId(item.id) }
  return adaptTestCase((await apiRequest<{ success: true; testCase: BackendTestCase }>('/test-cases/', { method: creating ? 'POST' : 'PATCH', body })).testCase)
}
export async function deleteTestCase(projectId: string, idValue: string) {
  const response = await apiRequest<{ success: true; deletedTestCaseId: number }>('/test-cases/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(idValue) } })
  return id(response.deletedTestCaseId)
}

export async function loadRequirementTestCaseLinks(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; links: BackendRequirementTestCaseLink[] }>(`/requirement-test-cases/${query(projectId)}`, { signal })).links.map(adaptRequirementTestCaseLink) }
export async function createRequirementTestCaseLink(link: RequirementTestCaseLink) { await apiRequest('/requirement-test-cases/', { method: 'POST', body: { projectId: backendId(link.projectId), requirementId: backendId(link.requirementId), testCaseId: backendId(link.testCaseId) } }) }
export async function deleteRequirementTestCaseLink(link: RequirementTestCaseLink) { await apiRequest('/requirement-test-cases/', { method: 'DELETE', body: { projectId: backendId(link.projectId), requirementId: backendId(link.requirementId), testCaseId: backendId(link.testCaseId) } }) }
