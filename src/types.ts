export type Project = {
  id: string
  name: string
  userIds: number[]
  description?: string
  createdByUserId?: number
  createdAt?: string
  updatedAt?: string
}

export type SmokeSuite = {
  id: string; projectId: string; code: string; name: string; description: string
  createdAt: string; updatedAt: string
}
export type SmokeSuiteTestCaseLink = { projectId: string; suiteId: string; testCaseId: string; order: number }
export type SmokePrerequisite = { id: string; projectId: string; suiteId: string; text: string; order: number }
export type SmokeRunStatus = 'Draft' | 'In Progress' | 'Completed'
export type SmokeExecutionResult = 'Not Run' | 'Pass' | 'Fail' | 'Blocked' | 'Skipped'
export type SmokeRun = ProjectContext & {
  id: string; projectId: string; suiteId: string; suiteCodeSnapshot: string; suiteNameSnapshot: string
  browser: string; deviceOrOs: string; notes: string
  status: SmokeRunStatus; startedAt?: string; completedAt?: string; createdByUserId?: number
  createdAt: string; updatedAt: string
}
export type SmokeRunPrerequisite = {
  id: string; projectId: string; runId: string; sourcePrerequisiteId?: string; order: number
  textSnapshot: string; result: 'Not Checked' | 'Pass' | 'Fail'; comment: string
}
export type SmokeExecution = {
  id: string; projectId: string; runId: string; testCaseId: string; order: number
  testCaseSnapshot: TestCaseSnapshot; result: SmokeExecutionResult
  actualResult: string; comment: string; evidenceNote: string; executedByUserId?: number; executedAt?: string
}
export type SmokeState = {
  suites: SmokeSuite[]; links: SmokeSuiteTestCaseLink[]; prerequisites: SmokePrerequisite[]
  runs: SmokeRun[]; runPrerequisites: SmokeRunPrerequisite[]; executions: SmokeExecution[]
}

export type Page =
  | 'Audit'
  | 'Requirements'
  | 'Test Plan'
  | 'Smoke'
  | 'Checklists'
  | 'Test Cases'
  | 'Test Suites'
  | 'Settings'
  | 'Test Runs'
  | 'Defects'
  | 'Coverage'

export type AuditFindingStatus = 'open' | 'in-progress' | 'fixed' | 'verified' | 'wont-fix'
export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low'
export type AuditType = string

export type AuditDictionaryValue = { id: string; projectId: string; name: string }

export type AuditFinding = {
  id: string
  code: string
  auditId: string
  createdAt: string
  updatedAt: string
  createdByUserId?: number
  areaNameSnapshot?: string
  typeNameSnapshot?: string
  projectId: string
  title: string
  areaId: string
  type: AuditType
  severity: AuditSeverity
  status: AuditFindingStatus
  discoveredAt: string
  location: string
  description: string
  expected: string
  actual: string
  evidenceNote?: string
  comment: string
  taskUrl: string
}

