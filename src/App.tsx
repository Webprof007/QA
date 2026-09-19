import { DefectContext } from '@/components/defects/defectContext'
import type { DefectSourceRef } from '@/types'
import { retestTransition } from '@/lib/defectRetests'
import type { DefectRetest } from '@/types'
import { ProjectSettingsPage, type ProjectSetupDraft } from '@/pages/ProjectSettingsPage'
import { saveBuild, saveEnvironment, saveRelease } from '@/lib/projectSetup'
import { TestSuitesPage } from '@/pages/TestSuitesPage'
import { validateTestSuiteInput, type TestSuiteInput } from '@/lib/testSuites'
import { CoveragePage } from '@/pages/CoveragePage'
import { requirementsWithLinks, replaceCoverageLinks } from '@/lib/coverage'
import type { RequirementsViewState } from '@/types'
import { DefectsPage } from '@/pages/DefectsPage'
import { resolveDefectSource, saveDefect } from '@/lib/defects'
import { AccountBarSlotContext } from '@/components/accountBarContext'
import { TestRunsPage } from '@/pages/TestRunsPage'
import { createProjectAreaData } from '@/data/projectAreaMockData'
import { TestPlanPage } from '@/pages/TestPlanPage'
import { ChecklistsPage } from '@/pages/ChecklistsPage'
import { RequirementsPage } from '@/pages/RequirementsPage'
import { TestCasesPage } from '@/pages/TestCasesPage'
import { emptyTestCasesProject } from '@/data/testCasesMockData'
import { createEvidenceUrls } from '@/lib/evidenceUrls'
import { EvidenceContext } from '@/components/evidence/evidenceContext'
import { evidenceOwnerStatus, ownerEvidence, replaceEvidence, type EvidenceOwners } from '@/lib/evidence'
import type { EvidenceItem } from '@/types'
import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { AppSidebar } from '@/components/AppSidebar'
import { navigationLabels } from '@/components/navigationLabels'
import { ProjectCreateDialog } from '@/components/ProjectCreateDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { SmokePage } from '@/pages/SmokePage'
import { saveSmokeSuite } from '@/lib/smoke'
import { AuditPage } from '@/pages/AuditPage'
import { PasswordRecoveryPage } from '@/pages/PasswordRecoveryPage'
import { AuthPage } from '@/pages/AuthPage'
import { saveAudit, transitionAudit, saveAuditCheck, saveAuditFinding, removeAuditFinding } from '@/lib/audit'
import { initialAudits, initialAuditTypes } from '@/data/auditMockData'
import type { AuditState, Checklist, ChecklistRun, DefectsState, ProjectSetupState, SmokeState, TestPlan, TestRunsState, TestCasesProjectState, TestSuitesState, Page, Project } from '@/types'
import './AppShell.css'
import './App.css'
import './styles/EntityWorkspace.css'
import './styles/FormControls.css'
import { useAuth, type AuthUser } from '@/hooks/useAuth'
import { CheckEmailPage } from '@/pages/CheckEmailPage'
import { ApiError, errorMessage } from '@/lib/api'
import { createProject as createProjectApi, createRequirementTestCaseLink, deleteArea as deleteAreaApi, deleteProject as deleteProjectApi, deleteRequirement as deleteRequirementApi, deleteRequirementTestCaseLink, deleteTestCase as deleteTestCaseApi, deleteTestCaseType, deleteTestPlan as deleteTestPlanApi, deleteTestSuite as deleteTestSuiteApi, loadAreas, loadProjects, loadRequirementTestCaseLinks, loadRequirements, loadTestCases, loadTestCaseTypes, loadTestPlans, loadTestSuiteTestCaseLinks, loadTestSuites, saveArea as saveAreaApi, saveRequirement as saveRequirementApi, saveTestCase as saveTestCaseApi, saveTestCaseType, saveTestPlan as saveTestPlanApi, saveTestSuite as saveTestSuiteApi, saveTestSuiteTestCaseLinks } from '@/lib/qaApi'
import { createChecklistRunApi, createDefectRetestApi, createDefectSourceLinkApi, createEvidenceLink, createSmokeRunApi, createTestRunApi, deleteBuildApi, deleteEnvironmentApi, deleteEvidenceItem, deleteSmokeSuiteApi, loadBuilds, loadChecklistRunItems, loadChecklistRuns, loadChecklists, loadDefectRetests, loadDefectSourceLinks, loadDefects, loadEnvironments, loadEvidenceItems, loadReleases, loadSmokeExecutions, loadSmokePrerequisites, loadSmokeRunPrerequisites, loadSmokeRuns, loadSmokeSuiteLinks, loadSmokeSuites, loadTestExecutions, loadTestRuns, replaceSmokePrerequisitesApi, saveBuildApi, saveChecklistApi, saveChecklistRunItemApi, saveDefectApi, saveEnvironmentApi, saveReleaseApi, saveSmokeExecutionApi, saveSmokeRunPrerequisiteApi, saveSmokeSuiteApi, saveSmokeSuiteLinksApi, saveTestExecutionApi, updateChecklistRunApi, updateSmokeRunApi, updateTestRunStatusApi, uploadEvidenceFile } from '@/lib/qaApi'

function lastPageFor(userId: number, projectKey: string, fallback: Page = 'Settings'): Page {
  try {
    const saved = window.localStorage.getItem(`qa-last-page:${userId}:${projectKey}`) as Page | null
    return saved && navigationLabels[saved] ? saved : fallback
  } catch { return fallback }
}

function selectedProjectKey(userId: number) { return `qa:selectedProjectId:${userId}` }
function savedProjectFor(userId: number): string {
  try { return window.localStorage.getItem(selectedProjectKey(userId)) ?? '' }
  catch { return '' }
}

function App() {
  const auth = useAuth()
  const [recovery, setRecovery] = useState<'forgot' | 'reset' | 'login' | null>(() => new URLSearchParams(window.location.search).has('resetPassword') ? 'reset' : null)
  const loginPage = <AuthPage onForgotPassword={() => setRecovery('forgot')} onLogin={async input => {
    const error = await auth.login(input)
    if (!error) setRecovery(null)
    return error
  }} onRegister={async input => {
    const error = await auth.register(input)
    if (!error) setRecovery(null)
    return error
  }} />
  // Recovery UI takes precedence over session state; it never logs the user out.
  if (recovery === 'reset' || recovery === 'forgot') return <PasswordRecoveryPage key={recovery} mode={recovery} onLogin={() => setRecovery('login')} onForgot={() => setRecovery('forgot')} />
  if (auth.isAuthLoading) return <main className="auth-page"><p role="status">Завантаження…</p></main>
  if (auth.initialError) return <main className="auth-page"><div className="auth-content"><p role="alert" className="auth-error">{auth.initialError}</p><Button onClick={() => void auth.retry()}>Спробувати ще раз</Button></div></main>
  if (recovery === 'login' || !auth.user) return loginPage
  if (auth.status === 'authenticated_unverified') return <CheckEmailPage auth={auth} />
  return <QAApp key={auth.user.id} currentUser={auth.user} onLogout={auth.logout} onUnauthorized={() => void auth.refreshUser()} />
}

