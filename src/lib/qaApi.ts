import { ApiError, apiRequest } from './api'
import type { Build, Checklist, ChecklistRun, Defect, DefectRetest, DefectSourceLink, Environment, Project, ProjectArea, Release, Requirement, RequirementTestCaseLink, SmokeExecution, SmokePrerequisite, SmokeRun, SmokeRunPrerequisite, SmokeSuite, SmokeSuiteTestCaseLink, TestCase, TestCaseDictionaryValue, TestCaseSnapshot, TestExecution, TestPlan, TestRun, TestSuite, TestSuiteTestCaseLink } from '@/types'

type BackendProject = { id: number; name: string; description: string | null; createdByUserId: number | null; createdAt: string; updatedAt: string }
type BackendArea = { id: number; projectId: number; name: string; createdAt: string; updatedAt: string }
type BackendRequirement = { id: number; projectId: number; code: string; title: string; description: string | null; areaId: number | null; priority: string; status: string; source: string | null; notes: string | null; createdByUserId: number | null; createdAt: string; updatedAt: string }
type BackendTestPlan = { id: number; projectId: number; title: string; version: string; status: string; objective: string | null; scopeIn: string | null; scopeOut: string | null; environment: string | null; entryCriteria: string | null; exitCriteria: string | null; risks: string | null; startDate: string | null; endDate: string | null; notes: string | null; createdByUserId: number | null; createdAt: string; updatedAt: string }
type BackendType = { id: number; projectId: number; name: string; createdAt: string; updatedAt: string }
type BackendTestStep = { id: number; action: string; expectedResult: string; sortOrder: number }
type BackendTestCase = { id: number; projectId: number; code: string; title: string; areaId: number | null; typeId: number | null; priority: TestCase['priority']; status: TestCase['status']; preconditions: string[]; steps: BackendTestStep[]; postconditions: string[]; notes: string | null; createdAt: string; updatedAt: string }
type BackendRequirementTestCaseLink = { projectId: number; requirementId: number; testCaseId: number; createdAt: string }
type BackendTestSuite = { id: number; projectId: number; code: string; name: string; description: string | null; createdByUserId: number | null; createdAt: string; updatedAt: string }
type BackendTestSuiteTestCaseLink = { projectId: number; testSuiteId: number; testCaseId: number; sortOrder: number }
type BackendEnvironment = Omit<Environment, 'id' | 'projectId'> & { id: number; projectId: number; description: string | null; baseUrl: string | null }
type BackendRelease = Omit<Release, 'id' | 'projectId' | 'description' | 'startDate' | 'releaseDate'> & { id: number; projectId: number; description: string | null; startDate: string | null; releaseDate: string | null }
type BackendBuild = Omit<Build, 'id' | 'projectId' | 'releaseId' | 'description'> & { id: number; projectId: number; releaseId: number | null; description: string | null }
type BackendSnapshot = Omit<TestCaseSnapshot, 'id' | 'areaId' | 'typeId' | 'steps'> & { id: number; areaId: number | null; typeId: number | null; steps: BackendTestStep[] }
type BackendTestRun = Omit<TestRun, 'id' | 'projectId' | 'testPlanId' | 'sourceTestSuiteId' | 'environmentId' | 'buildId'> & { id: number; projectId: number; testPlanId: number | null; sourceSuiteId?: number | null; sourceTestSuiteId?: number | null; environmentId: number | null; buildId: number | null }
type BackendTestExecution = Omit<TestExecution, 'id' | 'projectId' | 'runId' | 'testCaseId' | 'testCaseSnapshot'> & { id: number; projectId: number; runId: number; testCaseId: number; testCaseSnapshot: BackendSnapshot }
type BackendDefect = Omit<Defect, 'id' | 'projectId' | 'areaId' | 'sourceTestCaseId' | 'environmentId' | 'buildId' | 'source'> & { id: number; projectId: number; areaId: number | null; sourceTestCaseId: number | null; environmentId: number | null; buildId: number | null; source?: { type: Defect['source'] extends infer T ? T extends { type: infer U } ? U : never : never; id: number; runId?: number; auditId?: number } }
type BackendDefectSourceLink = { projectId: number; sourceType: DefectSourceLink['sourceType']; sourceId: number; defectId: number }
type BackendDefectRetest = Omit<DefectRetest, 'id' | 'projectId' | 'defectId' | 'sourceTestCaseId' | 'sourceExecutionId' | 'environmentId' | 'buildId' | 'testCaseSnapshot'> & { id: number; projectId: number; defectId: number; sourceTestCaseId: number | null; sourceExecutionId: number | null; environmentId: number | null; buildId: number | null; testCaseSnapshot?: BackendSnapshot | null }
type BackendChecklistItem = { id: number; checklistId: number; text: string; sortOrder: number }
type BackendChecklist = Omit<Checklist, 'id' | 'projectId' | 'areaId' | 'items'> & { id: number; projectId: number; areaId: number | null; items: BackendChecklistItem[] }
type BackendChecklistRunItem = { id: number; runId: number; checklistItemId: number; textSnapshot: string; result: ChecklistRun['items'][number]['result']; comment: string }
type BackendChecklistRun = Omit<ChecklistRun, 'id' | 'projectId' | 'checklistId' | 'items'> & { id: number; projectId: number; checklistId: number; items?: BackendChecklistRunItem[] }
type BackendSmokeSuite = Omit<SmokeSuite, 'id' | 'projectId'> & { id: number; projectId: number }
type BackendSmokeLink = { projectId: number; smokeSuiteId?: number; suiteId?: number; testCaseId: number; sortOrder: number }
type BackendSmokePrerequisite = { id: number; projectId: number; smokeSuiteId?: number; suiteId?: number; text: string; sortOrder: number }
type BackendSmokeRun = Omit<SmokeRun, 'id' | 'projectId' | 'suiteId' | 'environmentId' | 'buildId'> & { id: number; projectId: number; suiteId: number; environmentId: number | null; buildId: number | null }
type BackendSmokeRunPrerequisite = Omit<SmokeRunPrerequisite, 'id' | 'projectId' | 'runId' | 'sourcePrerequisiteId'> & { id: number; projectId: number; runId: number; sourcePrerequisiteId: number | null }
type BackendSmokeExecution = Omit<SmokeExecution, 'id' | 'projectId' | 'runId' | 'testCaseId' | 'testCaseSnapshot'> & { id: number; projectId: number; runId: number; testCaseId: number; testCaseSnapshot: BackendSnapshot }

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
export const adaptTestSuite = (value: BackendTestSuite): TestSuite => ({ id: id(value.id), projectId: id(value.projectId), code: value.code, name: value.name, description: value.description ?? '', createdAt: value.createdAt, updatedAt: value.updatedAt })
export const adaptTestSuiteTestCaseLink = (value: BackendTestSuiteTestCaseLink): TestSuiteTestCaseLink => ({ projectId: id(value.projectId), suiteId: id(value.testSuiteId), testCaseId: id(value.testCaseId), order: value.sortOrder })
const optionalId = (value?: number | null) => value == null ? undefined : id(value)
const adaptSnapshot = (value: BackendSnapshot): TestCaseSnapshot => ({ ...value, id: id(value.id), areaId: optionalId(value.areaId), typeId: optionalId(value.typeId), steps: (value.steps ?? []).map(step => ({ ...step, id: id(step.id) })) })
export const adaptEnvironment = (value: BackendEnvironment): Environment => ({ ...value, id: id(value.id), projectId: id(value.projectId), description: value.description ?? '', baseUrl: value.baseUrl ?? '' })
export const adaptRelease = (value: BackendRelease): Release => ({ ...value, id: id(value.id), projectId: id(value.projectId), description: value.description ?? '', startDate: value.startDate ?? '', releaseDate: value.releaseDate ?? '' })
export const adaptBuild = (value: BackendBuild): Build => ({ ...value, id: id(value.id), projectId: id(value.projectId), releaseId: optionalId(value.releaseId), description: value.description ?? '' })
export const adaptTestRun = (value: BackendTestRun): TestRun => ({ ...value, id: id(value.id), projectId: id(value.projectId), testPlanId: value.testPlanId == null ? null : id(value.testPlanId), sourceTestSuiteId: optionalId(value.sourceSuiteId ?? value.sourceTestSuiteId), environmentId: optionalId(value.environmentId), buildId: optionalId(value.buildId) })
export const adaptTestExecution = (value: BackendTestExecution): TestExecution => ({ ...value, id: id(value.id), projectId: id(value.projectId), runId: id(value.runId), testCaseId: id(value.testCaseId), testCaseSnapshot: adaptSnapshot(value.testCaseSnapshot) })
export const adaptDefect = (value: BackendDefect): Defect => ({ ...value, id: id(value.id), projectId: id(value.projectId), areaId: optionalId(value.areaId), sourceTestCaseId: optionalId(value.sourceTestCaseId), environmentId: optionalId(value.environmentId), buildId: optionalId(value.buildId), source: value.source ? value.source.type === 'auditFinding' ? { type: 'auditFinding', id: id(value.source.id), auditId: id(value.source.auditId!) } : { type: value.source.type, id: id(value.source.id), runId: id(value.source.runId!) } : undefined })
export const adaptDefectSourceLink = (value: BackendDefectSourceLink): DefectSourceLink => ({ projectId: id(value.projectId), sourceType: value.sourceType, sourceId: id(value.sourceId), defectId: id(value.defectId) })
export const adaptDefectRetest = (value: BackendDefectRetest): DefectRetest => ({ ...value, id: id(value.id), projectId: id(value.projectId), defectId: id(value.defectId), sourceTestCaseId: optionalId(value.sourceTestCaseId), sourceExecutionId: optionalId(value.sourceExecutionId), environmentId: optionalId(value.environmentId), buildId: optionalId(value.buildId), testCaseSnapshot: value.testCaseSnapshot ? adaptSnapshot(value.testCaseSnapshot) : undefined })
export const adaptChecklist = (value: BackendChecklist): Checklist => ({ ...value, id: id(value.id), projectId: id(value.projectId), areaId: optionalId(value.areaId), description: value.description ?? '', items: (value.items ?? []).map(item => ({ id: id(item.id), checklistId: id(item.checklistId), text: item.text, order: item.sortOrder })) })
const adaptChecklistRunItem = (value: BackendChecklistRunItem) => ({ id: id(value.id), runId: id(value.runId), checklistItemId: id(value.checklistItemId), textSnapshot: value.textSnapshot, result: value.result, comment: value.comment ?? '' })
export const adaptChecklistRun = (value: BackendChecklistRun): ChecklistRun => ({ ...value, id: id(value.id), projectId: id(value.projectId), checklistId: id(value.checklistId), items: (value.items ?? []).map(adaptChecklistRunItem) })
export const adaptSmokeSuite = (value: BackendSmokeSuite): SmokeSuite => ({ ...value, id: id(value.id), projectId: id(value.projectId), description: value.description ?? '' })
export const adaptSmokeLink = (value: BackendSmokeLink): SmokeSuiteTestCaseLink => ({ projectId: id(value.projectId), suiteId: id(value.smokeSuiteId ?? value.suiteId!), testCaseId: id(value.testCaseId), order: value.sortOrder })
export const adaptSmokePrerequisite = (value: BackendSmokePrerequisite): SmokePrerequisite => ({ id: id(value.id), projectId: id(value.projectId), suiteId: id(value.smokeSuiteId ?? value.suiteId!), text: value.text, order: value.sortOrder })
export const adaptSmokeRun = (value: BackendSmokeRun): SmokeRun => ({ ...value, id: id(value.id), projectId: id(value.projectId), suiteId: id(value.suiteId), environmentId: optionalId(value.environmentId), buildId: optionalId(value.buildId) })
export const adaptSmokeRunPrerequisite = (value: BackendSmokeRunPrerequisite): SmokeRunPrerequisite => ({ ...value, id: id(value.id), projectId: id(value.projectId), runId: id(value.runId), sourcePrerequisiteId: optionalId(value.sourcePrerequisiteId) })
export const adaptSmokeExecution = (value: BackendSmokeExecution): SmokeExecution => ({ ...value, id: id(value.id), projectId: id(value.projectId), runId: id(value.runId), testCaseId: id(value.testCaseId), testCaseSnapshot: adaptSnapshot(value.testCaseSnapshot) })

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

