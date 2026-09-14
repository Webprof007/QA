import { RequirementsPage } from '@/pages/RequirementsPage'
import { initialRequirementsByProject, emptyRequirementsProject } from '@/data/requirementsMockData'
import { TestCasesPage } from '@/pages/TestCasesPage'
import { initialTestCasesByProject, emptyTestCasesProject } from '@/data/testCasesMockData'
import { createAuditEvidenceUrls } from '@/lib/auditEvidenceUrls'
import { useEffect, useState, type SetStateAction } from 'react'
import { AppSidebar } from '@/components/AppSidebar'
import { ProjectCreateDialog } from '@/components/ProjectCreateDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { initialSmokeSuitesByProject, projects as initialProjects, users } from '@/data/mockData'
import { SmokePage } from '@/pages/SmokePage'
import { SmokeSuitesPage } from '@/pages/SmokeSuitesPage'
import { SmokeSuiteDialog } from '@/components/SmokeSuiteDialog'
import { AuditPage } from '@/pages/AuditPage'
import { AuthPage, type AuthInput } from '@/pages/AuthPage'
import { initialAuditAreas, initialAuditTypes, initialAuditByProject } from '@/data/auditMockData'
import type { AuditItem, TestCasesProjectState, Page, Project, SmokeSuite, SmokeSuiteState, User } from '@/types'
import './AppShell.css'

