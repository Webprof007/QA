import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import type { Checklist, ChecklistRun, DefectRetest, DefectsState, EvidenceItem, EvidenceOwner, Project, ProjectArea, ProjectSetupState, Requirement, RequirementTestCaseLink, SmokeState, TestCase, TestCaseDictionaryValue, TestPlan, TestRunsState, TestSuite, TestSuiteTestCaseLink } from '@/types'

const apiFixture = vi.hoisted<{ reset: () => void }>(() => ({ reset: () => undefined }))

vi.mock('@/lib/qaApi', async () => {
  const [{ projects }, { createProjectAreaData }, { initialRequirementTestCaseLinks }, { createTestSuitesMockData }, { createProjectSetupMockData }, { createSmokeMockData }, { createDefectsMockData }] = await Promise.all([
    import('@/data/mockData'), import('@/data/projectAreaMockData'), import('@/data/requirementsMockData'),
    import('@/data/testSuitesMockData'), import('@/data/projectSetupMockData'), import('@/data/smokeMockData'), import('@/data/defectsMockData'),
  ])
  const [{ createTestRun, changeRunStatus, saveExecution }, { deleteSmokeSuite, createSmokeRun, changeSmokeRunStatus, saveSmokeExecution, saveSmokeRunPrerequisite }, { saveChecklistRun }, { retestSource }] = await Promise.all([import('@/lib/testRuns'), import('@/lib/smoke'), import('@/lib/checklists'), import('@/lib/defectRetests')])
  let projectItems: Project[] = [], areas: ProjectArea[] = [], requirements: Requirement[] = [], cases: TestCase[] = [], types: TestCaseDictionaryValue[] = [], plans: TestPlan[] = [], links: RequirementTestCaseLink[] = [], suites: TestSuite[] = [], suiteLinks: TestSuiteTestCaseLink[] = [], setup: ProjectSetupState, testRuns: TestRunsState, defects: DefectsState, retests: DefectRetest[], checklists: Checklist[], checklistRuns: ChecklistRun[], smoke: SmokeState, evidence: EvidenceItem[] = []
  const reset = () => {
    const seed = createProjectAreaData()
    projectItems = structuredClone(projects)
    areas = structuredClone(seed.areas)
    requirements = structuredClone(Object.values(seed.requirements).flatMap(value => value.items))
    cases = structuredClone(Object.values(seed.testCases).flatMap(value => value.items))
    types = structuredClone(Object.values(seed.testCases).flatMap(value => value.types))
    plans = []
    links = structuredClone(initialRequirementTestCaseLinks)
    const suiteSeed = createTestSuitesMockData(cases)
    suites = structuredClone(suiteSeed.suites)
    suiteLinks = structuredClone(suiteSeed.links)
    setup = createProjectSetupMockData()
    testRuns = { runs: [], executions: [] }
    defects = createDefectsMockData()
    retests = []
    checklists = []
    checklistRuns = []
    smoke = createSmokeMockData(cases)
    evidence = []
  }
  apiFixture.reset = reset
  reset()
  return {
    loadProjects: async () => structuredClone(projectItems),
    createProject: async (name: string, description = '') => {
      const item: Project = { id: crypto.randomUUID(), name, description, userIds: [] }
      projectItems = [...projectItems, item]
      return structuredClone(item)
    },
    deleteProject: async (id: string) => { projectItems = projectItems.filter(item => item.id !== id); return id },
    loadAreas: async (projectId: string) => structuredClone(areas.filter(item => item.projectId === projectId)),
    saveArea: async (projectId: string, name: string, id?: string) => {
      const item: ProjectArea = { id: id ?? crypto.randomUUID(), projectId, name }
      areas = id ? areas.map(value => value.id === id && value.projectId === projectId ? item : value) : [...areas, item]
      return structuredClone(item)
    },
    deleteArea: async (projectId: string, id: string) => { areas = areas.filter(item => item.projectId !== projectId || item.id !== id) },
    loadRequirements: async (projectId: string) => structuredClone(requirements.filter(item => item.projectId === projectId)),
    saveRequirement: async (item: Requirement, creating: boolean) => {
      const saved = structuredClone(item)
      requirements = creating ? [...requirements, saved] : requirements.map(value => value.id === saved.id && value.projectId === saved.projectId ? saved : value)
      return saved
    },
    deleteRequirement: async (projectId: string, id: string) => { requirements = requirements.filter(item => item.projectId !== projectId || item.id !== id); links = links.filter(link => link.projectId !== projectId || link.requirementId !== id) },
    loadTestPlans: async (projectId: string) => structuredClone(plans.filter(item => item.projectId === projectId)),
    saveTestPlan: async (item: TestPlan, creating: boolean) => {
      const saved = structuredClone(item)
      plans = creating ? [...plans, saved] : plans.map(value => value.id === saved.id && value.projectId === saved.projectId ? saved : value)
      return saved
    },
    deleteTestPlan: async (projectId: string, id: string) => { plans = plans.filter(item => item.projectId !== projectId || item.id !== id) },
    loadTestCaseTypes: async (projectId: string) => structuredClone(types.filter(item => item.projectId === projectId)),
    saveTestCaseType: async (projectId: string, name: string, id?: string) => {
      const item: TestCaseDictionaryValue = { id: id ?? crypto.randomUUID(), projectId, name }
      types = id ? types.map(value => value.id === id && value.projectId === projectId ? item : value) : [...types, item]
      return structuredClone(item)
    },
    deleteTestCaseType: async (projectId: string, id: string) => { types = types.filter(item => item.projectId !== projectId || item.id !== id) },
    loadTestCases: async (projectId: string) => structuredClone(cases.filter(item => item.projectId === projectId)),
    saveTestCase: async (item: TestCase, creating: boolean) => {
      const saved = structuredClone(item)
      cases = creating ? [...cases, saved] : cases.map(value => value.id === saved.id && value.projectId === saved.projectId ? saved : value)
      return saved
    },
    deleteTestCase: async (projectId: string, id: string) => { cases = cases.filter(item => item.projectId !== projectId || item.id !== id); links = links.filter(link => link.projectId !== projectId || link.testCaseId !== id); return id },
    loadRequirementTestCaseLinks: async (projectId: string) => structuredClone(links.filter(item => item.projectId === projectId)),
    createRequirementTestCaseLink: async (link: RequirementTestCaseLink) => {
      if (!links.some(item => item.projectId === link.projectId && item.requirementId === link.requirementId && item.testCaseId === link.testCaseId)) links = [...links, structuredClone(link)]
    },
    deleteRequirementTestCaseLink: async (link: RequirementTestCaseLink) => { links = links.filter(item => item.projectId !== link.projectId || item.requirementId !== link.requirementId || item.testCaseId !== link.testCaseId) },
    loadTestSuites: async (projectId: string) => structuredClone(suites.filter(item => item.projectId === projectId)),
    saveTestSuite: async (item: TestSuite, creating: boolean) => {
      const existing = suites.find(value => value.id === item.id && value.projectId === item.projectId)
      const saved: TestSuite = creating ? { ...item, id: item.id, code: `TS-${String(suites.filter(value => value.projectId === item.projectId).length + 1).padStart(3, '0')}`, createdAt: 'created', updatedAt: 'created' } : { ...item, code: existing?.code ?? item.code, createdAt: existing?.createdAt ?? 'created', updatedAt: 'updated' }
      suites = creating ? [...suites, saved] : suites.map(value => value.id === saved.id && value.projectId === saved.projectId ? saved : value)
      return structuredClone(saved)
    },
    deleteTestSuite: async (projectId: string, id: string) => { suites = suites.filter(item => item.projectId !== projectId || item.id !== id); suiteLinks = suiteLinks.filter(item => item.projectId !== projectId || item.suiteId !== id) },
    loadTestSuiteTestCaseLinks: async (projectId: string) => structuredClone(suiteLinks.filter(item => item.projectId === projectId)),
    saveTestSuiteTestCaseLinks: async (projectId: string, suiteId: string, testCaseIds: string[]) => {
      suiteLinks = [...suiteLinks.filter(item => item.projectId !== projectId || item.suiteId !== suiteId), ...[...new Set(testCaseIds)].map((testCaseId, order) => ({ projectId, suiteId, testCaseId, order }))]
    },
    loadEnvironments: async (projectId: string) => structuredClone(setup.environments.filter(item => item.projectId === projectId)),
    loadReleases: async (projectId: string) => structuredClone(setup.releases.filter(item => item.projectId === projectId)),
    loadBuilds: async (projectId: string) => structuredClone(setup.builds.filter(item => item.projectId === projectId)),
    saveEnvironmentApi: async (item: ProjectSetupState['environments'][number]) => { setup.environments = [...setup.environments.filter(value => value.id !== item.id), structuredClone(item)]; return structuredClone(item) },
    saveReleaseApi: async (item: ProjectSetupState['releases'][number]) => { setup.releases = [...setup.releases.filter(value => value.id !== item.id), structuredClone(item)]; return structuredClone(item) },
    saveBuildApi: async (item: ProjectSetupState['builds'][number]) => { setup.builds = [...setup.builds.filter(value => value.id !== item.id), structuredClone(item)]; return structuredClone(item) },
    deleteEnvironmentApi: async (_projectId: string, id: string) => { setup.environments = setup.environments.filter(item => item.id !== id) },
    deleteBuildApi: async (_projectId: string, id: string) => { setup.builds = setup.builds.filter(item => item.id !== id) },
    loadTestRuns: async (projectId: string) => structuredClone(testRuns.runs.filter(item => item.projectId === projectId)),
    loadTestExecutions: async (projectId: string) => structuredClone(testRuns.executions.filter(item => item.projectId === projectId)),
    createTestRunApi: async (projectId: string, input: Parameters<typeof createTestRun>[1]) => { const state = createTestRun(projectId, input, cases, plans, areas, types, suites, setup); testRuns = { runs: [...testRuns.runs, ...state.runs], executions: [...testRuns.executions, ...state.executions] }; return { run: structuredClone(state.runs[0]), executions: structuredClone(state.executions) } },
    updateTestRunStatusApi: async (projectId: string, id: string, status: 'In Progress' | 'Completed') => { testRuns = changeRunStatus(testRuns, projectId, id, status); return structuredClone(testRuns.runs.find(item => item.id === id)!) },
    saveTestExecutionApi: async (projectId: string, id: string, input: Parameters<typeof saveExecution>[3]) => { testRuns = saveExecution(testRuns, projectId, id, input, 42); return structuredClone(testRuns.executions.find(item => item.id === id)!) },
    loadDefects: async (projectId: string) => structuredClone(defects.items.filter(item => item.projectId === projectId)),
    loadDefectSourceLinks: async (projectId: string) => structuredClone(defects.links.filter(item => item.projectId === projectId)),
    loadDefectRetests: async (projectId: string) => structuredClone(retests.filter(item => item.projectId === projectId)),
    saveDefectApi: async (item: DefectsState['items'][number], creating: boolean) => { const saved = structuredClone(item); defects.items = creating ? [...defects.items, saved] : defects.items.map(value => value.id === saved.id ? saved : value); return saved },
    createDefectSourceLinkApi: async (link: DefectsState['links'][number]) => { defects.links = [...defects.links, structuredClone(link)] },
    createDefectRetestApi: async (projectId: string, defectId: string, input: Pick<DefectRetest, 'environmentId' | 'buildId' | 'result' | 'actualResult' | 'comment' | 'evidenceNote'>) => { const now = new Date().toISOString(), defect = defects.items.find(item => item.projectId === projectId && item.id === defectId)!; const context = retestSource(defect, cases, testRuns, areas, types, retests, smoke); const saved: DefectRetest = { id: crypto.randomUUID(), projectId, defectId, ...input, ...context, sourceTestCaseId: defect.sourceTestCaseId, sourceExecutionId: defect.source?.type === 'testExecution' ? defect.source.id : undefined, environmentNameSnapshot: setup.environments.find(item => item.id === input.environmentId)?.name, buildVersionSnapshot: setup.builds.find(item => item.id === input.buildId)?.version, executedAt: now, createdAt: now, executedByUserId: 42 }; retests = [...retests, saved]; return structuredClone(saved) },
    loadChecklists: async (projectId: string) => structuredClone(checklists.filter(item => item.projectId === projectId)),
    loadChecklistRuns: async (projectId: string) => structuredClone(checklistRuns.filter(item => item.projectId === projectId).map(item => ({ ...item, items: [] }))),
    loadChecklistRunItems: async (projectId: string) => structuredClone(checklistRuns.filter(item => item.projectId === projectId).flatMap(item => item.items)),
    saveChecklistApi: async (item: Checklist, creating: boolean) => { const saved = structuredClone(item); checklists = creating ? [...checklists, saved] : checklists.map(value => value.id === saved.id ? saved : value); return saved },
    createChecklistRunApi: async (projectId: string, checklistId: string) => { const definition = checklists.find(item => item.id === checklistId)!; const runId = crypto.randomUUID(); const saved: ChecklistRun = { id: runId, projectId, checklistId, titleSnapshot: definition.title, startedAt: new Date().toISOString(), completedAt: null, status: 'In Progress', items: definition.items.map(item => ({ id: crypto.randomUUID(), runId, checklistItemId: item.id, textSnapshot: item.text, result: 'Not Run', comment: '' })) }; checklistRuns = saveChecklistRun(checklistRuns, projectId, saved, checklists); return structuredClone(saved) },
    saveChecklistRunItemApi: async (_projectId: string, item: ChecklistRun['items'][number]) => { checklistRuns = checklistRuns.map(run => ({ ...run, items: run.items.map(value => value.id === item.id ? structuredClone(item) : value) })); return structuredClone(item) },
    updateChecklistRunApi: async (_projectId: string, id: string) => { checklistRuns = checklistRuns.map(run => run.id === id ? { ...run, status: 'Completed', completedAt: new Date().toISOString() } : run); return structuredClone(checklistRuns.find(run => run.id === id)!) },
    loadSmokeSuites: async (projectId: string) => structuredClone(smoke.suites.filter(item => item.projectId === projectId)),
    loadSmokeSuiteLinks: async (projectId: string) => structuredClone(smoke.links.filter(item => item.projectId === projectId)),
    loadSmokePrerequisites: async (projectId: string) => structuredClone(smoke.prerequisites.filter(item => item.projectId === projectId)),
    loadSmokeRuns: async (projectId: string) => structuredClone(smoke.runs.filter(item => item.projectId === projectId)),
    loadSmokeRunPrerequisites: async (projectId: string) => structuredClone(smoke.runPrerequisites.filter(item => item.projectId === projectId)),
    loadSmokeExecutions: async (projectId: string) => structuredClone(smoke.executions.filter(item => item.projectId === projectId)),
    saveSmokeSuiteApi: async (item: SmokeState['suites'][number], creating: boolean) => { const saved = structuredClone(item); smoke.suites = creating ? [...smoke.suites, saved] : smoke.suites.map(value => value.id === saved.id ? saved : value); return saved },
    saveSmokeSuiteLinksApi: async (projectId: string, suiteId: string, ids: string[]) => { smoke.links = [...smoke.links.filter(item => item.projectId !== projectId || item.suiteId !== suiteId), ...ids.map((testCaseId, order) => ({ projectId, suiteId, testCaseId, order }))] },
    replaceSmokePrerequisitesApi: async (projectId: string, suiteId: string, values: { text: string }[]) => { smoke.prerequisites = [...smoke.prerequisites.filter(item => item.projectId !== projectId || item.suiteId !== suiteId), ...values.map((item, order) => ({ id: crypto.randomUUID(), projectId, suiteId, text: item.text, order }))] },
    deleteSmokeSuiteApi: async (projectId: string, id: string) => { smoke = deleteSmokeSuite(smoke, projectId, id) },
    createSmokeRunApi: async (projectId: string, suiteId: string, input: Parameters<typeof createSmokeRun>[3]) => { const next = createSmokeRun(smoke, projectId, suiteId, input, cases, areas, types, 42, setup); const run = next.runs.at(-1)!; const executions = next.executions.filter(item => item.runId === run.id), prerequisites = next.runPrerequisites.filter(item => item.runId === run.id); smoke = next; return { run: structuredClone(run), executions: structuredClone(executions), prerequisites: structuredClone(prerequisites) } },
    updateSmokeRunApi: async (projectId: string, id: string, status: 'Draft' | 'In Progress' | 'Completed') => { smoke = changeSmokeRunStatus(smoke, projectId, id, status === 'Draft' ? 'In Progress' : status); return structuredClone(smoke.runs.find(item => item.id === id)!) },
    saveSmokeExecutionApi: async (projectId: string, id: string, input: Parameters<typeof saveSmokeExecution>[3]) => { smoke = saveSmokeExecution(smoke, projectId, id, input, 42); return structuredClone(smoke.executions.find(item => item.id === id)!) },
    saveSmokeRunPrerequisiteApi: async (projectId: string, item: SmokeState['runPrerequisites'][number]) => { smoke = saveSmokeRunPrerequisite(smoke, projectId, item.id, item); return structuredClone(smoke.runPrerequisites.find(value => value.id === item.id)!) },
    loadEvidenceItems: async (projectId: string) => structuredClone(evidence.filter(item => item.projectId === projectId)),
    uploadEvidenceFile: async (owner: EvidenceOwner, file: File) => {
      const item: EvidenceItem = { id: crypto.randomUUID(), ...owner, kind: 'file', name: file.name, mimeType: file.type, sizeBytes: file.size, url: `https://api.test/evidence/?action=content&projectId=${owner.projectId}`, createdAt: new Date().toISOString(), createdByUserId: 42 }
      evidence = [...evidence, item]
      return structuredClone(item)
    },
    createEvidenceLink: async (owner: EvidenceOwner, name: string, url: string) => {
      const item: EvidenceItem = { id: crypto.randomUUID(), ...owner, kind: 'link', name, url, createdAt: new Date().toISOString(), createdByUserId: 42 }
      evidence = [...evidence, item]
      return structuredClone(item)
    },
    deleteEvidenceItem: async (projectId: string, id: string) => { evidence = evidence.filter(item => item.projectId !== projectId || item.id !== id) },
  }
})

import App from '@/App'

export async function renderAuthenticatedApp() {
  apiFixture.reset()
  if (typeof window.localStorage?.setItem !== 'function') {
    const values = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size },
    } })
  }
  window.localStorage.clear()
  window.localStorage.setItem('qa:selectedProjectId:42', 'voicli')
  window.localStorage.setItem('qa-last-page:42:voicli', 'Smoke')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, user: { id: 42, name: 'Alena Minina', email: 'alena@example.com', emailVerified: true } }), { status: 200 })))
  render(<App />)
  await screen.findByRole('navigation', { name: 'Розділи застосунку' })
  await screen.findByRole('button', { name: 'Project: Voicli' })
  await waitFor(() => {
    if (screen.queryByText('Завантаження даних проєкту…')) throw new Error('Project data is still loading')
  })
}
