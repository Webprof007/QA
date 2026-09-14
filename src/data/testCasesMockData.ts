import type { TestCase, TestCasesProjectState } from '@/types'

export const emptyTestCasesProject = (): TestCasesProjectState => ({ items: [], areas: [], types: [] })

const examples = [
  ['Login valid user', 'Auth', 'Functional', 'high', 'active', 'Submit valid demo credentials.', 'The demo user reaches the signed-in screen.'],
  ['Wrong password', 'Auth', 'Negative', 'high', 'active', 'Submit a wrong password for a demo account.', 'An error is shown and the user remains signed out.'],
  ['Required field feedback', 'Forms', 'Negative', 'medium', 'draft', 'Submit a demo form with a required field empty.', 'The required field is identified.'],
  ['Navigation link', 'Navigation', 'Functional', 'low', 'active', 'Select a navigation link on a demo page.', 'The corresponding page opens.'],
] as const

const items: TestCase[] = examples.map(([title, area, type, priority, status, action, expectedResult], index) => ({
  id: `demo-test-case-${index + 1}`,
  projectId: 'voicli',
  code: `TC-${String(index + 1).padStart(3, '0')}`,
  title,
  areaId: `tc-area-${area.toLowerCase()}`,
  typeId: `tc-type-${type.toLowerCase()}`,
  priority,
  status,
  preconditions: ['Use a demo environment and test data.'],
  steps: [{ id: `demo-step-${index + 1}`, action, expectedResult, sortOrder: 0 }],
  postconditions: [],
  notes: 'Illustrative example. Adapt to the actual product requirements.',
  createdAt: '2026-09-13T00:00:00.000Z',
  updatedAt: '2026-09-13T00:00:00.000Z',
}))

export const initialTestCasesByProject: Record<string, TestCasesProjectState> = {
  voicli: {
    items,
    areas: [...new Set(examples.map(row => row[1]))].map(name => ({ id: `tc-area-${name.toLowerCase()}`, projectId: 'voicli', name })),
    types: [...new Set(examples.map(row => row[2]))].map(name => ({ id: `tc-type-${name.toLowerCase()}`, projectId: 'voicli', name })),
  },
  'qp-notes': emptyTestCasesProject(),
}
