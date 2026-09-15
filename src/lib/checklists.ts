import type { Checklist, ChecklistRun } from '@/types'

// A UI draft may update results, never the identity or historical test content.
export function saveChecklistRun(runs: ChecklistRun[], projectId: string, draft: ChecklistRun, definitions: Checklist[]): ChecklistRun[] {
  if (draft.projectId !== projectId) return runs
  const existing = runs.find(run => run.id === draft.id)
  if (existing) {
    if (existing.projectId !== projectId || existing.status === 'Completed' || existing.checklistId !== draft.checklistId) return runs
    const saved: ChecklistRun = {
      ...existing,
      status: draft.status,
      completedAt: draft.status === 'Completed' ? new Date().toISOString() : null,
      items: existing.items.map(item => {
        const update = draft.items.find(value => value.id === item.id && value.runId === existing.id)
        return update ? { ...item, result: update.result, comment: update.comment } : item
      }),
    }
    return runs.map(run => run.id === existing.id && run.projectId === projectId ? saved : run)
  }
  const definition = definitions.find(item => item.projectId === projectId && item.id === draft.checklistId)
  if (!definition || draft.items.some(item => item.runId !== draft.id || !definition.items.some(source => source.id === item.checklistItemId))) return runs
  return [...runs, structuredClone(draft)]
}
