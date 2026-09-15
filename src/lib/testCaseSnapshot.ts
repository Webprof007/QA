import type { ProjectArea, TestCase, TestCaseDictionaryValue, TestCaseSnapshot } from '@/types'

export function createTestCaseSnapshot(test: TestCase, areas: ProjectArea[], types: TestCaseDictionaryValue[]): TestCaseSnapshot {
  return structuredClone({
    id: test.id, code: test.code, title: test.title, areaId: test.areaId, typeId: test.typeId,
    priority: test.priority, status: test.status, preconditions: test.preconditions, steps: test.steps,
    postconditions: test.postconditions, notes: test.notes,
    areaName: areas.find(area => area.projectId === test.projectId && area.id === test.areaId)?.name ?? '',
    typeName: types.find(type => type.projectId === test.projectId && type.id === test.typeId)?.name ?? '',
  })
}