function QAApp({ currentUser, onLogout, onUnauthorized }: { currentUser: AuthUser; onLogout: () => Promise<void>; onUnauthorized: () => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [accountBackSlot, setAccountBackSlot] = useState<HTMLDivElement | null>(null)
  const [logoutPending, setLogoutPending] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [deletingProjectPending, setDeletingProjectPending] = useState(false)
  const [deletingProjectError, setDeletingProjectError] = useState('')
  const [projectId, setProjectId] = useState('')
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectDataLoading, setProjectDataLoading] = useState(false)
  const [backendError, setBackendError] = useState('')
  const [page, setPage] = useState<Page>('Settings')
  const [projectSetup, setProjectSetup] = useState<ProjectSetupState>({ environments: [], releases: [], builds: [] })
  const [seed] = useState(createProjectAreaData)
  const [testSuites, setTestSuites] = useState<TestSuitesState>({ suites: [], links: [] })
  const [suiteTarget, setSuiteTarget] = useState<{ id?: string; key: number }>({ key: 0 })
  const [smoke, setSmoke] = useState<SmokeState>({ suites: [], links: [], prerequisites: [], runs: [], runPrerequisites: [], executions: [] })
  const [projectAreas, setProjectAreas] = useState<import('@/types').ProjectArea[]>([])
  const [defectRetests, setDefectRetests] = useState<DefectRetest[]>([])
  const [defects, setDefects] = useState<DefectsState>({ items: [], links: [] })
  const [defectTarget, setDefectTarget] = useState<{ id?: string; source?: DefectSourceRef; key: number }>({ key: 0 })
  const [followupTarget, setFollowupTarget] = useState<{ source?: DefectSourceRef; key: number }>({ key: 0 })
  const [executionTarget, setExecutionTarget] = useState<{ id?: string; runId?: string; sourceSuiteId?: string; key: number }>({ key: 0 })
  const [testRunData, setTestRunData] = useState<TestRunsState>({ runs: [], executions: [] })
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [checklistRuns, setChecklistRuns] = useState<ChecklistRun[]>([])
  const [auditTypes, setAuditTypes] = useState(initialAuditTypes)
  const [requirementLinks, setRequirementLinks] = useState<import('@/types').RequirementTestCaseLink[]>([])
  const requirementLinksRef = useRef<import('@/types').RequirementTestCaseLink[]>([])
  const coverageMutationQueue = useRef<Promise<void>>(Promise.resolve())
  const [requirementsByProject, setRequirementsByProject] = useState<Record<string, { items: import('@/types').Requirement[] }>>({})
  const requirementsByProjectRef = useRef(requirementsByProject)
  const [testCasesByProject, setTestCasesByProject] = useState<Record<string, Pick<TestCasesProjectState, 'items' | 'types'>>>({})
  const [auditData, setAuditData] = useState<AuditState>(() => ({ audits: structuredClone(initialAudits), checks: [], findings: Object.values(seed.audit).flat() }))
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([])
  const [evidenceUrls] = useState(createEvidenceUrls)
  const defectSources = { testRuns: testRunData, smoke, audits: auditData }
  const evidenceOwners: EvidenceOwners = { testRuns: testRunData, smoke, defects: defects.items, retests: defectRetests, audits: auditData.audits, auditFindings: auditData.findings }
  useEffect(() => evidenceUrls.retain(evidenceItems.filter(item => item.url.startsWith('blob:')).map(item => item.url)), [evidenceItems, evidenceUrls])
  useEffect(() => { requirementLinksRef.current = requirementLinks }, [requirementLinks])
  useEffect(() => { requirementsByProjectRef.current = requirementsByProject }, [requirementsByProject])
  const availableProjects = projects
  const project = availableProjects.find(item => item.id === projectId)

  useEffect(() => {
    if (!projectId) return
    try { window.localStorage.setItem(`qa-last-page:${currentUser.id}:${projectId}`, page) } catch { /* storage can be unavailable in private browsing */ }
  }, [currentUser.id, page, projectId])

  useEffect(() => {
    if (projectsLoading) return
    try {
      const key = selectedProjectKey(currentUser.id)
      if (projectId) window.localStorage.setItem(key, projectId)
      else window.localStorage.removeItem(key)
    } catch { /* storage can be unavailable in private browsing */ }
  }, [currentUser.id, projectId, projectsLoading])

  const apiFailure = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized()
    if (error instanceof Error && !(error instanceof ApiError)) return error.message
    return errorMessage(error)
  }, [onUnauthorized])

  useEffect(() => {
    const controller = new AbortController()
    void loadProjects(controller.signal).then(items => {
      if (!controller.signal.aborted) {
        setProjects(items)
        setBackendError('')
        setProjectDataLoading(items.length > 0)
        const savedProjectId = savedProjectFor(currentUser.id)
        const nextProjectId = items.some(item => item.id === savedProjectId) ? savedProjectId : items[0]?.id ?? ''
        if (savedProjectId && savedProjectId !== nextProjectId) {
          try { window.localStorage.removeItem(selectedProjectKey(currentUser.id)) } catch { /* storage can be unavailable in private browsing */ }
        }
        setProjectId(nextProjectId)
        if (nextProjectId) setPage(lastPageFor(currentUser.id, nextProjectId))
      }
    }).catch(error => { if (!controller.signal.aborted) setBackendError(apiFailure(error)) })
      .finally(() => { if (!controller.signal.aborted) setProjectsLoading(false) })
    return () => controller.abort()
  }, [apiFailure, currentUser.id])

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController(), selectedProjectId = projectId
    void Promise.allSettled([
      loadAreas(selectedProjectId, controller.signal), loadRequirements(selectedProjectId, controller.signal), loadTestPlans(selectedProjectId, controller.signal), loadTestCaseTypes(selectedProjectId, controller.signal), loadTestCases(selectedProjectId, controller.signal), loadRequirementTestCaseLinks(selectedProjectId, controller.signal), loadTestSuites(selectedProjectId, controller.signal), loadTestSuiteTestCaseLinks(selectedProjectId, controller.signal),
      loadEnvironments(selectedProjectId, controller.signal), loadReleases(selectedProjectId, controller.signal), loadBuilds(selectedProjectId, controller.signal), loadTestRuns(selectedProjectId, controller.signal), loadTestExecutions(selectedProjectId, controller.signal), loadDefects(selectedProjectId, controller.signal), loadDefectSourceLinks(selectedProjectId, controller.signal), loadDefectRetests(selectedProjectId, controller.signal), loadChecklists(selectedProjectId, controller.signal), loadChecklistRuns(selectedProjectId, controller.signal), loadChecklistRunItems(selectedProjectId, controller.signal), loadSmokeSuites(selectedProjectId, controller.signal), loadSmokeSuiteLinks(selectedProjectId, controller.signal), loadSmokePrerequisites(selectedProjectId, controller.signal), loadSmokeRuns(selectedProjectId, controller.signal), loadSmokeRunPrerequisites(selectedProjectId, controller.signal), loadSmokeExecutions(selectedProjectId, controller.signal), loadEvidenceItems(selectedProjectId, controller.signal),
    ])
      .then(([areas, requirements, plans, types, cases, links, suites, suiteLinks, environments, releases, builds, runs, executions, defectItems, defectLinks, retests, checklistItems, checklistRunItems, checklistItemsInRuns, smokeSuites, smokeLinks, smokePrerequisites, smokeRuns, smokeRunPrerequisites, smokeExecutions, evidence]) => {
        if (controller.signal.aborted) return
        if (areas.status === 'fulfilled') setProjectAreas(current => [...current.filter(item => item.projectId !== selectedProjectId), ...areas.value])
        if (requirements.status === 'fulfilled') setRequirementsByProject(current => ({ ...current, [selectedProjectId]: { items: requirements.value } }))
        if (plans.status === 'fulfilled') setTestPlans(current => [...current.filter(item => item.projectId !== selectedProjectId), ...plans.value])
        if (types.status === 'fulfilled' || cases.status === 'fulfilled') setTestCasesByProject(current => ({ ...current, [selectedProjectId]: { items: cases.status === 'fulfilled' ? cases.value : current[selectedProjectId]?.items ?? [], types: types.status === 'fulfilled' ? types.value : current[selectedProjectId]?.types ?? [] } }))
        if (links.status === 'fulfilled') setRequirementLinks(current => {
          const next = [...current.filter(link => link.projectId !== selectedProjectId), ...links.value]
          requirementLinksRef.current = next
          return next
        })
        if (suites.status === 'fulfilled' || suiteLinks.status === 'fulfilled') setTestSuites(current => ({
          suites: suites.status === 'fulfilled' ? [...current.suites.filter(item => item.projectId !== selectedProjectId), ...suites.value] : current.suites,
          links: suiteLinks.status === 'fulfilled' ? [...current.links.filter(item => item.projectId !== selectedProjectId), ...suiteLinks.value] : current.links,
        }))
        if (environments.status === 'fulfilled' || releases.status === 'fulfilled' || builds.status === 'fulfilled') setProjectSetup(current => ({
          environments: environments.status === 'fulfilled' ? [...current.environments.filter(item => item.projectId !== selectedProjectId), ...environments.value] : current.environments,
          releases: releases.status === 'fulfilled' ? [...current.releases.filter(item => item.projectId !== selectedProjectId), ...releases.value] : current.releases,
          builds: builds.status === 'fulfilled' ? [...current.builds.filter(item => item.projectId !== selectedProjectId), ...builds.value] : current.builds,
        }))
        if (runs.status === 'fulfilled' || executions.status === 'fulfilled') setTestRunData(current => ({ runs: runs.status === 'fulfilled' ? [...current.runs.filter(item => item.projectId !== selectedProjectId), ...runs.value] : current.runs, executions: executions.status === 'fulfilled' ? [...current.executions.filter(item => item.projectId !== selectedProjectId), ...executions.value] : current.executions }))
        if (defectItems.status === 'fulfilled' || defectLinks.status === 'fulfilled') setDefects(current => ({
          items: defectItems.status === 'fulfilled' ? [...current.items.filter(item => item.projectId !== selectedProjectId), ...defectItems.value] : current.items,
          links: defectLinks.status === 'fulfilled' ? [...current.links.filter(item => item.projectId !== selectedProjectId || item.sourceType === 'auditFinding'), ...defectLinks.value.filter(item => item.sourceType !== 'auditFinding')] : current.links,
        }))
        if (retests.status === 'fulfilled') setDefectRetests(current => [...current.filter(item => item.projectId !== selectedProjectId), ...retests.value])
        if (checklistItems.status === 'fulfilled') setChecklists(current => [...current.filter(item => item.projectId !== selectedProjectId), ...checklistItems.value])
        if (checklistRunItems.status === 'fulfilled') {
          const items = checklistItemsInRuns.status === 'fulfilled' ? checklistItemsInRuns.value : []
          setChecklistRuns(current => [...current.filter(item => item.projectId !== selectedProjectId), ...checklistRunItems.value.map(run => ({ ...run, items: items.filter(item => item.runId === run.id) }))])
        }
        if ([smokeSuites, smokeLinks, smokePrerequisites, smokeRuns, smokeRunPrerequisites, smokeExecutions].some(result => result.status === 'fulfilled')) setSmoke(current => ({
          suites: smokeSuites.status === 'fulfilled' ? [...current.suites.filter(item => item.projectId !== selectedProjectId), ...smokeSuites.value] : current.suites,
          links: smokeLinks.status === 'fulfilled' ? [...current.links.filter(item => item.projectId !== selectedProjectId), ...smokeLinks.value] : current.links,
          prerequisites: smokePrerequisites.status === 'fulfilled' ? [...current.prerequisites.filter(item => item.projectId !== selectedProjectId), ...smokePrerequisites.value] : current.prerequisites,
          runs: smokeRuns.status === 'fulfilled' ? [...current.runs.filter(item => item.projectId !== selectedProjectId), ...smokeRuns.value] : current.runs,
          runPrerequisites: smokeRunPrerequisites.status === 'fulfilled' ? [...current.runPrerequisites.filter(item => item.projectId !== selectedProjectId), ...smokeRunPrerequisites.value] : current.runPrerequisites,
          executions: smokeExecutions.status === 'fulfilled' ? [...current.executions.filter(item => item.projectId !== selectedProjectId), ...smokeExecutions.value] : current.executions,
        }))
        // Audit remains on its existing frontend-only evidence flow.
        if (evidence.status === 'fulfilled') setEvidenceItems(current => [...current.filter(item => item.projectId !== selectedProjectId || item.ownerType === 'auditFinding'), ...evidence.value.filter(item => item.ownerType !== 'auditFinding')])
        const failure = [areas, requirements, plans, types, cases, links, suites, suiteLinks, environments, releases, builds, runs, executions, defectItems, defectLinks, retests, checklistItems, checklistRunItems, checklistItemsInRuns, smokeSuites, smokeLinks, smokePrerequisites, smokeRuns, smokeRunPrerequisites, smokeExecutions, evidence].find(result => result.status === 'rejected')
        setBackendError(failure?.status === 'rejected' ? apiFailure(failure.reason) : '')
      })
      .finally(() => { if (!controller.signal.aborted) setProjectDataLoading(false) })
    return () => controller.abort()
  }, [projectId, apiFailure])

  function changeProject(id: string) {
    if (availableProjects.some(item => item.id === id)) { setProjectDataLoading(true); setBackendError(''); setProjectId(id); setPage(lastPageFor(currentUser.id, id, page)); setFollowupTarget({ key: 0 }); setSuiteTarget({ key: 0 }); setDefectTarget({ key: 0 }); setExecutionTarget({ key: 0 }) }
  }

  async function addProject(name: string) {
    try {
      const created = await createProjectApi(name)
      setProjects(current => [...current, created]); setProjectDataLoading(true); setProjectId(created.id); setPage('Settings'); setCreatingProject(false); setBackendError('')
      return null
    } catch (error) { return apiFailure(error) }
  }

  async function logout() {
    if (logoutPending) return
    setLogoutPending(true); setLogoutError('')
    try { await onLogout() } catch (error) { setLogoutError(errorMessage(error)) }
    finally { setLogoutPending(false) }
  }

  async function deleteProject() {
    if (!deletingProject || deletingProjectPending) return
    const id = deletingProject.id
    setDeletingProjectPending(true); setDeletingProjectError('')
    try { await deleteProjectApi(id) } catch (error) {
      const message = apiFailure(error)
      setBackendError(message); setDeletingProjectError(message); setDeletingProjectPending(false)
      return
    }
    setEvidenceItems(current => current.filter(item => item.projectId !== id))
    setDefectRetests(current => current.filter(item => item.projectId !== id))
    setProjects(current => current.filter(item => item.id !== id))
    setProjectSetup(current => ({ environments: current.environments.filter(item => item.projectId !== id), releases: current.releases.filter(item => item.projectId !== id), builds: current.builds.filter(item => item.projectId !== id) }))
    setTestSuites(current => ({ suites: current.suites.filter(item => item.projectId !== id), links: current.links.filter(item => item.projectId !== id) }))
    setDefects(current => ({ items: current.items.filter(item => item.projectId !== id), links: current.links.filter(item => item.projectId !== id) }))
    setTestRunData(current => ({ runs: current.runs.filter(run => run.projectId !== id), executions: current.executions.filter(execution => execution.projectId !== id) }))
    setRequirementLinks(current => current.filter(item => item.projectId !== id))
    setProjectAreas(current => current.filter(item => item.projectId !== id))
    setTestPlans(current => current.filter(item => item.projectId !== id))
    setChecklists(current => current.filter(item => item.projectId !== id))
    setChecklistRuns(current => current.filter(item => item.projectId !== id))
    setRequirementsByProject(current => { const next = { ...current }; delete next[id]; return next })
    setTestCasesByProject(current => { const next = { ...current }; delete next[id]; return next })
    setSmoke(current => ({ suites: current.suites.filter(item => item.projectId !== id), links: current.links.filter(item => item.projectId !== id), prerequisites: current.prerequisites.filter(item => item.projectId !== id), runs: current.runs.filter(item => item.projectId !== id), runPrerequisites: current.runPrerequisites.filter(item => item.projectId !== id), executions: current.executions.filter(item => item.projectId !== id) }))
    setAuditData(current => ({ audits: current.audits.filter(item => item.projectId !== id), checks: current.checks.filter(item => item.projectId !== id), findings: current.findings.filter(item => item.projectId !== id) }))

    if (projectId === id) {
      const nextId = availableProjects.find(item => item.id !== id)?.id ?? ''
      setProjectDataLoading(Boolean(nextId)); setProjectId(nextId)
    }
    setDeletingProject(null); setDeletingProjectPending(false); setDeletingProjectError('')
  }

  function changeTestCases(action: SetStateAction<TestCasesProjectState>) {
    const data = { ...(testCasesByProject[projectId] ?? emptyTestCasesProject()), areas: projectAreas.filter(area => area.projectId === projectId) }
    const next = typeof action === 'function' ? action(data) : action
    updateAreas(next.areas)
    setTestCasesByProject(current => ({ ...current, [projectId]: { items: next.items, types: next.types } }))
    const removedIds = new Set(data.items.filter(item => !next.items.some(test => test.id === item.id)).map(item => item.id))
    if (removedIds.size) setRequirementLinks(current => current.filter(link => link.projectId !== projectId || !removedIds.has(link.testCaseId)))
  }

  function requirementView(): RequirementsViewState {
    return { areas: projectAreas.filter(area => area.projectId === projectId), items: requirementsWithLinks(projectId, requirementsByProject[projectId]?.items ?? [], testCasesByProject[projectId]?.items ?? [], requirementLinks) }
  }
  function changeRequirements(action: SetStateAction<RequirementsViewState>) {
    const data = requirementView()
    const next = typeof action === 'function' ? action(data) : action
    updateAreas(next.areas)
    const items = next.items.filter(item => item.projectId === projectId).map(item => {
      const { testCaseIds, ...definition } = item
      void testCaseIds
      return definition
    })
    setRequirementsByProject(current => ({ ...current, [projectId]: { items } }))
  }
  function changeCoverage(direction: 'requirement' | 'testCase', id: string, selectedIds: string[]) {
    const selectedProjectId = projectId
    const requirements = requirementsByProjectRef.current[selectedProjectId]?.items ?? []
    const cases = testCasesByProject[selectedProjectId]?.items ?? []
    const task = coverageMutationQueue.current.then(async () => {
      const currentLinks = requirementLinksRef.current
      const currentProjectLinks = currentLinks.filter(link => link.projectId === selectedProjectId)
      const desired = replaceCoverageLinks(currentLinks, selectedProjectId, direction, id, selectedIds, requirements, cases).filter(link => link.projectId === selectedProjectId)
      const key = (link: import('@/types').RequirementTestCaseLink) => `${link.requirementId}:${link.testCaseId}`
      const currentKeys = new Set(currentProjectLinks.map(key)), desiredKeys = new Set(desired.map(key))
      const additions = desired.filter(link => !currentKeys.has(key(link)))
      const removals = currentProjectLinks.filter(link => !desiredKeys.has(key(link)))
      try {
        await Promise.all([...additions.map(createRequirementTestCaseLink), ...removals.map(deleteRequirementTestCaseLink)])
        const reloaded = await loadRequirementTestCaseLinks(selectedProjectId)
        setRequirementLinks(current => {
          const next = [...current.filter(link => link.projectId !== selectedProjectId), ...reloaded]
          requirementLinksRef.current = next
          return next
        })
      } catch (error) {
        try {
          const reloaded = await loadRequirementTestCaseLinks(selectedProjectId)
          setRequirementLinks(current => {
            const next = [...current.filter(link => link.projectId !== selectedProjectId), ...reloaded]
            requirementLinksRef.current = next
            return next
          })
        } catch { /* keep the last known cache if reconciliation also fails */ }
        throw new Error(apiFailure(error), { cause: error })
      }
    })
    coverageMutationQueue.current = task.catch(() => undefined)
    return task
  }

  function areaInUse(id: string) {
    return (testCasesByProject[projectId]?.items ?? []).some(item => item.areaId === id)
      || (requirementsByProject[projectId]?.items ?? []).some(item => item.areaId === id)
      || auditData.findings.some(item => item.projectId === projectId && item.areaId === id)
      || defects.items.some(item => item.projectId === projectId && item.areaId === id)
      || checklists.some(item => item.projectId === projectId && item.areaId === id)
  }
  function updateAreas(areas: typeof projectAreas) {
    setProjectAreas(current => [...current.filter(area => area.projectId !== projectId), ...areas.filter(area => area.projectId === projectId)])
  }
  async function saveArea(name: string, id?: string) {
    try {
      const value = await saveAreaApi(projectId, name, id)
      setProjectAreas(current => id ? current.map(area => area.id === id && area.projectId === projectId ? value : area) : [...current, value])
      return value.id
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function removeArea(id: string) {
    if (areaInUse(id)) return 'Area використовується в цьому проєкті. Спочатку змініть пов’язані записи.'
    try { await deleteAreaApi(projectId, id) } catch (error) { return apiFailure(error) }
    setProjectAreas(current => current.filter(area => area.id !== id || area.projectId !== projectId))
    return ''
  }
  async function saveType(name: string, id?: string) {
    try {
      const value = await saveTestCaseType(projectId, name, id)
      setTestCasesByProject(current => ({ ...current, [projectId]: { items: current[projectId]?.items ?? [], types: id ? (current[projectId]?.types ?? []).map(type => type.id === id ? value : type) : [...(current[projectId]?.types ?? []), value] } }))
      return value.id
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function removeType(id: string) {
    if ((testCasesByProject[projectId]?.items ?? []).some(item => item.typeId === id)) return 'Type використовується в Test Case.'
    try { await deleteTestCaseType(projectId, id) } catch (error) { return apiFailure(error) }
    setTestCasesByProject(current => ({ ...current, [projectId]: { items: current[projectId]?.items ?? [], types: (current[projectId]?.types ?? []).filter(type => type.id !== id) } }))
    return ''
  }
  async function saveProjectSetup(draft: ProjectSetupDraft) {
    try {
      const creating = !projectSetup[draft.kind === 'Environment' ? 'environments' : draft.kind === 'Release' ? 'releases' : 'builds'].some(item => item.id === draft.value.id && item.projectId === projectId)
      if (draft.kind === 'Environment') {
        const candidate = saveEnvironment(projectSetup, projectId, draft.value).environments.find(item => item.id === draft.value.id)!
        const saved = await saveEnvironmentApi(candidate, creating)
        setProjectSetup(current => ({ ...current, environments: [...current.environments.filter(item => item.id !== saved.id && item.id !== draft.value.id), saved] }))
      } else if (draft.kind === 'Release') {
        const candidate = saveRelease(projectSetup, projectId, draft.value).releases.find(item => item.id === draft.value.id)!
        const saved = await saveReleaseApi(candidate, creating)
        setProjectSetup(current => ({ ...current, releases: [...current.releases.filter(item => item.id !== saved.id && item.id !== draft.value.id), saved] }))
      } else {
        const candidate = saveBuild(projectSetup, projectId, draft.value).builds.find(item => item.id === draft.value.id)!
        const saved = await saveBuildApi(candidate, creating)
        setProjectSetup(current => ({ ...current, builds: [...current.builds.filter(item => item.id !== saved.id && item.id !== draft.value.id), saved] }))
      }
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function deleteProjectSetup(kind: 'environments' | 'builds', id: string) {
    try {
      if (kind === 'environments') await deleteEnvironmentApi(projectId, id)
      else await deleteBuildApi(projectId, id)
      setProjectSetup(current => ({ ...current, [kind]: current[kind].filter(item => item.projectId !== projectId || item.id !== id) }))
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function saveRequirementRemote(item: import('@/types').RequirementWithTestCases, creating: boolean) {
    try {
      const saved = await saveRequirementApi(item, creating)
      const current = requirementsByProjectRef.current
      const next = { ...current, [projectId]: {
          items: creating
            ? [...(current[projectId]?.items ?? []).filter(value => value.id !== saved.id), saved]
            : (current[projectId]?.items ?? []).map(value => value.id === saved.id ? saved : value),
        } }
      requirementsByProjectRef.current = next
      setRequirementsByProject(next)
      return { ...saved, testCaseIds: item.testCaseIds }
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function deleteRequirementRemote(id: string) {
    try {
      await deleteRequirementApi(projectId, id)
      setRequirementLinks(current => current.filter(link => link.projectId !== projectId || link.requirementId !== id))
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function importRequirements(items: import('@/types').RequirementWithTestCases[]) {
    const saved: import('@/types').Requirement[] = [], failures: string[] = []
    for (const [index, item] of items.entries()) {
      try { saved.push(await saveRequirementApi(item, true)) }
      catch (error) { failures.push(`Row ${index + 1}: ${apiFailure(error)}`) }
    }
    if (saved.length) setRequirementsByProject(current => ({ ...current, [projectId]: { items: [...(current[projectId]?.items ?? []), ...saved] } }))
    if (failures.length) throw new Error(`Imported ${saved.length} of ${items.length}. ${failures.join(' ')}`)
  }
  async function saveTestCaseRemote(item: import('@/types').TestCase, creating: boolean) {
    try { return await saveTestCaseApi({ ...item, projectId }, creating) }
    catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function deleteTestCaseRemote(id: string) {
    try {
      await deleteTestCaseApi(projectId, id)
      setRequirementLinks(current => current.filter(link => link.projectId !== projectId || link.testCaseId !== id))
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function importTestCases(items: import('@/types').TestCase[]) {
    const saved: import('@/types').TestCase[] = [], failures: string[] = []
    for (const [index, item] of items.entries()) {
      try { saved.push(await saveTestCaseApi({ ...item, projectId }, true)) }
      catch (error) { failures.push(`Row ${index + 1}: ${apiFailure(error)}`) }
    }
    if (saved.length) setTestCasesByProject(current => ({ ...current, [projectId]: { items: [...(current[projectId]?.items ?? []), ...saved], types: current[projectId]?.types ?? [] } }))
    if (failures.length) throw new Error(`Imported ${saved.length} of ${items.length}. ${failures.join(' ')}`)
  }
  async function savePlan(plan: TestPlan, creating: boolean) {
    try {
      const saved = await saveTestPlanApi({ ...plan, projectId }, creating)
      setTestPlans(current => current.some(item => item.id === saved.id && item.projectId === projectId)
        ? current.map(item => item.id === saved.id && item.projectId === projectId ? saved : item)
        : [...current, saved])
      return saved
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function removePlan(id: string) {
    try {
      await deleteTestPlanApi(projectId, id)
      setTestPlans(current => current.filter(item => item.projectId !== projectId || item.id !== id))
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function saveTestSuiteRemote(input: TestSuiteInput) {
    const cases = testCasesByProject[projectId]?.items ?? []
    const existing = testSuites.suites.find(item => item.id === input.id)
    try {
      const testCaseIds = validateTestSuiteInput(testSuites, projectId, input, cases)
      const saved = await saveTestSuiteApi({
        id: input.id,
        projectId,
        code: existing?.code ?? '',
        name: input.name.trim(),
        description: input.description,
        createdAt: existing?.createdAt ?? '',
        updatedAt: existing?.updatedAt ?? '',
      }, !existing)
      await saveTestSuiteTestCaseLinks(projectId, saved.id, testCaseIds)
      setTestSuites(current => ({
        suites: current.suites.some(item => item.projectId === projectId && item.id === saved.id)
          ? current.suites.map(item => item.projectId === projectId && item.id === saved.id ? saved : item)
          : [...current.suites, saved],
        links: [...current.links.filter(link => link.projectId !== projectId || link.suiteId !== saved.id), ...testCaseIds.map((testCaseId, order) => ({ projectId, suiteId: saved.id, testCaseId, order }))],
      }))
      return saved
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function removeTestSuite(id: string) {
    try {
      await deleteTestSuiteApi(projectId, id)
      setTestSuites(current => ({ suites: current.suites.filter(item => item.projectId !== projectId || item.id !== id), links: current.links.filter(item => item.projectId !== projectId || item.suiteId !== id) }))
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function createTestRunRemote(input: import('@/lib/testRuns').RunInput) {
    try {
      const ids = [...new Set(input.testCaseIds)]
      if (!input.name.trim()) throw new Error('Введіть назву запуску.')
      if (!ids.length || ids.some(id => !(testCasesByProject[projectId]?.items ?? []).some(item => item.id === id && item.projectId === projectId))) throw new Error('Виберіть Test Cases поточного проєкту.')
      if (input.testPlanId && !testPlans.some(item => item.id === input.testPlanId && item.projectId === projectId)) throw new Error('Виберіть Test Plan поточного проєкту.')
      if (input.sourceTestSuiteId && !testSuites.suites.some(item => item.id === input.sourceTestSuiteId && item.projectId === projectId)) throw new Error('Test Suite належить іншому проєкту.')
      const created = await createTestRunApi(projectId, { ...input, testCaseIds: ids })
      const executions = created.executions.length ? created.executions : await loadTestExecutions(projectId)
      setTestRunData(current => ({ runs: [...current.runs.filter(item => item.projectId !== projectId || item.id !== created.run.id), created.run], executions: created.executions.length ? [...current.executions, ...executions] : [...current.executions.filter(item => item.projectId !== projectId), ...executions] }))
      return created.run
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function updateTestRunStatus(id: string, status: import('@/types').TestRun['status']) {
    try { const saved = await updateTestRunStatusApi(projectId, id, status); setTestRunData(current => ({ ...current, runs: current.runs.map(item => item.projectId === projectId && item.id === id ? saved : item) })) }
    catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function saveTestExecutionRemote(id: string, input: import('@/lib/testRuns').ExecutionInput) {
    try { const saved = await saveTestExecutionApi(projectId, id, input); setTestRunData(current => ({ ...current, executions: current.executions.map(item => item.projectId === projectId && item.id === id ? saved : item) })); return saved }
    catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  function openTestSuite(id: string) {
    if (!testSuites.suites.some(item => item.projectId === projectId && item.id === id)) return
    setSuiteTarget(current => ({ id, key: current.key + 1 })); setPage('Test Suites')
  }
  function openSuiteRun(id: string) {
    if (!testRunData.runs.some(item => item.projectId === projectId && item.id === id)) return
    setExecutionTarget(current => ({ runId: id, key: current.key + 1 })); setPage('Test Runs')
  }
  function createRunFromSuite(id: string) {
    if (!testSuites.suites.some(item => item.projectId === projectId && item.id === id)) return
    setExecutionTarget(current => ({ sourceSuiteId: id, key: current.key + 1 })); setPage('Test Runs')
  }
  function openExecution(id: string) {
    if (!testRunData.executions.some(item => item.id === id && item.projectId === projectId)) return
    setExecutionTarget(current => ({ id, key: current.key + 1 })); setPage('Test Runs')
  }
  function openDefect(id: string) {
    if (!defects.items.some(item => item.id === id && item.projectId === projectId)) return
    setDefectTarget(current => ({ id, key: current.key + 1 })); setPage('Defects')
  }
  function createDefectFromSource(source: DefectSourceRef) {
    try {
      const resolved = resolveDefectSource(projectId, source, defectSources)
      if (resolved.kind === 'execution' && resolved.execution.result !== 'Fail') return
      setDefectTarget(current => ({ source, key: current.key + 1 })); setPage('Defects')
    } catch { return }
  }
  function viewDefectSource(source: DefectSourceRef) {
    try {
      resolveDefectSource(projectId, source, defectSources)
      if (source.type === 'testExecution') { openExecution(source.id); return }
      setFollowupTarget(current => ({ source, key: current.key + 1 }))
      setPage(source.type === 'smokeExecution' ? 'Smoke' : 'Audit')
    } catch { return }
  }
  async function attachSourceDefect(source: DefectSourceRef, defectId: string) {
    try {
      const resolved = resolveDefectSource(projectId, source, defectSources)
      if (resolved.kind === 'execution' && resolved.execution.result !== 'Fail') throw new Error('Defect можна пов’язати лише зі збереженим Fail.')
      if (!defects.items.some(item => item.id === defectId && item.projectId === projectId)) throw new Error('Defect поточного проєкту не знайдено.')
      const link = { projectId, sourceType: source.type, sourceId: source.id, defectId }
      if (!defects.links.some(item => item.projectId === projectId && item.sourceType === source.type && item.sourceId === source.id && item.defectId === defectId)) await createDefectSourceLinkApi(link)
      setDefects(current => current.links.some(item => item.projectId === projectId && item.sourceType === source.type && item.sourceId === source.id && item.defectId === defectId) ? current : { ...current, links: [...current.links, link] })
      return null
    } catch (error) { return apiFailure(error) }
  }
  async function saveDefectRemote(draft: import('@/types').Defect) {
    try {
      const creating = !defects.items.some(item => item.id === draft.id && item.projectId === projectId)
      const validated = saveDefect(defects, draft, projectId, currentUser.id, testRunData, projectAreas, projectSetup, defectSources)
      const candidate = validated.items.find(item => item.id === draft.id && item.projectId === projectId)!
      const saved = await saveDefectApi(candidate, creating)
      let link: import('@/types').DefectSourceLink | undefined
      if (creating && draft.source) {
        link = { projectId, sourceType: draft.source.type, sourceId: draft.source.id, defectId: saved.id }
        if (draft.source.type !== 'auditFinding') await createDefectSourceLinkApi(link)
      }
      setDefects(current => ({
        items: [...current.items.filter(item => item.projectId !== projectId || item.id !== saved.id), saved],
        links: link && !current.links.some(item => item.projectId === link.projectId && item.sourceType === link.sourceType && item.sourceId === link.sourceId && item.defectId === link.defectId)
          ? [...current.links, link]
          : current.links,
      }))
      if (creating && draft.source) viewDefectSource(draft.source)
      return saved
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function createRetestRemote(defectId: string, input: import('@/lib/defectRetests').RetestInput, attachments: import('@/components/defects/DefectRetests').RetestEvidenceAttachment[]) {
    let savedRetest = false
    try {
      const saved = await createDefectRetestApi(projectId, defectId, input)
      savedRetest = true
      const next = [...defectRetests, saved]
      const owner = { projectId, ownerType: 'defectRetest' as const, ownerId: saved.id }
      setDefectRetests(next)
      const uploaded = [] as EvidenceItem[]
      for (const attachment of attachments) {
        uploaded.push(attachment.draft.kind === 'file'
          ? await uploadEvidenceFile(owner, (() => { if (!attachment.file) throw new Error(`Файл ${attachment.draft.name} більше недоступний.`); return attachment.file })())
          : await createEvidenceLink(owner, attachment.draft.name, attachment.draft.url))
      }
      if (uploaded.length) setEvidenceItems(current => [...current, ...uploaded])
      return { saved: true }
    } catch (error) { return { saved: savedRetest, error: apiFailure(error) } }
  }
  async function uploadEvidenceRemote(owner: import('@/types').EvidenceOwner, file: File) {
    if (owner.ownerType === 'auditFinding' || owner.projectId !== projectId || !evidenceOwnerStatus(owner, evidenceOwners)?.editable) throw new Error('Власник вкладення недоступний або вже read-only.')
    const saved = await uploadEvidenceFile(owner, file)
    setEvidenceItems(current => [...current.filter(item => item.id !== saved.id), saved])
  }
  async function createEvidenceLinkRemote(owner: import('@/types').EvidenceOwner, name: string, url: string) {
    if (owner.ownerType === 'auditFinding' || owner.projectId !== projectId || !evidenceOwnerStatus(owner, evidenceOwners)?.editable) throw new Error('Власник вкладення недоступний або вже read-only.')
    const saved = await createEvidenceLink(owner, name, url)
    setEvidenceItems(current => [...current.filter(item => item.id !== saved.id), saved])
  }
  async function removeEvidenceRemote(owner: import('@/types').EvidenceOwner, evidenceId: string) {
    if (owner.ownerType === 'auditFinding' || owner.projectId !== projectId || !evidenceOwnerStatus(owner, evidenceOwners)?.editable) throw new Error('Власник вкладення недоступний або вже read-only.')
    const item = evidenceItems.find(value => value.id === evidenceId && value.projectId === owner.projectId && value.ownerType === owner.ownerType && value.ownerId === owner.ownerId)
    if (!item) throw new Error('Вкладення недоступне.')
    await deleteEvidenceItem(owner.projectId, evidenceId)
    setEvidenceItems(current => current.filter(value => value.id !== evidenceId || value.projectId !== owner.projectId))
  }
  async function transitionRetestRemote(defectId: string, action: import('@/components/defects/DefectRetests').RetestAction, retestId?: string) {
    try {
      const next = retestTransition(defects, projectId, defectId, action, defectRetests, retestId)
      const candidate = next.items.find(item => item.id === defectId && item.projectId === projectId)!
      const saved = await saveDefectApi(candidate, false)
      setDefects(current => ({ ...current, items: current.items.map(item => item.projectId === projectId && item.id === defectId ? saved : item) }))
      return null
    } catch (error) { return apiFailure(error) }
  }
  async function saveChecklistRemote(item: Checklist) {
    try {
      const creating = !checklists.some(value => value.id === item.id && value.projectId === projectId)
      if (item.projectId !== projectId || item.areaId && !projectAreas.some(area => area.id === item.areaId && area.projectId === projectId)) throw new Error('Checklist або Area належить іншому проєкту.')
      const saved = await saveChecklistApi({ ...item, projectId }, creating)
      setChecklists(current => creating ? [...current, saved] : current.map(value => value.id === saved.id && value.projectId === projectId ? saved : value))
      return saved
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function importChecklists(items: Checklist[]) {
    const failures: string[] = []
    for (const [index, item] of items.entries()) {
      try { await saveChecklistRemote(item) }
      catch (error) { failures.push(`Row ${index + 1}: ${apiFailure(error)}`) }
    }
    if (failures.length) throw new Error(`Imported ${items.length - failures.length} of ${items.length}. ${failures.join(' ')}`)
  }
  async function createChecklistRunRemote(checklistId: string) {
    try {
      const saved = await createChecklistRunApi(projectId, checklistId)
      const items = saved.items.length ? saved.items : (await loadChecklistRunItems(projectId)).filter(item => item.runId === saved.id)
      const run = { ...saved, items }
      setChecklistRuns(current => [...current, run])
      return run
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function saveChecklistRunItemRemote(runId: string, item: ChecklistRun['items'][number]) {
    try { const saved = await saveChecklistRunItemApi(projectId, item); setChecklistRuns(current => current.map(run => run.projectId === projectId && run.id === runId ? { ...run, items: run.items.map(value => value.id === saved.id ? saved : value) } : run)) }
    catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function completeChecklistRunRemote(runId: string) {
    try { const saved = await updateChecklistRunApi(projectId, runId, 'Completed'); setChecklistRuns(current => current.map(run => run.projectId === projectId && run.id === runId ? { ...saved, items: saved.items.length ? saved.items : run.items } : run)) }
    catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function saveSmokeSuiteRemote(input: import('@/lib/smoke').SmokeSuiteInput) {
    try {
      const existing = smoke.suites.find(item => item.id === input.id && item.projectId === projectId)
      const validated = saveSmokeSuite(smoke, projectId, input, testCasesByProject[projectId]?.items ?? [])
      const candidate = validated.suites.find(item => item.id === input.id && item.projectId === projectId)!
      const saved = await saveSmokeSuiteApi(candidate, !existing)
      await saveSmokeSuiteLinksApi(projectId, saved.id, [...new Set(input.testCaseIds)])
      await replaceSmokePrerequisitesApi(projectId, saved.id, input.prerequisites)
      const [links, prerequisites] = await Promise.all([loadSmokeSuiteLinks(projectId), loadSmokePrerequisites(projectId)])
      setSmoke(current => ({ ...current, suites: existing ? current.suites.map(item => item.projectId === projectId && item.id === saved.id ? saved : item) : [...current.suites, saved], links: [...current.links.filter(item => item.projectId !== projectId), ...links], prerequisites: [...current.prerequisites.filter(item => item.projectId !== projectId), ...prerequisites] }))
      return saved
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function deleteSmokeSuiteRemote(id: string) {
    try {
      if (smoke.runs.some(item => item.projectId === projectId && item.suiteId === id)) throw new Error('Не можна видалити Suite, що має історію запусків.')
      await deleteSmokeSuiteApi(projectId, id)
      setSmoke(current => ({ ...current, suites: current.suites.filter(item => item.projectId !== projectId || item.id !== id), links: current.links.filter(item => item.projectId !== projectId || item.suiteId !== id), prerequisites: current.prerequisites.filter(item => item.projectId !== projectId || item.suiteId !== id) }))
    }
    catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function createSmokeRunRemote(suiteId: string, input: import('@/lib/smoke').SmokeRunInput) {
    try {
      if (!smoke.suites.some(item => item.id === suiteId && item.projectId === projectId)) throw new Error('Smoke Suite поточного проєкту не знайдено.')
      const created = await createSmokeRunApi(projectId, suiteId, input)
      const [executions, prerequisites] = await Promise.all([created.executions.length ? Promise.resolve(created.executions) : loadSmokeExecutions(projectId), created.prerequisites.length ? Promise.resolve(created.prerequisites) : loadSmokeRunPrerequisites(projectId)])
      setSmoke(current => ({ ...current, runs: [...current.runs, created.run], executions: created.executions.length ? [...current.executions, ...executions] : [...current.executions.filter(item => item.projectId !== projectId), ...executions], runPrerequisites: created.prerequisites.length ? [...current.runPrerequisites, ...prerequisites] : [...current.runPrerequisites.filter(item => item.projectId !== projectId), ...prerequisites] }))
      return created.run
    } catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function updateSmokeRunStatusRemote(runId: string, status: import('@/types').SmokeRun['status']) {
    try { const saved = await updateSmokeRunApi(projectId, runId, status); setSmoke(current => ({ ...current, runs: current.runs.map(item => item.projectId === projectId && item.id === runId ? saved : item) })) }
    catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function saveSmokeExecutionRemote(id: string, input: import('@/lib/smoke').SmokeExecutionInput) {
    try { const saved = await saveSmokeExecutionApi(projectId, id, input); setSmoke(current => ({ ...current, executions: current.executions.map(item => item.projectId === projectId && item.id === id ? saved : item) })); return saved }
    catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }
  async function saveSmokePrerequisiteRemote(item: import('@/types').SmokeRunPrerequisite) {
    try { const saved = await saveSmokeRunPrerequisiteApi(projectId, item); setSmoke(current => ({ ...current, runPrerequisites: current.runPrerequisites.map(value => value.projectId === projectId && value.id === item.id ? saved : value) })) }
    catch (error) { throw new Error(apiFailure(error), { cause: error }) }
  }


  return (
    <DefectContext.Provider value={{ state: defects, sources: defectSources, create: createDefectFromSource, view: openDefect, viewSource: viewDefectSource, link: attachSourceDefect }}><EvidenceContext.Provider value={{ items: evidenceItems, owners: evidenceOwners, urls: evidenceUrls, userId: currentUser.id, upload: uploadEvidenceRemote, addLink: createEvidenceLinkRemote, remove: removeEvidenceRemote, replace: (owner, update) => {
      replaceEvidence(evidenceItems, owner, update(ownerEvidence(evidenceItems, owner, evidenceOwners)), evidenceOwners)
      setEvidenceItems(current => replaceEvidence(current, owner, update(ownerEvidence(current, owner, evidenceOwners)), evidenceOwners))
    } }}><AccountBarSlotContext.Provider value={accountBackSlot}><div className="app-shell">
      <AppSidebar
        projects={availableProjects}
        project={project}
        page={page}
        onProjectChange={changeProject}
        onAddProject={() => setCreatingProject(true)}
        onNavigate={nextPage => { setFollowupTarget(current => ({ key: current.key + 1 })); setSuiteTarget(current => ({ key: current.key + 1 })); setDefectTarget(current => ({ key: current.key + 1 })); setExecutionTarget(current => ({ key: current.key + 1 })); setPage(nextPage) }}
      />
      <div className="app-content">
        <div className="account-bar">
          <div className="account-back-slot" ref={setAccountBackSlot}>
          </div>
          <div className="account-page-context" aria-label={`Current page: ${navigationLabels[page].label} / ${navigationLabels[page].sublabel}`}>
            <span className="account-page-title">
              <span>{navigationLabels[page].label}</span>
              <span lang="uk">{navigationLabels[page].sublabel}</span>
            </span>
          </div>
          {project && <span className="account-project-name">Project: {project.name}</span>}
          <span>{currentUser.name}</span><Button variant="ghost" size="sm" disabled={logoutPending} onClick={() => void logout()}>{logoutPending ? 'Зачекайте…' : 'Вийти'}</Button>
          {logoutError && <p role="alert" className="auth-error">{logoutError}</p>}
        </div>
        {backendError && <p role="alert" className="auth-error api-status">{backendError}</p>}
        {projectDataLoading && project && <p role="status" className="muted api-status">Завантаження даних проєкту…</p>}
        {projectsLoading || projectDataLoading && project ? (
          <main className="smoke-app"><p role="status" className="muted">{projectsLoading ? 'Завантаження проєктів…' : 'Завантаження даних проєкту…'}</p></main>
        ) : page === 'Settings' && project ? (
          <ProjectSettingsPage key={project.id} project={project} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} data={projectSetup} onSetupSave={saveProjectSetup} onSetupDelete={deleteProjectSetup} onAreaSave={saveArea} onAreaRemove={removeArea} onTypeSave={saveType} onTypeRemove={removeType} onDeleteProject={() => { setDeletingProjectError(''); setDeletingProject(project) }} />
        ) : page === 'Smoke' && project ? (
          <SmokePage initialExecutionId={followupTarget.source?.type === "smokeExecution" ? followupTarget.source.id : undefined} setup={projectSetup} key={project.id + followupTarget.key} projectId={project.id} data={smoke} cases={testCasesByProject[project.id]?.items ?? []} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} userId={currentUser.id} onSuiteSave={saveSmokeSuiteRemote} onSuiteDelete={deleteSmokeSuiteRemote} onRunCreate={createSmokeRunRemote} onRunStatus={updateSmokeRunStatusRemote} onExecutionSave={saveSmokeExecutionRemote} onPrerequisiteSave={saveSmokePrerequisiteRemote} />
        ) : page === 'Test Suites' && project ? (
          <TestSuitesPage key={`${project.id}-${suiteTarget.key}`} initialId={suiteTarget.id} projectId={project.id} data={testSuites} cases={testCasesByProject[project.id]?.items ?? []} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} runs={testRunData} onCreateRun={createRunFromSuite} onOpenRun={openSuiteRun} onDelete={removeTestSuite} onSave={saveTestSuiteRemote} />
        ) : page === 'Coverage' && project ? (
          <CoveragePage key={project.id} projectId={project.id} requirements={requirementsByProject[project.id]?.items ?? []} cases={testCasesByProject[project.id]?.items ?? []} links={requirementLinks} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} executions={testRunData.executions} onLinksChange={changeCoverage} />
        ) : page === 'Defects' && project ? (
          <DefectsPage retests={defectRetests} cases={Object.values(testCasesByProject).flatMap(state => state.items)} types={testCasesByProject[project.id]?.types ?? []} onRetest={createRetestRemote} onRetestTransition={transitionRetestRemote} setup={projectSetup} key={`${project.id}-${defectTarget.key}`} projectId={project.id} items={defects.items} areas={projectAreas} runs={testRunData} initialId={defectTarget.id} sourceRef={defectTarget.source} onSave={saveDefectRemote} />
        ) : page === 'Test Runs' && project ? (
          <TestRunsPage setup={projectSetup} suites={testSuites} onViewSuite={openTestSuite} initialRunId={executionTarget.runId} initialCreateSuiteId={executionTarget.sourceSuiteId} key={`${project.id}-${executionTarget.key}`} initialExecutionId={executionTarget.id} defects={defects} onCreateDefect={id => createDefectFromSource({ type: "testExecution", id })} onViewDefect={openDefect} onLinkDefect={(id, defectId) => attachSourceDefect({ type: "testExecution", id }, defectId)} projectId={project.id} userId={currentUser.id} data={testRunData} onCreateRun={createTestRunRemote} onRunStatus={updateTestRunStatus} onExecutionSave={saveTestExecutionRemote} cases={testCasesByProject[project.id]?.items ?? []} plans={testPlans} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} />
        ) : page === 'Test Plan' && project ? (
          <TestPlanPage key={project.id} projectId={project.id} plans={testPlans} onSave={savePlan} onDelete={removePlan} />
        ) : page === 'Checklists' && project ? (
          <ChecklistsPage key={project.id} projectId={project.id} items={checklists} runs={checklistRuns} areas={projectAreas} onAreaSave={saveArea} onAreaRemove={removeArea} onSave={saveChecklistRemote} onImport={importChecklists} onRunCreate={createChecklistRunRemote} onRunItemSave={saveChecklistRunItemRemote} onRunComplete={completeChecklistRunRemote} />
        ) : page === 'Test Cases' && project ? (
          <TestCasesPage key={project.id} projectId={project.id} areaInUse={areaInUse} data={{ ...(testCasesByProject[project.id] ?? emptyTestCasesProject()), areas: projectAreas.filter(area => area.projectId === project.id) }} requirements={requirementView().items} onRequirementsChange={(id, ids) => changeCoverage('testCase', id, ids)} onChange={changeTestCases} onSaveItem={saveTestCaseRemote} onDeleteItem={deleteTestCaseRemote} onImportItems={importTestCases} onAreaSave={saveArea} onAreaRemove={removeArea} onTypeSave={saveType} onTypeRemove={removeType} />
        ) : page === 'Requirements' && project ? (
          <RequirementsPage key={project.id} projectId={project.id} areaInUse={areaInUse} data={requirementView()} types={testCasesByProject[project.id]?.types ?? []} testCases={testCasesByProject[project.id]?.items ?? []} onChange={changeRequirements} onSaveItem={saveRequirementRemote} onDeleteItem={deleteRequirementRemote} onImportItems={importRequirements} onTestCasesChange={(id, ids) => changeCoverage('requirement', id, ids)} onAreaSave={saveArea} onAreaRemove={removeArea} />
        ) : page === 'Audit' && project ? (
          <AuditPage initialFindingId={followupTarget.source?.type === "auditFinding" ? followupTarget.source.id : undefined} key={project.id + followupTarget.key} projectId={project.id} data={auditData}
            areaInUse={areaInUse} auditAreas={projectAreas} auditTypes={auditTypes} onAreasChange={setProjectAreas} onTypesChange={setAuditTypes} onAreaSave={saveArea} onAreaRemove={removeArea}
            onSaveAudit={draft => { try { setAuditData(saveAudit(auditData, project.id, draft, auditTypes, currentUser.id)); return null } catch (error) { return error instanceof Error ? error.message : 'Не вдалося зберегти Audit.' } }}
            onTransition={(id, action) => { try { setAuditData(transitionAudit(auditData, project.id, id, action, projectAreas, auditTypes)); return null } catch (error) { return error instanceof Error ? error.message : 'Не вдалося змінити статус.' } }}
            onSaveCheck={draft => { try { setAuditData(saveAuditCheck(auditData, project.id, draft.auditId, draft)); return null } catch (error) { return error instanceof Error ? error.message : 'Не вдалося зберегти перевірку.' } }}
            onDeleteFinding={(auditId, id) => {
              try {
                const next = removeAuditFinding(auditData, project.id, auditId, id)
                setAuditData(next)
                setEvidenceItems(current => current.filter(item => item.projectId !== project.id || item.ownerType !== 'auditFinding' || item.ownerId !== id))
                return null
              } catch (error) { return error instanceof Error ? error.message : 'Не вдалося видалити зауваження.' }
            }}
            onSaveItem={(item, attachments) => {
              try {
                const next = saveAuditFinding(auditData, project.id, item.auditId, item, projectAreas, auditTypes, currentUser.id)
                const owners = { ...evidenceOwners, auditFindings: next.findings }
                const evidence = replaceEvidence(evidenceItems, { projectId: project.id, ownerType: 'auditFinding', ownerId: item.id }, attachments, owners)
                setAuditData(next); setEvidenceItems(evidence); return null
              } catch (error) { return error instanceof Error ? error.message : 'Не вдалося зберегти зауваження.' }
            }}
          />
        ) : (
          <main className="smoke-app">
            <header className="page-heading"><h1>{page}</h1></header>
            <p className="muted">
              {page === 'Smoke' || page === 'Audit' || page === 'Test Cases' || page === 'Requirements' || page === 'Test Plan' || page === 'Checklists' || page === 'Test Runs' || page === 'Defects' || page === 'Coverage' || page === 'Test Suites' || page === 'Settings'
                ? 'У поточного користувача поки немає проєктів.'
                : 'Розділ поки не заповнений.'}
            </p>
          </main>
        )}
      </div>
      {creatingProject && (
        <ProjectCreateDialog
          projects={projects}
          onSave={addProject}
          onClose={() => setCreatingProject(false)}
        />
      )}
      <Dialog open={Boolean(deletingProject)} onOpenChange={open => { if (!open && !deletingProjectPending) { setDeletingProject(null); setDeletingProjectError('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project “{deletingProject?.name}”?</DialogTitle>
            <DialogDescription>
              All project data will be permanently deleted, including requirements, test cases, runs, defects, audits, attachments and related records.
              <span className="project-delete-warning">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          {deletingProjectError && <p role="alert" className="form-error">{deletingProjectError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={deletingProjectPending} onClick={() => { setDeletingProject(null); setDeletingProjectError('') }}>Cancel</Button>
            <Button variant="destructive" disabled={deletingProjectPending} onClick={() => void deleteProject()}>{deletingProjectPending ? 'Deleting…' : 'Delete permanently'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div></AccountBarSlotContext.Provider></EvidenceContext.Provider></DefectContext.Provider>
  )
}

export default App
