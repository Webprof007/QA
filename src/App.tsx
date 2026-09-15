import { createSmokeMockData } from '@/data/smokeMockData'
import { saveChecklistRun } from '@/lib/checklists'
import { CoveragePage } from '@/pages/CoveragePage'
import { requirementsWithLinks, replaceCoverageLinks, validCoverageLinks } from '@/lib/coverage'
import { initialRequirementTestCaseLinks } from '@/data/requirementsMockData'
import type { RequirementsViewState } from '@/types'
import { DefectsPage } from '@/pages/DefectsPage'
import { createDefectsMockData } from '@/data/defectsMockData'
import { saveDefect, linkDefect } from '@/lib/defects'
import { AccountBarSlotContext } from '@/components/accountBarContext'
import { TestRunsPage } from '@/pages/TestRunsPage'
import { createProjectAreaData } from '@/data/projectAreaMockData'
import { TestPlanPage } from '@/pages/TestPlanPage'
import { ChecklistsPage } from '@/pages/ChecklistsPage'
import { RequirementsPage } from '@/pages/RequirementsPage'
import { TestCasesPage } from '@/pages/TestCasesPage'
import { emptyTestCasesProject } from '@/data/testCasesMockData'
import { createAuditEvidenceUrls } from '@/lib/auditEvidenceUrls'
import { useEffect, useState, type SetStateAction } from 'react'
import { AppSidebar } from '@/components/AppSidebar'
import { ProjectCreateDialog } from '@/components/ProjectCreateDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { projects as initialProjects } from '@/data/mockData'
import { SmokePage } from '@/pages/SmokePage'
import { AuditPage } from '@/pages/AuditPage'
import { PasswordRecoveryPage } from '@/pages/PasswordRecoveryPage'
import { AuthPage } from '@/pages/AuthPage'
import { initialAuditTypes } from '@/data/auditMockData'
import type { AuditItem, Checklist, ChecklistRun, TestPlan, TestRunsState, TestCasesProjectState, Page, Project } from '@/types'
import './AppShell.css'
import { useAuth, type AuthUser } from '@/hooks/useAuth'
import { CheckEmailPage } from '@/pages/CheckEmailPage'
import { errorMessage } from '@/lib/api'

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
  return <QAApp key={auth.user.id} currentUser={auth.user} onLogout={auth.logout} />
}