export async function loadTestSuites(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; testSuites: BackendTestSuite[] }>(`/test-suites/${query(projectId)}`, { signal })).testSuites.map(adaptTestSuite) }
export async function saveTestSuite(item: TestSuite, creating: boolean) {
  const values = { projectId: backendId(item.projectId), name: item.name, description: nullable(item.description) }
  const body = creating ? values : { ...values, id: backendId(item.id) }
  return adaptTestSuite((await apiRequest<{ success: true; testSuite: BackendTestSuite }>('/test-suites/', { method: creating ? 'POST' : 'PATCH', body })).testSuite)
}
export async function deleteTestSuite(projectId: string, idValue: string) { await apiRequest('/test-suites/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(idValue) } }) }
export async function loadTestSuiteTestCaseLinks(projectId: string, signal?: AbortSignal) {
  return (await apiRequest<{ success: true; links: BackendTestSuiteTestCaseLink[] }>(`/test-suite-test-cases/${query(projectId)}`, { signal })).links.map(adaptTestSuiteTestCaseLink)
}
export async function saveTestSuiteTestCaseLinks(projectId: string, suiteId: string, testCaseIds: string[]) {
  await apiRequest('/test-suite-test-cases/', { method: 'PATCH', body: { projectId: backendId(projectId), testSuiteId: backendId(suiteId), testCaseIds: testCaseIds.map(backendId) } })
}

export async function loadEnvironments(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; environments: BackendEnvironment[] }>(`/environments/${query(projectId)}`, { signal })).environments.map(adaptEnvironment) }
export async function saveEnvironmentApi(item: Environment, creating: boolean) {
  const values = { projectId: backendId(item.projectId), name: item.name, description: nullable(item.description), baseUrl: nullable(item.baseUrl), isActive: item.isActive }
  return adaptEnvironment((await apiRequest<{ success: true; environment: BackendEnvironment }>('/environments/', { method: creating ? 'POST' : 'PATCH', body: creating ? values : { ...values, id: backendId(item.id) } })).environment)
}
export async function deleteEnvironmentApi(projectId: string, value: string) { await apiRequest('/environments/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(value) } }) }
export async function loadReleases(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; releases: BackendRelease[] }>(`/releases/${query(projectId)}`, { signal })).releases.map(adaptRelease) }
export async function saveReleaseApi(item: Release, creating: boolean) {
  const values = { projectId: backendId(item.projectId), name: item.name, description: nullable(item.description), status: item.status, startDate: nullable(item.startDate), releaseDate: nullable(item.releaseDate) }
  return adaptRelease((await apiRequest<{ success: true; release: BackendRelease }>('/releases/', { method: creating ? 'POST' : 'PATCH', body: creating ? values : { ...values, id: backendId(item.id) } })).release)
}
export async function loadBuilds(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; builds: BackendBuild[] }>(`/builds/${query(projectId)}`, { signal })).builds.map(adaptBuild) }
export async function saveBuildApi(item: Build, creating: boolean) {
  const values = { projectId: backendId(item.projectId), version: item.version, description: nullable(item.description), releaseId: item.releaseId ? backendId(item.releaseId) : null }
  return adaptBuild((await apiRequest<{ success: true; build: BackendBuild }>('/builds/', { method: creating ? 'POST' : 'PATCH', body: creating ? values : { ...values, id: backendId(item.id) } })).build)
}
export async function deleteBuildApi(projectId: string, value: string) { await apiRequest('/builds/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(value) } }) }

export async function loadTestRuns(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; testRuns: BackendTestRun[] }>(`/test-runs/${query(projectId)}`, { signal })).testRuns.map(adaptTestRun) }
export async function createTestRunApi(projectId: string, input: { name: string; testCaseIds: string[]; testPlanId?: string | null; sourceTestSuiteId?: string; environmentId?: string; buildId?: string; browser: string; deviceOrOs: string; notes: string }) {
  const body = { projectId: backendId(projectId), name: input.name, testCaseIds: input.testCaseIds.map(backendId), testPlanId: input.testPlanId ? backendId(input.testPlanId) : null, sourceSuiteId: input.sourceTestSuiteId ? backendId(input.sourceTestSuiteId) : null, environmentId: input.environmentId ? backendId(input.environmentId) : null, buildId: input.buildId ? backendId(input.buildId) : null, browser: input.browser, deviceOrOs: input.deviceOrOs, notes: input.notes }
  const response = await apiRequest<{ success: true; testRun?: BackendTestRun; run?: BackendTestRun; executions?: BackendTestExecution[] }>('/test-runs/', { method: 'POST', body })
  const run = response.testRun ?? response.run
  if (!run) throw new ApiError('Backend не повернув створений Test Run.')
  return { run: adaptTestRun(run), executions: (response.executions ?? []).map(adaptTestExecution) }
}
export async function updateTestRunStatusApi(projectId: string, runId: string, status: TestRun['status']) { return adaptTestRun((await apiRequest<{ success: true; testRun: BackendTestRun }>('/test-runs/', { method: 'PATCH', body: { projectId: backendId(projectId), id: backendId(runId), status } })).testRun) }
export async function deleteTestRunApi(projectId: string, value: string) { await apiRequest('/test-runs/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(value) } }) }
export async function loadTestExecutions(projectId: string, signal?: AbortSignal) { const response = await apiRequest<{ success: true; testExecutions?: BackendTestExecution[]; executions?: BackendTestExecution[] }>(`/test-executions/${query(projectId)}`, { signal }); return (response.testExecutions ?? response.executions ?? []).map(adaptTestExecution) }
export async function saveTestExecutionApi(projectId: string, executionId: string, input: Pick<TestExecution, 'result' | 'actualResult' | 'comment' | 'evidenceNote'>) { const response = await apiRequest<{ success: true; testExecution?: BackendTestExecution; execution?: BackendTestExecution }>('/test-executions/', { method: 'PATCH', body: { projectId: backendId(projectId), id: backendId(executionId), ...input } }); const execution = response.testExecution ?? response.execution; if (!execution) throw new ApiError('Backend не повернув Test Execution.'); return adaptTestExecution(execution) }

const defectBody = (item: Defect) => ({ projectId: backendId(item.projectId), title: item.title, description: item.description, stepsToReproduce: item.stepsToReproduce, expectedResult: item.expectedResult, actualResult: item.actualResult, severity: item.severity, priority: item.priority, status: item.status, areaId: item.areaId ? backendId(item.areaId) : null, environmentId: item.environmentId ? backendId(item.environmentId) : null, buildId: item.buildId ? backendId(item.buildId) : null, browser: item.browser, deviceOrOs: item.deviceOrOs, evidenceNote: item.evidenceNote, sourceTestCaseId: item.sourceTestCaseId ? backendId(item.sourceTestCaseId) : null, externalTaskUrl: nullable(item.externalTaskUrl) })
export async function loadDefects(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; defects: BackendDefect[] }>(`/defects/${query(projectId)}`, { signal })).defects.map(adaptDefect) }
export async function saveDefectApi(item: Defect, creating: boolean) { const values = defectBody(item); return adaptDefect((await apiRequest<{ success: true; defect: BackendDefect }>('/defects/', { method: creating ? 'POST' : 'PATCH', body: creating ? values : { ...values, id: backendId(item.id) } })).defect) }
export async function deleteDefectApi(projectId: string, value: string) { await apiRequest('/defects/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(value) } }) }
export async function loadDefectSourceLinks(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; links: BackendDefectSourceLink[] }>(`/defect-source-links/${query(projectId)}`, { signal })).links.map(adaptDefectSourceLink) }
export async function createDefectSourceLinkApi(link: DefectSourceLink) { await apiRequest('/defect-source-links/', { method: 'POST', body: { projectId: backendId(link.projectId), sourceType: link.sourceType, sourceId: backendId(link.sourceId), defectId: backendId(link.defectId) } }) }
export async function deleteDefectSourceLinkApi(link: DefectSourceLink) { await apiRequest('/defect-source-links/', { method: 'DELETE', body: { projectId: backendId(link.projectId), sourceType: link.sourceType, sourceId: backendId(link.sourceId), defectId: backendId(link.defectId) } }) }
export async function loadDefectRetests(projectId: string, signal?: AbortSignal) { const response = await apiRequest<{ success: true; defectRetests?: BackendDefectRetest[]; retests?: BackendDefectRetest[] }>(`/defect-retests/${query(projectId)}`, { signal }); return (response.defectRetests ?? response.retests ?? []).map(adaptDefectRetest) }
export async function createDefectRetestApi(projectId: string, defectId: string, input: { environmentId?: string; buildId?: string; result: DefectRetest['result']; actualResult: string; comment: string; evidenceNote: string }) { return adaptDefectRetest((await apiRequest<{ success: true; defectRetest: BackendDefectRetest }>('/defect-retests/', { method: 'POST', body: { projectId: backendId(projectId), defectId: backendId(defectId), environmentId: input.environmentId ? backendId(input.environmentId) : null, buildId: input.buildId ? backendId(input.buildId) : null, result: input.result, actualResult: input.actualResult, comment: input.comment, evidenceNote: input.evidenceNote } })).defectRetest) }

