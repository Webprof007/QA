import { initialProjectAreas } from './projectAreasMockData'
import { initialAuditByProject } from './auditMockData'
import { initialRequirementsByProject } from './requirementsMockData'
import { initialTestCasesByProject } from './testCasesMockData'
import type { ProjectArea, TestCasesProjectState, RequirementsProjectState, AuditFinding } from '@/types'

// App owns the only live Area array. Module view models receive it through props.
export function createProjectAreaData(): { areas: ProjectArea[]; testCases: Record<string, Omit<TestCasesProjectState, 'areas'>>; requirements: Record<string, Omit<RequirementsProjectState, 'areas'>>; audit: Record<string, AuditFinding[]> } {
  return structuredClone({
    areas: initialProjectAreas,
    testCases: Object.fromEntries(Object.entries(initialTestCasesByProject).map(([id, data]) => [id, { items: data.items, types: data.types }])),
    requirements: Object.fromEntries(Object.entries(initialRequirementsByProject).map(([id, data]) => [id, { items: data.items }])),
    audit: initialAuditByProject,
  })
}