function QAApp({ currentUser, onLogout }: { currentUser: AuthUser; onLogout: () => Promise<void> }) {
  // Project membership is still a frontend demo, independent of session authorization.
  const [projects, setProjects] = useState(() => initialProjects.map(project => ({ ...project, userIds: [currentUser.id] })))
  const [accountBackSlot, setAccountBackSlot] = useState<HTMLDivElement | null>(null)
  const [logoutPending, setLogoutPending] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [projectId, setProjectId] = useState(initialProjects[0].id)
  const [page, setPage] = useState<Page>('Smoke')
  const [seed] = useState(createProjectAreaData)
  const [smoke, setSmoke] = useState(() => createSmokeMockData(Object.values(seed.testCases).flatMap(data => data.items)))
  const [projectAreas, setProjectAreas] = useState(seed.areas)
  const [defects, setDefects] = useState(createDefectsMockData)
  const [defectTarget, setDefectTarget] = useState<{ id?: string; source?: string; key: number }>({ key: 0 })
  const [executionTarget, setExecutionTarget] = useState<{ id?: string; key: number }>({ key: 0 })
  const [testRunData, setTestRunData] = useState<TestRunsState>({ runs: [], executions: [] })
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [checklistRuns, setChecklistRuns] = useState<ChecklistRun[]>([])
  const [auditTypes, setAuditTypes] = useState(initialAuditTypes)
  const [requirementLinks, setRequirementLinks] = useState(initialRequirementTestCaseLinks)
  const [requirementsByProject, setRequirementsByProject] = useState(seed.requirements)
  const [testCasesByProject, setTestCasesByProject] = useState(seed.testCases)
  const [auditByProject, setAuditByProject] = useState(seed.audit)
  const [evidenceUrls] = useState(createAuditEvidenceUrls)
  useEffect(() => evidenceUrls.retain(Object.values(auditByProject).flatMap(items => items.flatMap(item => item.evidence.map(file => file.url)))), [auditByProject, evidenceUrls])
  const availableProjects = currentUser ? projects.filter(project => project.userIds.includes(currentUser.id)) : []
  const project = availableProjects.find(item => item.id === projectId)

  function changeProject(id: string) {
    if (availableProjects.some(item => item.id === id)) { setProjectId(id); setDefectTarget({ key: 0 }); setExecutionTarget({ key: 0 }) }
  }

  function addProject(name: string) {
    if (!currentUser) return
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      userIds: [currentUser.id],
    }
    setProjects(current => [...current, newProject])
    setRequirementsByProject(current => ({ ...current, [newProject.id]: { items: [] } }))
    setTestCasesByProject(current => ({ ...current, [newProject.id]: { items: [], types: [] } }))
    setProjectId(newProject.id)
    setAuditByProject(current => ({ ...current, [newProject.id]: [] }))
    setPage('Smoke')
    setCreatingProject(false)
  }

  async function logout() {
    if (logoutPending) return
    setLogoutPending(true); setLogoutError('')
    try { await onLogout() } catch (error) { setLogoutError(errorMessage(error)) }
    finally { setLogoutPending(false) }
  }

  function deleteProject() {
    if (!deletingProject) return
    const id = deletingProject.id
    setProjects(current => current.filter(item => item.id !== id))
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
    setAuditByProject(current => {
      const next = { ...current }
      delete next[id]
      return next
    })
    if (projectId === id) {
      setProjectId(availableProjects.find(item => item.id !== id)?.id ?? '')
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
      || (auditByProject[projectId] ?? []).some(item => item.areaId === id)
      || defects.items.some(item => item.projectId === projectId && item.areaId === id)
      || checklists.some(item => item.projectId === projectId && item.areaId === id)
  }
  function updateAreas(areas: typeof projectAreas) {
    setProjectAreas(current => [...current.filter(area => area.projectId !== projectId), ...areas.filter(area => area.projectId === projectId)])
  }
  function saveArea(name: string, id?: string) {
    const value = { id: id ?? crypto.randomUUID(), projectId, name }
    setProjectAreas(current => id ? current.map(area => area.id === id && area.projectId === projectId ? value : area) : [...current, value])
    return value.id
  }
  function removeArea(id: string) {
    if (areaInUse(id)) return 'Area використовується в цьому проєкті. Спочатку змініть пов’язані записи.'
    setProjectAreas(current => current.filter(area => area.id !== id || area.projectId !== projectId))
    return ''
  }
  function openExecution(id: string) {
    if (!testRunData.executions.some(item => item.id === id && item.projectId === projectId)) return
    setExecutionTarget(current => ({ id, key: current.key + 1 })); setPage('Test Runs')
  }
  function openDefect(id: string) {
    if (!defects.items.some(item => item.id === id && item.projectId === projectId)) return
    setDefectTarget(current => ({ id, key: current.key + 1 })); setPage('Defects')
  }
  function createDefectFrom(id: string) {
    if (!testRunData.executions.some(item => item.id === id && item.projectId === projectId && item.result === 'Fail')) return
    setDefectTarget(current => ({ source: id, key: current.key + 1 })); setPage('Defects')
  }
  function attachDefect(executionId: string, defectId: string) {
    try { setDefects(linkDefect(defects, projectId, executionId, defectId, testRunData.executions)); return null }
    catch { return 'Не вдалося пов’язати дефект поточного проєкту.' }
  }

  function saveRun(run: ChecklistRun) {
    setChecklistRuns(current => saveChecklistRun(current, projectId, run, checklists))
  }

  function changeAudit(action: SetStateAction<AuditItem[]>) {
    setAuditByProject(current => current[projectId] ? ({
      ...current,
      [projectId]: typeof action === 'function' ? action(current[projectId]) : action,
    }) : current)
  }

  return (
    <AccountBarSlotContext.Provider value={accountBackSlot}><div className="app-shell">
      <AppSidebar
        projects={availableProjects}
        project={project}
        page={page}
        onProjectChange={changeProject}
        onAddProject={() => setCreatingProject(true)}
        onDeleteProject={() => setDeletingProject(project ?? null)}
        onNavigate={nextPage => { setDefectTarget(current => ({ key: current.key + 1 })); setExecutionTarget(current => ({ key: current.key + 1 })); setPage(nextPage) }}
      />
      <div className="app-content">
        <div className="account-bar">
          <div className="account-back-slot" ref={setAccountBackSlot}>
          </div>
          <span>{currentUser.name}</span><Button variant="ghost" size="sm" disabled={logoutPending} onClick={() => void logout()}>{logoutPending ? 'Зачекайте…' : 'Вийти'}</Button>
          {logoutError && <p role="alert" className="auth-error">{logoutError}</p>}
        </div>
        {page === 'Smoke' && project ? (
          <SmokePage key={project.id} projectId={project.id} data={smoke} onChange={setSmoke} cases={testCasesByProject[project.id]?.items ?? []} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} userId={currentUser.id} />
        ) : page === 'Coverage' && project ? (
          <CoveragePage key={project.id} projectId={project.id} requirements={requirementsByProject[project.id]?.items ?? []} cases={testCasesByProject[project.id]?.items ?? []} links={requirementLinks} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} executions={testRunData.executions} onLinksChange={changeCoverage} />
        ) : page === 'Defects' && project ? (
          <DefectsPage key={`${project.id}-${defectTarget.key}`} projectId={project.id} items={defects.items} areas={projectAreas} runs={testRunData} initialId={defectTarget.id} sourceExecutionId={defectTarget.source} onExecution={openExecution} onSave={draft => {
            try {
              setDefects(saveDefect(defects, draft, project.id, currentUser.id, testRunData, projectAreas))
              if (draft.sourceExecutionId && !defects.items.some(item => item.id === draft.id)) openExecution(draft.sourceExecutionId)
              return null
            } catch (error) { return error instanceof Error ? error.message : 'Не вдалося зберегти дефект.' }
          }} />
        ) : page === 'Test Runs' && project ? (
          <TestRunsPage key={`${project.id}-${executionTarget.key}`} initialExecutionId={executionTarget.id} defects={defects} onCreateDefect={createDefectFrom} onViewDefect={openDefect} onLinkDefect={attachDefect} projectId={project.id} userId={currentUser.id} data={testRunData} onChange={setTestRunData} cases={testCasesByProject[project.id]?.items ?? []} plans={testPlans} areas={projectAreas} types={testCasesByProject[project.id]?.types ?? []} />
        ) : page === 'Test Plan' && project ? (
          <TestPlanPage key={project.id} projectId={project.id} plans={testPlans} onSave={plan => {
            if (plan.projectId === project.id) setTestPlans(current => current.some(item => item.id === plan.id && item.projectId === project.id)
              ? current.map(item => item.id === plan.id && item.projectId === project.id ? plan : item)
              : [...current, plan])
          }} />
        ) : page === 'Checklists' && project ? (
          <ChecklistsPage key={project.id} projectId={project.id} items={checklists} runs={checklistRuns} areas={projectAreas} onAreaSave={saveArea} onAreaRemove={removeArea} onRun={saveRun} onSave={item => {
            if (item.projectId === project.id) setChecklists(current => current.some(value => value.id === item.id) ? current.map(value => value.id === item.id ? item : value) : [...current, item])
          }} />
        ) : page === 'Test Cases' && project ? (
          <TestCasesPage key={project.id} projectId={project.id} areaInUse={areaInUse} data={{ ...(testCasesByProject[project.id] ?? emptyTestCasesProject()), areas: projectAreas.filter(area => area.projectId === project.id) }} requirements={requirementView().items} onRequirementsChange={(id, ids) => changeCoverage('testCase', id, ids)} onChange={changeTestCases} />
        ) : page === 'Requirements' && project ? (
          <RequirementsPage key={project.id} projectId={project.id} areaInUse={areaInUse} data={requirementView()} types={testCasesByProject[project.id]?.types ?? []} testCases={testCasesByProject[project.id]?.items ?? []} onChange={changeRequirements} />
        ) : page === 'Audit' && project ? (
          <AuditPage
            evidenceUrls={evidenceUrls}
            key={project.id}
            projectId={project.id}
            areaInUse={areaInUse} auditAreas={projectAreas} auditTypes={auditTypes} onAreasChange={setProjectAreas} onTypesChange={setAuditTypes}
            items={auditByProject[project.id]}
            onChange={changeAudit}
          />
        ) : (
          <main className="smoke-app">
            <header className="page-heading"><h1>{page}</h1></header>
            <p className="muted">
              {page === 'Smoke' || page === 'Audit' || page === 'Test Cases' || page === 'Requirements' || page === 'Test Plan' || page === 'Checklists' || page === 'Test Runs' || page === 'Defects' || page === 'Coverage'
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
    </div></AccountBarSlotContext.Provider>
  )
}

export default App