export async function loadChecklists(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; checklists: BackendChecklist[] }>(`/checklists/${query(projectId)}`, { signal })).checklists.map(adaptChecklist) }
export async function saveChecklistApi(item: Checklist, creating: boolean) { const values = { projectId: backendId(item.projectId), title: item.title, areaId: item.areaId ? backendId(item.areaId) : null, description: item.description, items: [...item.items].sort((a, b) => a.order - b.order).map((entry, sortOrder) => ({ text: entry.text, sortOrder })) }; return adaptChecklist((await apiRequest<{ success: true; checklist: BackendChecklist }>('/checklists/', { method: creating ? 'POST' : 'PATCH', body: creating ? values : { ...values, id: backendId(item.id) } })).checklist) }
export async function deleteChecklistApi(projectId: string, value: string) { await apiRequest('/checklists/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(value) } }) }
export async function loadChecklistRuns(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; checklistRuns: BackendChecklistRun[] }>(`/checklist-runs/${query(projectId)}`, { signal })).checklistRuns.map(adaptChecklistRun) }
export async function loadChecklistRunItems(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; items: BackendChecklistRunItem[] }>(`/checklist-run-items/${query(projectId)}`, { signal })).items.map(adaptChecklistRunItem) }
export async function createChecklistRunApi(projectId: string, checklistId: string) { return adaptChecklistRun((await apiRequest<{ success: true; checklistRun: BackendChecklistRun }>('/checklist-runs/', { method: 'POST', body: { projectId: backendId(projectId), checklistId: backendId(checklistId) } })).checklistRun) }
export async function updateChecklistRunApi(projectId: string, runId: string, status: ChecklistRun['status']) { return adaptChecklistRun((await apiRequest<{ success: true; checklistRun: BackendChecklistRun }>('/checklist-runs/', { method: 'PATCH', body: { projectId: backendId(projectId), id: backendId(runId), status } })).checklistRun) }
export async function saveChecklistRunItemApi(projectId: string, item: ChecklistRun['items'][number]) { return adaptChecklistRunItem((await apiRequest<{ success: true; item: BackendChecklistRunItem }>('/checklist-run-items/', { method: 'PATCH', body: { projectId: backendId(projectId), id: backendId(item.id), result: item.result, comment: item.comment } })).item) }

