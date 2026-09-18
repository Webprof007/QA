import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import type { Project, ProjectArea, Requirement, RequirementTestCaseLink, TestCase, TestCaseDictionaryValue, TestPlan } from '@/types'

const apiFixture = vi.hoisted<{ reset: () => void }>(() => ({ reset: () => undefined }))

vi.mock('@/lib/qaApi', async () => {
  const [{ projects }, { createProjectAreaData }, { initialRequirementTestCaseLinks }] = await Promise.all([
    import('@/data/mockData'), import('@/data/projectAreaMockData'), import('@/data/requirementsMockData'),
  ])
  let projectItems: Project[] = [], areas: ProjectArea[] = [], requirements: Requirement[] = [], cases: TestCase[] = [], types: TestCaseDictionaryValue[] = [], plans: TestPlan[] = [], links: RequirementTestCaseLink[] = []
  const reset = () => {
    const seed = createProjectAreaData()
    projectItems = structuredClone(projects)
    areas = structuredClone(seed.areas)
    requirements = structuredClone(Object.values(seed.requirements).flatMap(value => value.items))
    cases = structuredClone(Object.values(seed.testCases).flatMap(value => value.items))
    types = structuredClone(Object.values(seed.testCases).flatMap(value => value.types))
    plans = []
    links = structuredClone(initialRequirementTestCaseLinks)
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
