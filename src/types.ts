export type Project = {
  id: string
  name: string
  userIds: string[]
}

export type PreparationItem = {
  id: string
  projectId: string
  smokeSuiteId: string
  text: string
  checked: boolean
  sortOrder: number
}

export type TestResult = {
  id: string
  projectId: string
  date: string
  completed: boolean
  status: 'pass' | 'fail' | 'blocked' | null
  comment: string
  taskUrl: string
}

export type SmokeTestCase = {
  id: string
  projectId: string
  smokeSuiteId: string
  title: string
  profile: string
  estimatedMinutes: number
  steps: string[]
  expectedResults: string[]
  results: TestResult[]
}

export type ResultDraft = Omit<TestResult, 'id'> & { id?: string }

export type SmokeProjectState = {
  preparation: PreparationItem[]
  tests: SmokeTestCase[]
  drafts: Record<string, ResultDraft>
}

export type SmokeSuite = {
  id: string
  projectId: string
  name: string
  description?: string
  createdAt: string
}

export type SmokeSuiteState = {
  suite: SmokeSuite
  preparation: PreparationItem[]
  tests: SmokeTestCase[]
  drafts: Record<string, ResultDraft>
}

export type Page =
  | 'Audit'
  | 'Requirements'
  | 'Test Plan'
  | 'Smoke'
  | 'Checklists'
  | 'Test Cases'

export type AuditStatus = 'open' | 'in-progress' | 'fixed' | 'verified' | 'wont-fix'
export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type AuditType = string

export type AuditDictionaryValue = { id: string; projectId: string; name: string }

export type AuditEvidence = {
  id: string
  type: 'image' | 'video'
  name: string
  url: string
  note?: string
}

export type AuditItem = {
  id: string
  projectId: string
  title: string
  area: string
  type: AuditType
  severity: Severity
  status: AuditStatus
  discoveredAt: string
  location: string
  description: string
  expected: string
  actual: string
  evidence: AuditEvidence[]
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

export type TestCasesProjectState = {
  items: TestCase[]
  areas: TestCaseDictionaryValue[]
  types: TestCaseDictionaryValue[]
}

// The sole source of Requirement ↔ Test Case relations is testCaseIds.
export type Requirement = {
  id: string
  projectId: string
  code: string
  title: string
  description: string
  areaId?: string
  status: 'draft' | 'approved' | 'deprecated'
  source?: string
  notes?: string
  testCaseIds: string[]
  createdAt: string
  updatedAt: string
}

export type RequirementsProjectState = {
  items: Requirement[]
  areas: { id: string; projectId: string; name: string }[]
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