// Central project definition. Future relations reference id, never code or a copy.
export type TestCase = {
  id: string
  projectId: string
  code: string
  title: string
  areaId?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  typeId?: string
  status: 'active' | 'draft' | 'deprecated'
  preconditions: string[]
  steps: TestStep[]
  postconditions?: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type TestStep = {
  id: string
  action: string
  expectedResult: string
  sortOrder: number
}

export type TestCaseDictionaryValue = {
  id: string
  projectId: string
  name: string
}

// Page view input; App stores definitions/types and injects the shared areas array.
export type TestCasesProjectState = {
  items: TestCase[]
  areas: ProjectArea[]
  types: TestCaseDictionaryValue[]
}

// Definitions are stored once; relations live in RequirementTestCaseLink[].
export type Requirement = {
  priority?: TestCase['priority']
  id: string
  projectId: string
  code: string
  title: string
  description: string
  areaId?: string
  status: 'draft' | 'approved' | 'deprecated'
  source?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Page/seed view input; areas are not a second module-owned catalog.
export type RequirementsProjectState = {
  items: Requirement[]
  areas: ProjectArea[]
}

export type ProjectArea = { id: string; projectId: string; name: string }
export type TestPlan = {
  id: string; projectId: string; title: string; version: string
  status: 'Draft' | 'Active' | 'Completed'
  objective: string; scopeIn: string; scopeOut: string; environment: string
  entryCriteria: string; exitCriteria: string; risks: string
  startDate: string; endDate: string; notes: string; updatedAt: string
}
export type ChecklistItem = { id: string; checklistId: string; text: string; order: number }
export type Checklist = {
  id: string; projectId: string; title: string; areaId?: string; description: string
  items: ChecklistItem[]; createdAt: string; updatedAt: string
}
export type ChecklistRunItem = {
  id: string; runId: string; checklistItemId: string; textSnapshot: string
  result: 'Not Run' | 'Pass' | 'Fail' | 'Blocked' | 'N/A'; comment: string
}
export type ChecklistRun = {
  id: string; projectId: string; checklistId: string; titleSnapshot: string
  startedAt: string; completedAt: string | null; status: 'In Progress' | 'Completed'
  items: ChecklistRunItem[]
}

export type TestRunStatus = 'Draft' | 'In Progress' | 'Completed'
export type TestExecutionResult = 'Not Run' | 'Pass' | 'Fail' | 'Blocked' | 'Skipped'
// Reuse the definition's structured steps and conditions, freezing dictionary labels too.
export type TestCaseSnapshot = Omit<TestCase, 'projectId' | 'createdAt' | 'updatedAt'> & { areaName: string; typeName: string }
export type TestRun = ProjectContext & {
  sourceTestSuiteId?: string; sourceTestSuiteCodeSnapshot?: string; sourceTestSuiteNameSnapshot?: string
  id: string; projectId: string; name: string; testPlanId?: string | null
  testPlanTitleSnapshot?: string
  browser: string; deviceOrOs: string
  status: TestRunStatus; startedAt: string | null; completedAt: string | null
  notes: string; createdAt: string; updatedAt: string
}
export type TestExecution = {
  id: string; projectId: string; runId: string; testCaseId: string
  testCaseSnapshot: TestCaseSnapshot; result: TestExecutionResult
  actualResult: string; comment: string; evidenceNote: string
  executedByUserId?: number; executedAt?: string
}
export type TestRunsState = { runs: TestRun[]; executions: TestExecution[] }

export type DefectSeverity = 'Blocker' | 'Critical' | 'Major' | 'Minor' | 'Trivial'
export type DefectPriority = 'Highest' | 'High' | 'Medium' | 'Low'
export type DefectStatus = 'New' | 'Open' | 'In Progress' | 'Ready for Retest' | 'Closed' | 'Rejected' | 'Duplicate'
export type Defect = ProjectContext & {
  id: string; projectId: string; code: string; title: string; description: string
  stepsToReproduce: string; expectedResult: string; actualResult: string
  severity: DefectSeverity; priority: DefectPriority; status: DefectStatus; areaId?: string
  browser: string; deviceOrOs: string; evidenceNote: string
  source?: DefectOrigin; sourceTestCaseId?: string; externalTaskUrl?: string
  createdByUserId?: number; createdAt: string; updatedAt: string
}
// Many-to-many links live outside historical execution records. Source identifies origin only.
export type DefectSourceType = 'testExecution' | 'smokeExecution' | 'auditFinding'
export type DefectSourceRef = { type: DefectSourceType; id: string }
export type DefectOrigin =
  | { type: 'testExecution' | 'smokeExecution'; id: string; runId: string }
  | { type: 'auditFinding'; id: string; auditId: string }
export type DefectSourceLink = { projectId: string; sourceType: DefectSourceType; sourceId: string; defectId: string }
export type DefectsState = { items: Defect[]; links: DefectSourceLink[] }

export type RequirementTestCaseLink = { projectId: string; requirementId: string; testCaseId: string }
// Derived view/editor draft only. Never stored alongside the relation state.
export type RequirementWithTestCases = Requirement & { testCaseIds: string[] }
export type RequirementsViewState = Omit<RequirementsProjectState, 'items'> & { items: RequirementWithTestCases[] }

export type TestSuite = { id: string; projectId: string; code: string; name: string; description: string; createdAt: string; updatedAt: string }
export type TestSuiteTestCaseLink = { projectId: string; suiteId: string; testCaseId: string; order: number }
export type TestSuitesState = { suites: TestSuite[]; links: TestSuiteTestCaseLink[] }

export type Environment = { id: string; projectId: string; name: string; baseUrl?: string; description?: string; isActive: boolean; createdAt: string; updatedAt: string }
export type ReleaseStatus = 'Planning' | 'Active' | 'Released' | 'Archived'
export type Release = { id: string; projectId: string; name: string; description?: string; status: ReleaseStatus; startDate?: string; releaseDate?: string; createdAt: string; updatedAt: string }
export type Build = { id: string; projectId: string; version: string; releaseId?: string; description?: string; createdAt: string; updatedAt: string }
export type ProjectSetupState = { environments: Environment[]; releases: Release[]; builds: Build[] }
// Shared context shape only; TestRun, SmokeRun and Defect retain separate ownership/lifecycles.
export type ProjectContext = { environmentId?: string; environmentNameSnapshot?: string; buildId?: string; buildVersionSnapshot?: string }

export type DefectRetestResult = 'Pass' | 'Fail' | 'Blocked'
export type DefectRetest = ProjectContext & {
  id: string; projectId: string; defectId: string
  sourceTestCaseId?: string; sourceExecutionId?: string
  testCaseSnapshot?: TestCaseSnapshot
  // Frozen fallback for manual defects or unavailable test definitions/history.
  defectContextSnapshot?: Pick<Defect, 'title' | 'stepsToReproduce' | 'expectedResult' | 'actualResult'>
  result: DefectRetestResult; actualResult: string; comment: string; evidenceNote: string
  executedByUserId?: number; executedAt: string; createdAt: string
}

export type EvidenceOwnerType = 'testExecution' | 'smokeExecution' | 'defect' | 'defectRetest' | 'auditFinding'
export type EvidenceOwner = { projectId: string; ownerType: EvidenceOwnerType; ownerId: string }
export type EvidenceItem = EvidenceOwner & {
  id: string; kind: 'file' | 'link'; name: string; mimeType?: string; sizeBytes?: number
  url: string; createdByUserId?: number; createdAt: string
}
// Unsaved UI metadata only. File/Blob objects are never stored in domain state.
export type EvidenceDraft = Omit<EvidenceItem, keyof EvidenceOwner>


export type AuditStatus = 'Draft' | 'In Progress' | 'Completed'
export type Audit = {
  id: string; code: string; projectId: string; title: string; typeId: string
  typeNameSnapshot?: string
  status: AuditStatus; objective: string; scope: string
  startDate: string; endDate: string; startedAt?: string; completedAt?: string
  notes: string; limitations: string
  createdByUserId?: number; createdAt: string; updatedAt: string
}
export type AuditCheckResult = 'Not Checked' | 'Pass' | 'Fail' | 'N/A'
export type AuditCheck = {
  id: string; projectId: string; auditId: string
  criterion: string; result: AuditCheckResult; comment: string
}
export type AuditState = { audits: Audit[]; checks: AuditCheck[]; findings: AuditFinding[] }
