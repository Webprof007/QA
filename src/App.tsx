import { DefectContext } from '@/components/defects/defectContext'
import type { DefectSourceRef } from '@/types'
import { saveRetest, retestTransition } from '@/lib/defectRetests'
import type { DefectRetest } from '@/types'
import { ProjectSettingsPage } from '@/pages/ProjectSettingsPage'
import { createProjectSetupMockData } from '@/data/projectSetupMockData'
import { TestSuitesPage } from '@/pages/TestSuitesPage'
import { createTestSuitesMockData } from '@/data/testSuitesMockData'
import { saveTestSuite, deleteTestSuite } from '@/lib/testSuites'
import { createSmokeMockData } from '@/data/smokeMockData'
import { saveChecklistRun } from '@/lib/checklists'
import { CoveragePage } from '@/pages/CoveragePage'
import { requirementsWithLinks, replaceCoverageLinks, validCoverageLinks } from '@/lib/coverage'
import { initialRequirementTestCaseLinks } from '@/data/requirementsMockData'
import type { RequirementsViewState } from '@/types'
import { DefectsPage } from '@/pages/DefectsPage'
import { createDefectsMockData } from '@/data/defectsMockData'
import { saveDefect, linkSourceDefect, resolveDefectSource } from '@/lib/defects'
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
import { ownerEvidence, replaceEvidence, commitRetestEvidence, type EvidenceOwners } from '@/lib/evidence'
import type { EvidenceItem } from '@/types'
import { useCallback, useEffect, useState, type SetStateAction } from 'react'
import { AppSidebar } from '@/components/AppSidebar'
import { ProjectCreateDialog } from '@/components/ProjectCreateDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { SmokePage } from '@/pages/SmokePage'
import { AuditPage } from '@/pages/AuditPage'
import { PasswordRecoveryPage } from '@/pages/PasswordRecoveryPage'
import { AuthPage } from '@/pages/AuthPage'
import { saveAudit, transitionAudit, saveAuditCheck, saveAuditFinding, removeAuditFinding } from '@/lib/audit'
import { initialAudits, initialAuditTypes } from '@/data/auditMockData'
import type { AuditState, Checklist, ChecklistRun, TestPlan, TestRunsState, TestCasesProjectState, Page, Project } from '@/types'
import './AppShell.css'
import { useAuth, type AuthUser } from '@/hooks/useAuth'
import { CheckEmailPage } from '@/pages/CheckEmailPage'
import { ApiError, errorMessage } from '@/lib/api'
import { createProject as createProjectApi, deleteArea as deleteAreaApi, deleteProject as deleteProjectApi, deleteRequirement as deleteRequirementApi, deleteTestCaseType, deleteTestPlan as deleteTestPlanApi, loadAreas, loadProjects, loadRequirements, loadTestCaseTypes, loadTestPlans, saveArea as saveAreaApi, saveRequirement as saveRequirementApi, saveTestCaseType, saveTestPlan as saveTestPlanApi } from '@/lib/qaApi'

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
  const [projectId, setProjectId] = useState('')
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectDataLoading, setProjectDataLoading] = useState(false)
  const [backendError, setBackendError] = useState('')
  const [page, setPage] = useState<Page>('Smoke')
  const [projectSetup, setProjectSetup] = useState(createProjectSetupMockData)
  const [seed] = useState(createProjectAreaData)
  const [testSuites, setTestSuites] = useState(() => createTestSuitesMockData(Object.values(seed.testCases).flatMap(data => data.items)))
  const [suiteTarget, setSuiteTarget] = useState<{ id?: string; key: number }>({ key: 0 })
  const [smoke, setSmoke] = useState(() => createSmokeMockData(Object.values(seed.testCases).flatMap(data => data.items)))
  const [projectAreas, setProjectAreas] = useState<import('@/types').ProjectArea[]>([])
  const [defectRetests, setDefectRetests] = useState<DefectRetest[]>([])
  const [defects, setDefects] = useState(createDefectsMockData)
  const [defectTarget, setDefectTarget] = useState<{ id?: string; source?: DefectSourceRef; key: number }>({ key: 0 })
  const [followupTarget, setFollowupTarget] = useState<{ source?: DefectSourceRef; key: number }>({ key: 0 })
  const [executionTarget, setExecutionTarget] = useState<{ id?: string; runId?: string; sourceSuiteId?: string; key: number }>({ key: 0 })
  const [testRunData, setTestRunData] = useState<TestRunsState>({ runs: [], executions: [] })
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [checklistRuns, setChecklistRuns] = useState<ChecklistRun[]>([])
  const [auditTypes, setAuditTypes] = useState(initialAuditTypes)
  const [requirementLinks, setRequirementLinks] = useState(initialRequirementTestCaseLinks)
  const [requirementsByProject, setRequirementsByProject] = useState<Record<string, { items: import('@/types').Requirement[] }>>({})
  const [testCasesByProject, setTestCasesByProject] = useState(seed.testCases)
  const [auditData, setAuditData] = useState<AuditState>(() => ({ audits: structuredClone(initialAudits), checks: [], findings: Object.values(seed.audit).flat() }))
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([])
  const [evidenceUrls] = useState(createEvidenceUrls)
  const defectSources = { testRuns: testRunData, smoke, audits: auditData }
  const evidenceOwners: EvidenceOwners = { testRuns: testRunData, smoke, defects: defects.items, retests: defectRetests, audits: auditData.audits, auditFindings: auditData.findings }
  useEffect(() => evidenceUrls.retain(evidenceItems.map(item => item.url)), [evidenceItems, evidenceUrls])
  const availableProjects = projects
  const project = availableProjects.find(item => item.id === projectId)

  const apiFailure = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized()
    return errorMessage(error)
  }, [onUnauthorized])

  useEffect(() => {
    const controller = new AbortController()
    void loadProjects(controller.signal).then(items => {
      if (!controller.signal.aborted) {
        setProjects(items)
        setBackendError('')
        setProjectDataLoading(items.length > 0)
        setProjectId(current => items.some(item => item.id === current) ? current : items[0]?.id ?? '')
      }
    }).catch(error => { if (!controller.signal.aborted) setBackendError(apiFailure(error)) })
      .finally(() => { if (!controller.signal.aborted) setProjectsLoading(false) })
    return () => controller.abort()
  }, [apiFailure])

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController(), selectedProjectId = projectId
    void Promise.allSettled([loadAreas(selectedProjectId, controller.signal), loadRequirements(selectedProjectId, controller.signal), loadTestPlans(selectedProjectId, controller.signal), loadTestCaseTypes(selectedProjectId, controller.signal)])
      .then(([areas, requirements, plans, types]) => {
        if (controller.signal.aborted) return
        if (areas.status === 'fulfilled') setProjectAreas(current => [...current.filter(item => item.projectId !== selectedProjectId), ...areas.value])
        if (requirements.status === 'fulfilled') setRequirementsByProject(current => ({ ...current, [selectedProjectId]: { items: requirements.value } }))
        if (plans.status === 'fulfilled') setTestPlans(current => [...current.filter(item => item.projectId !== selectedProjectId), ...plans.value])
        if (types.status === 'fulfilled') setTestCasesByProject(current => ({ ...current, [selectedProjectId]: { items: current[selectedProjectId]?.items ?? [], types: types.value } }))
        const failure = [areas, requirements, plans, types].find(result => result.status === 'rejected')
        setBackendError(failure?.status === 'rejected' ? apiFailure(failure.reason) : '')
      })
      .finally(() => { if (!controller.signal.aborted) setProjectDataLoading(false) })
    return () => controller.abort()
  }, [projectId, apiFailure])

  function changeProject(id: string) {
    if (availableProjects.some(item => item.id === id)) { setProjectDataLoading(true); setBackendError(''); setProjectId(id); setFollowupTarget({ key: 0 }); setSuiteTarget({ key: 0 }); setDefectTarget({ key: 0 }); setExecutionTarget({ key: 0 }) }
  }

  async function addProject(name: string) {
    try {
      const created = await createProjectApi(name)
      setProjects(current => [...current, created]); setProjectDataLoading(true); setProjectId(created.id); setPage('Smoke'); setCreatingProject(false); setBackendError('')
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
    if (!deletingProject) return
    const id = deletingProject.id
    try { await deleteProjectApi(id) } catch (error) { setBackendError(apiFailure(error)); return }
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
    setDeletingProject(null)
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
    const links = next.items.flatMap(item => item.testCaseIds.map(testCaseId => ({ projectId: item.projectId, requirementId: item.id, testCaseId })))
    setRequirementLinks(current => [...current.filter(link => link.projectId !== projectId), ...validCoverageLinks(projectId, links, items, testCasesByProject[projectId]?.items ?? [])])
  }
  function changeCoverage(direction: 'requirement' | 'testCase', id: string, selectedIds: string[]) {
    setRequirementLinks(current => replaceCoverageLinks(current, projectId, direction, id, selectedIds, requirementsByProject[projectId]?.items ?? [], testCasesByProject[projectId]?.items ?? []))
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
  async function saveRequirementRemote(item: import('@/types').RequirementWithTestCases, creating: boolean) {
    try {
      const saved = await saveRequirementApi(item, creating)
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
  function attachSourceDefect(source: DefectSourceRef, defectId: string) {
    try { setDefects(linkSourceDefect(defects, projectId, source, defectId, defectSources)); return null }
    catch (error) { return error instanceof Error ? error.message : 'Не вдалося пов’язати дефект.' }
  }

  function saveRun(run: ChecklistRun) {
    setChecklistRuns(current => saveChecklistRun(current, projectId, run, checklists))
  }


  return (
    <DefectContext.Provider value={{ state: defects, sources: defectSources, create: createDefectFromSource, view: openDefect, viewSource: viewDefectSource, link: attachSourceDefect }}><EvidenceContext.Provider value={{ items: evidenceItems, owners: evidenceOwners, urls: evidenceUrls, userId: currentUser.id, replace: (owner, update) => {
      replaceEvidence(evidenceItems, owner, update(ownerEvidence(evidenceItems, owner, evidenceOwners)), evidenceOwners)
      setEvidenceItems(current => replaceEvidence(current, owner, update(ownerEvidence(current, owner, evidenceOwners)), evidenceOwners))
    } }}><AccountBarSlotContext.Provider value={accountBackSlot}><div className="app-shell">
      <AppSidebar
        projects={availableProjects}
        project={project}
        page={page}
        onProjectChange={changeProject}
        onAddProject={() => setCreatingProject(true)}
        onDeleteProject={() => setDeletingProject(project ?? null)}
        onNavigate={nextPage => { setFollowupTarget(current => ({ key: current.key + 1 })); setSuiteTarget(current => ({ key: current.key + 1 })); setDefectTarget(current => ({ key: current.key + 1 })); setExecutionTarget(current => ({ key: current.key + 1 })); setPage(nextPage) }}
      />
      <div className="app-content">
        <div className="account-bar">
          <div className="account-back-slot" ref={setAccountBackSlot}>
          </div>
          <span>{currentUser.name}</span><Button variant="ghost" size="sm" disabled={logoutPending} onClick={() => void logout()}>{logoutPending ? 'Зачекайте…' : 'Вийти'}</Button>
          {logoutError && <p role="alert" className="auth-error">{logoutError}</p>}
        </div>
        {backendError && <p role="alert" className="auth-error api-status">{backendError}</p>}
        {projectDataLoading && project && <p role="status" className="muted api-status">Завантаження даних проєкту…</p>}
        {projectsLoading ? (
          <main className="smoke-app"><p role="status" className="muted">Завантаження проєктів…</p></main>
        ) : page === 'Settings' && project ? (
          <ProjectSettingsPage key={project.id} projectId={project.id} data={projectSetup} onChange={setProjectSetup} />
        ) : page === 'Smoke' && project ? (
          <SmokePage initialExecutionId={followupTarget.source?.type === "smokeExecution" ? followupTarget.source.id : undefined} setup={projectSetup} key={project.id + followupTarget.key} projectId={project.id} data={smoke} onChange={setSmoke} cases={testCasesByProject[project.id]?.items ?? []} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} userId={currentUser.id} />
        ) : page === 'Test Suites' && project ? (
          <TestSuitesPage key={`${project.id}-${suiteTarget.key}`} initialId={suiteTarget.id} projectId={project.id} data={testSuites} cases={testCasesByProject[project.id]?.items ?? []} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} runs={testRunData} onCreateRun={createRunFromSuite} onOpenRun={openSuiteRun} onDelete={id => setTestSuites(current => deleteTestSuite(current, project.id, id))} onSave={input => { try { setTestSuites(saveTestSuite(testSuites, project.id, input, testCasesByProject[project.id]?.items ?? [])); return null } catch (error) { return error instanceof Error ? error.message : 'Не вдалося зберегти Suite.' } }} />
        ) : page === 'Coverage' && project ? (
          <CoveragePage key={project.id} projectId={project.id} requirements={requirementsByProject[project.id]?.items ?? []} cases={testCasesByProject[project.id]?.items ?? []} links={requirementLinks} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} executions={testRunData.executions} onLinksChange={changeCoverage} />
        ) : page === 'Defects' && project ? (
          <DefectsPage retests={defectRetests} cases={Object.values(testCasesByProject).flatMap(state => state.items)} types={testCasesByProject[project.id]?.types ?? []} onRetest={(id, input, attachments) => {
            try { const next = saveRetest(defectRetests, project.id, id, input, defects.items, Object.values(testCasesByProject).flatMap(state => state.items), testRunData, projectSetup, projectAreas, testCasesByProject[project.id]?.types ?? [], currentUser.id, smoke)
              const owner = { projectId: project.id, ownerType: 'defectRetest' as const, ownerId: next[next.length - 1].id }
              const evidence = commitRetestEvidence(evidenceItems, owner, attachments, evidenceOwners, { ...evidenceOwners, retests: next })
              setDefectRetests(next); setEvidenceItems(evidence); return null }
            catch (error) { return error instanceof Error ? error.message : 'Не вдалося зберегти Retest.' }
          }} onRetestTransition={(id, action, retestId) => {
            try { setDefects(retestTransition(defects, project.id, id, action, defectRetests, retestId)); return null }
            catch (error) { return error instanceof Error ? error.message : 'Не вдалося змінити статус.' }
          }} setup={projectSetup} key={`${project.id}-${defectTarget.key}`} projectId={project.id} items={defects.items} areas={projectAreas} runs={testRunData} initialId={defectTarget.id} sourceRef={defectTarget.source} onSave={draft => {
            try {
              setDefects(saveDefect(defects, draft, project.id, currentUser.id, testRunData, projectAreas, projectSetup, defectSources))
              if (draft.source && !defects.items.some(item => item.id === draft.id)) viewDefectSource(draft.source)
              return null
            } catch (error) { return error instanceof Error ? error.message : 'Не вдалося зберегти дефект.' }
          }} />
        ) : page === 'Test Runs' && project ? (
          <TestRunsPage setup={projectSetup} suites={testSuites} onViewSuite={openTestSuite} initialRunId={executionTarget.runId} initialCreateSuiteId={executionTarget.sourceSuiteId} key={`${project.id}-${executionTarget.key}`} initialExecutionId={executionTarget.id} defects={defects} onCreateDefect={id => createDefectFromSource({ type: "testExecution", id })} onViewDefect={openDefect} onLinkDefect={(id, defectId) => attachSourceDefect({ type: "testExecution", id }, defectId)} projectId={project.id} userId={currentUser.id} data={testRunData} onChange={setTestRunData} cases={testCasesByProject[project.id]?.items ?? []} plans={testPlans} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} />
        ) : page === 'Test Plan' && project ? (
          <TestPlanPage key={project.id} projectId={project.id} plans={testPlans} onSave={savePlan} onDelete={removePlan} />
        ) : page === 'Checklists' && project ? (
          <ChecklistsPage key={project.id} projectId={project.id} items={checklists} runs={checklistRuns} areas={projectAreas} onAreaSave={saveArea} onAreaRemove={removeArea} onRun={saveRun} onSave={item => {
            if (item.projectId === project.id) setChecklists(current => current.some(value => value.id === item.id && value.projectId === project.id) ? current.map(value => value.id === item.id && value.projectId === project.id ? item : value) : [...current, item])
          }} />
        ) : page === 'Test Cases' && project ? (
          <TestCasesPage key={project.id} projectId={project.id} areaInUse={areaInUse} data={{ ...(testCasesByProject[project.id] ?? emptyTestCasesProject()), areas: projectAreas.filter(area => area.projectId === project.id) }} requirements={requirementView().items} onRequirementsChange={(id, ids) => changeCoverage('testCase', id, ids)} onChange={changeTestCases} onAreaSave={saveArea} onAreaRemove={removeArea} onTypeSave={saveType} onTypeRemove={removeType} />
        ) : page === 'Requirements' && project ? (
          <RequirementsPage key={project.id} projectId={project.id} areaInUse={areaInUse} data={requirementView()} types={testCasesByProject[project.id]?.types ?? []} testCases={testCasesByProject[project.id]?.items ?? []} onChange={changeRequirements} onSaveItem={saveRequirementRemote} onDeleteItem={deleteRequirementRemote} onImportItems={importRequirements} onAreaSave={saveArea} onAreaRemove={removeArea} />
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
      <Dialog open={Boolean(deletingProject)} onOpenChange={open => { if (!open) setDeletingProject(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити проєкт «{deletingProject?.name}»?</DialogTitle>
            <DialogDescription>
              Буде видалено всі тести, пункти підготовки, результати, зауваження Audit і чернетки цього проєкту для всіх користувачів. Цю дію неможливо скасувати.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProject(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={deleteProject}>Видалити проєкт</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div></AccountBarSlotContext.Provider></EvidenceContext.Provider></DefectContext.Provider>
  )
}

export default App