export async function loadSmokeSuites(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; smokeSuites: BackendSmokeSuite[] }>(`/smoke-suites/${query(projectId)}`, { signal })).smokeSuites.map(adaptSmokeSuite) }
export async function saveSmokeSuiteApi(item: SmokeSuite, creating: boolean) { const values = { projectId: backendId(item.projectId), name: item.name, description: nullable(item.description) }; return adaptSmokeSuite((await apiRequest<{ success: true; smokeSuite: BackendSmokeSuite }>('/smoke-suites/', { method: creating ? 'POST' : 'PATCH', body: creating ? values : { ...values, id: backendId(item.id) } })).smokeSuite) }
export async function deleteSmokeSuiteApi(projectId: string, value: string) { await apiRequest('/smoke-suites/', { method: 'DELETE', body: { projectId: backendId(projectId), id: backendId(value) } }) }
export async function loadSmokeSuiteLinks(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; links: BackendSmokeLink[] }>(`/smoke-suite-test-cases/${query(projectId)}`, { signal })).links.map(adaptSmokeLink) }
export async function saveSmokeSuiteLinksApi(projectId: string, suiteId: string, testCaseIds: string[]) { await apiRequest('/smoke-suite-test-cases/', { method: 'PATCH', body: { projectId: backendId(projectId), smokeSuiteId: backendId(suiteId), testCaseIds: testCaseIds.map(backendId) } }) }
export async function loadSmokePrerequisites(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; prerequisites: BackendSmokePrerequisite[] }>(`/smoke-prerequisites/${query(projectId)}`, { signal })).prerequisites.map(adaptSmokePrerequisite) }
export async function replaceSmokePrerequisitesApi(projectId: string, suiteId: string, prerequisites: Pick<SmokePrerequisite, 'text'>[]) { await apiRequest('/smoke-prerequisites/', { method: 'PATCH', body: { projectId: backendId(projectId), smokeSuiteId: backendId(suiteId), prerequisites: prerequisites.map((item, sortOrder) => ({ text: item.text, sortOrder })) } }) }
export async function loadSmokeRuns(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; smokeRuns: BackendSmokeRun[] }>(`/smoke-runs/${query(projectId)}`, { signal })).smokeRuns.map(adaptSmokeRun) }
export async function createSmokeRunApi(projectId: string, suiteId: string, input: { environmentId?: string; buildId?: string; browser: string; deviceOrOs: string; notes: string }) { const response = await apiRequest<{ success: true; smokeRun: BackendSmokeRun; prerequisites?: BackendSmokeRunPrerequisite[]; executions?: BackendSmokeExecution[] }>('/smoke-runs/', { method: 'POST', body: { projectId: backendId(projectId), smokeSuiteId: backendId(suiteId), environmentId: input.environmentId ? backendId(input.environmentId) : null, buildId: input.buildId ? backendId(input.buildId) : null, browser: input.browser, deviceOrOs: input.deviceOrOs, notes: input.notes } }); return { run: adaptSmokeRun(response.smokeRun), prerequisites: (response.prerequisites ?? []).map(adaptSmokeRunPrerequisite), executions: (response.executions ?? []).map(adaptSmokeExecution) } }
export async function updateSmokeRunApi(projectId: string, runId: string, status: SmokeRun['status']) { return adaptSmokeRun((await apiRequest<{ success: true; smokeRun: BackendSmokeRun }>('/smoke-runs/', { method: 'PATCH', body: { projectId: backendId(projectId), id: backendId(runId), status } })).smokeRun) }
export async function loadSmokeRunPrerequisites(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; prerequisites: BackendSmokeRunPrerequisite[] }>(`/smoke-run-prerequisites/${query(projectId)}`, { signal })).prerequisites.map(adaptSmokeRunPrerequisite) }
export async function saveSmokeRunPrerequisiteApi(projectId: string, value: SmokeRunPrerequisite) { return adaptSmokeRunPrerequisite((await apiRequest<{ success: true; prerequisite: BackendSmokeRunPrerequisite }>('/smoke-run-prerequisites/', { method: 'PATCH', body: { projectId: backendId(projectId), id: backendId(value.id), result: value.result, comment: value.comment } })).prerequisite) }
export async function loadSmokeExecutions(projectId: string, signal?: AbortSignal) { return (await apiRequest<{ success: true; executions: BackendSmokeExecution[] }>(`/smoke-executions/${query(projectId)}`, { signal })).executions.map(adaptSmokeExecution) }
export async function saveSmokeExecutionApi(projectId: string, executionId: string, input: Pick<SmokeExecution, 'result' | 'actualResult' | 'comment' | 'evidenceNote'>) { return adaptSmokeExecution((await apiRequest<{ success: true; execution: BackendSmokeExecution }>('/smoke-executions/', { method: 'PATCH', body: { projectId: backendId(projectId), id: backendId(executionId), ...input } })).execution) }