function App() {
  type Account = User & { password: string }
  const [accounts, setAccounts] = useState<Account[]>(() => users.map(user => ({
    ...user,
    password: 'password123',
  })))
  const [projects, setProjects] = useState(initialProjects)
  const [creatingProject, setCreatingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(users[0].id)
  const [projectId, setProjectId] = useState(initialProjects[0].id)
  const [page, setPage] = useState<Page>('Smoke')
  const [smokeSuitesByProject, setSmokeSuitesByProject] = useState(initialSmokeSuitesByProject)
  const [selectedSuiteId, setSelectedSuiteId] = useState('')
  const [suiteEditor, setSuiteEditor] = useState<SmokeSuite | null | undefined>(undefined)
  const [deletingSuite, setDeletingSuite] = useState<SmokeSuite | null>(null)
  const [auditAreas, setAuditAreas] = useState(initialAuditAreas)
  const [auditTypes, setAuditTypes] = useState(initialAuditTypes)
  const [requirementsByProject, setRequirementsByProject] = useState(initialRequirementsByProject)
  const [testCasesByProject, setTestCasesByProject] = useState(initialTestCasesByProject)
  const [auditByProject, setAuditByProject] = useState(initialAuditByProject)
  const [evidenceUrls] = useState(createAuditEvidenceUrls)
  useEffect(() => evidenceUrls.retain(Object.values(auditByProject).flatMap(items => items.flatMap(item => item.evidence.map(file => file.url)))), [auditByProject, evidenceUrls])
  const currentUser = accounts.find(user => user.id === currentUserId)
  const availableProjects = currentUser ? projects.filter(project => project.userIds.includes(currentUser.id)) : []
  const project = availableProjects.find(item => item.id === projectId)

  async function login(input: AuthInput): Promise<string | null> {
    const account = accounts.find(item => item.email === input.email.toLowerCase() && item.password === input.password)
    if (!account) return 'Неправильний email або пароль.'
    setCurrentUserId(account.id)
    setProjectId(projects.find(item => item.userIds.includes(account.id))?.id ?? '')
    setPage('Smoke')
    return null
  }

  async function register(input: AuthInput): Promise<string | null> {
    if (accounts.some(account => account.email === input.email.toLowerCase())) return 'Користувач із таким email уже зареєстрований.'
    const account: Account = { id: crypto.randomUUID(), name: input.name, email: input.email.toLowerCase(), password: input.password }
    setAccounts(current => [...current, account])
    setCurrentUserId(account.id)
    setProjectId('')
    setPage('Smoke')
    return null
  }

  function changeProject(id: string) {
    if (availableProjects.some(item => item.id === id)) { setProjectId(id); setSelectedSuiteId('') }
  }

  function changeSmoke(action: SetStateAction<SmokeSuiteState>) {
    setSmokeSuitesByProject(current => current[projectId] ? ({
      ...current,
      [projectId]: current[projectId].map(state => state.suite.id === selectedSuiteId ? (typeof action === 'function' ? action(state) : action) : state),
    }) : current)
  }

  function addProject(name: string) {
    if (!currentUser) return
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      userIds: [currentUser.id],
    }
    setProjects(current => [...current, newProject])
    setRequirementsByProject(current => ({ ...current, [newProject.id]: emptyRequirementsProject() }))
    setTestCasesByProject(current => ({ ...current, [newProject.id]: emptyTestCasesProject() }))
    setSmokeSuitesByProject(current => ({
      ...current,
      [newProject.id]: [],
    }))
    setProjectId(newProject.id)
    setSelectedSuiteId('')
    setAuditByProject(current => ({ ...current, [newProject.id]: [] }))
    setPage('Smoke')
    setCreatingProject(false)
  }

  function addSuite(name: string) {
    if (!project) return
    const suite: SmokeSuiteState = { suite: { id: crypto.randomUUID(), projectId: project.id, name, createdAt: new Date().toISOString().slice(0, 10) }, tests: [], preparation: [], drafts: {} }
    setSmokeSuitesByProject(current => ({ ...current, [project.id]: [...(current[project.id] ?? []), suite] }))
    setSuiteEditor(undefined)
  }
  function renameSuite(name: string) {
    if (!project || !suiteEditor) return
    setSmokeSuitesByProject(current => ({ ...current, [project.id]: current[project.id].map(state => state.suite.id === suiteEditor.id ? { ...state, suite: { ...state.suite, name } } : state) }))
    setSuiteEditor(undefined)
  }
  function removeSuite() {
    if (!project || !deletingSuite) return
    setSmokeSuitesByProject(current => ({ ...current, [project.id]: current[project.id].filter(state => state.suite.id !== deletingSuite.id) }))
    if (selectedSuiteId === deletingSuite.id) setSelectedSuiteId('')
    setDeletingSuite(null)
  }

  function logout() {
    setCurrentUserId(null)
    setProjectId('')
    setPage('Smoke')
  }

  if (!currentUser) return <AuthPage onLogin={login} onRegister={register} />

  function deleteProject() {
    if (!deletingProject) return
    const id = deletingProject.id
    setProjects(current => current.filter(item => item.id !== id))
    setRequirementsByProject(current => { const next = { ...current }; delete next[id]; return next })
    setTestCasesByProject(current => { const next = { ...current }; delete next[id]; return next })
    setSmokeSuitesByProject(current => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setAuditByProject(current => {
      const next = { ...current }
      delete next[id]
      return next
    })
    if (projectId === id) {
      setProjectId(availableProjects.find(item => item.id !== id)?.id ?? '')
      setSelectedSuiteId('')
    }
    setDeletingProject(null)
  }

  function changeTestCases(action: SetStateAction<TestCasesProjectState>) {
    const data = testCasesByProject[projectId] ?? emptyTestCasesProject()
    const next = typeof action === 'function' ? action(data) : action
    setTestCasesByProject(current => ({ ...current, [projectId]: next }))
    // Requirements own the links. Removing a definition also removes dangling links.
    const removedIds = new Set(data.items.filter(item => !next.items.some(test => test.id === item.id)).map(item => item.id))
    if (removedIds.size) setRequirementsByProject(current => {
      const requirements = current[projectId]
      if (!requirements) return current
      return { ...current, [projectId]: { ...requirements, items: requirements.items.map(item =>
        item.testCaseIds.some(id => removedIds.has(id))
          ? { ...item, testCaseIds: item.testCaseIds.filter(id => !removedIds.has(id)), updatedAt: new Date().toISOString() }
          : item,
      ) } }
    })
  }

  function changeAudit(action: SetStateAction<AuditItem[]>) {
    setAuditByProject(current => current[projectId] ? ({
      ...current,
      [projectId]: typeof action === 'function' ? action(current[projectId]) : action,
    }) : current)
  }

  return (
    <div className="app-shell">
      <AppSidebar
        projects={availableProjects}
        project={project}
        page={page}
        onProjectChange={changeProject}
        onAddProject={() => setCreatingProject(true)}
        onDeleteProject={() => setDeletingProject(project ?? null)}
        onNavigate={nextPage => { setPage(nextPage); if (nextPage === 'Smoke') setSelectedSuiteId('') }}
      />
      <div className="app-content">
        <div className="account-bar">
          {page === 'Smoke' && project && selectedSuiteId && (
            <Button variant="ghost" size="sm" className="account-back" onClick={() => setSelectedSuiteId('')}>← Smoke</Button>
          )}
          <span>{currentUser.name}</span><Button variant="ghost" size="sm" onClick={logout}>Вийти</Button>
        </div>
        {page === 'Smoke' && project && selectedSuiteId ? (
          <SmokePage
            key={selectedSuiteId}
            projectId={project.id}
            suite={smokeSuitesByProject[project.id].find(state => state.suite.id === selectedSuiteId)!.suite}
            data={smokeSuitesByProject[project.id].find(state => state.suite.id === selectedSuiteId)!}
            onChange={changeSmoke}
          />
        ) : page === 'Smoke' && project ? (
          <SmokeSuitesPage suites={smokeSuitesByProject[project.id] ?? []} onAdd={() => setSuiteEditor(null)} onOpen={setSelectedSuiteId} onEdit={state => setSuiteEditor(state.suite)} onDelete={state => setDeletingSuite(state.suite)} />
        ) : page === 'Test Cases' && project ? (
          <TestCasesPage key={project.id} projectId={project.id} data={testCasesByProject[project.id] ?? emptyTestCasesProject()} requirements={requirementsByProject[project.id]?.items ?? []} onChange={changeTestCases} />
        ) : page === 'Requirements' && project ? (
          <RequirementsPage key={project.id} projectId={project.id} data={requirementsByProject[project.id] ?? emptyRequirementsProject()} testCases={testCasesByProject[project.id]?.items ?? []} onChange={action => setRequirementsByProject(current => {
            const data = current[project.id] ?? emptyRequirementsProject()
            return { ...current, [project.id]: typeof action === 'function' ? action(data) : action }
          })} />
        ) : page === 'Audit' && project ? (
          <AuditPage
            evidenceUrls={evidenceUrls}
            key={project.id}
            projectId={project.id}
            auditAreas={auditAreas} auditTypes={auditTypes} onAreasChange={setAuditAreas} onTypesChange={setAuditTypes}
            items={auditByProject[project.id]}
            onChange={changeAudit}
          />
        ) : (
          <main className="smoke-app">
            <header className="page-heading"><h1>{page}</h1></header>
            <p className="muted">
              {page === 'Smoke' || page === 'Audit' || page === 'Test Cases' || page === 'Requirements'
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
      {suiteEditor !== undefined && <SmokeSuiteDialog suite={suiteEditor ?? undefined} onSave={suiteEditor ? renameSuite : addSuite} onClose={() => setSuiteEditor(undefined)} />}
      <Dialog open={Boolean(deletingSuite)} onOpenChange={open => { if (!open) setDeletingSuite(null) }}><DialogContent><DialogHeader><DialogTitle>Видалити Smoke «{deletingSuite?.name}»?</DialogTitle><DialogDescription>Усі тести, prerequisites і результати цього набору буде видалено.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeletingSuite(null)}>Скасувати</Button><Button variant="destructive" onClick={removeSuite}>Видалити Smoke</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}

export default App
