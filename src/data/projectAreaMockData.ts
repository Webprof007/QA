import { initialAuditAreas, initialAuditByProject } from './auditMockData'
import { initialRequirementsByProject } from './requirementsMockData'
import { initialTestCasesByProject } from './testCasesMockData'
import type { ProjectArea, TestCasesProjectState, RequirementsProjectState, AuditItem } from '@/types'

// Normalize the existing demo dictionaries once. App owns the only live Area array.
export function createProjectAreaData(): { areas: ProjectArea[]; testCases: Record<string, TestCasesProjectState>; requirements: Record<string, RequirementsProjectState>; audit: Record<string, AuditItem[]> } {
  const areas: ProjectArea[] = []
  const aliases = new Map<string, string>()
  const key = (projectId: string, id: string) => `${projectId}:${id}`
  for (const value of [...initialAuditAreas, ...Object.values(initialTestCasesByProject).flatMap(data => data.areas), ...Object.values(initialRequirementsByProject).flatMap(data => data.areas)]) {
    const existing = areas.find(area => area.projectId === value.projectId && area.name.toLowerCase() === value.name.toLowerCase())
    if (!existing) areas.push({ ...value })
    aliases.set(key(value.projectId, value.id), existing?.id ?? value.id)
  }
  const areaId = (projectId: string, id?: string) => id ? aliases.get(key(projectId, id)) ?? id : undefined
  return {
    areas,
    testCases: Object.fromEntries(Object.entries(initialTestCasesByProject).map(([projectId, data]) => [projectId, { ...data, areas: [], items: data.items.map(item => ({ ...item, areaId: areaId(projectId, item.areaId) })) }])),
    requirements: Object.fromEntries(Object.entries(initialRequirementsByProject).map(([projectId, data]) => [projectId, { ...data, areas: [], items: data.items.map(item => ({ ...item, areaId: areaId(projectId, item.areaId) })) }])),
    audit: Object.fromEntries(Object.entries(initialAuditByProject).map(([projectId, items]) => [projectId, items.map(item => ({ ...item, area: areaId(projectId, item.area) ?? '' }))])),
  }
}
