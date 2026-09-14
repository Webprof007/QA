import type { Requirement, RequirementsProjectState } from '@/types'
import { initialTestCasesByProject } from './testCasesMockData'

export const emptyRequirementsProject = (): RequirementsProjectState => ({ items: [], areas: [] })

const examples = [
  ['REQ-AUTH-001', 'User can log in', 'Auth', 'approved', ['TC-001', 'TC-002']],
  ['REQ-AUTH-002', 'Invalid credentials are rejected', 'Auth', 'draft', ['TC-002']],
  ['REQ-FORM-001', 'Required fields are identified', 'Forms', 'approved', ['TC-003']],
  ['REQ-NAV-001', 'User can navigate between pages', 'Navigation', 'draft', []],
] as const

const items: Requirement[] = examples.map(([code, title, area, status, codes], index) => ({
  id: `demo-requirement-${index + 1}`,
  projectId: 'voicli',
  code, title,
  description: 'Illustrative requirement for a demo environment. Confirm the expected behavior with the product team.',
  areaId: `req-area-${area.toLowerCase()}`,
  status,
  source: 'Demo specification',
  notes: 'Adapt this example to the actual product requirements.',
  testCaseIds: initialTestCasesByProject.voicli.items.filter(test => codes.some(code => code === test.code)).map(test => test.id),
  createdAt: '2026-09-13T00:00:00.000Z',
  updatedAt: '2026-09-13T00:00:00.000Z',
}))

export const initialRequirementsByProject: Record<string, RequirementsProjectState> = {
  voicli: {
    items,
    areas: [...new Set(examples.map(row => row[2]))].map(name => ({ id: `req-area-${name.toLowerCase()}`, projectId: 'voicli', name })),
  },
  'qp-notes': emptyRequirementsProject(),
}
