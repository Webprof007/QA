import type { Build, Environment, ProjectContext, ProjectSetupState, Release } from '@/types'
export const emptyProjectSetup: ProjectSetupState = { environments: [], releases: [], builds: [] }
export const releaseStatuses = ['Planning', 'Active', 'Released', 'Archived'] as const
function identity(items: { id: string; projectId: string; createdAt: string }[], projectId: string, id: string) {
  const existing = items.find(item => item.id === id)
  if (existing && existing.projectId !== projectId) throw new Error('Запис належить іншому проєкту.')
  return { id, projectId, createdAt: existing?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() }
}
function required(value: string) { if (!value.trim()) throw new Error('Введіть назву або версію.'); return value.trim() }
export function saveEnvironment(state: ProjectSetupState, projectId: string, draft: Environment): ProjectSetupState {
  if (draft.projectId !== projectId) throw new Error('Environment належить іншому проєкту.')
  if (draft.baseUrl && !/^https?:\/\//i.test(draft.baseUrl)) throw new Error('Base URL має починатися з http:// або https://.')
  if (draft.baseUrl) { try { new URL(draft.baseUrl) } catch { throw new Error('Введіть коректний Base URL.') } }
  const item = { ...draft, ...identity(state.environments, projectId, draft.id), name: required(draft.name) }
  return { ...state, environments: [...state.environments.filter(value => value.id !== item.id), item] }
}
export function saveRelease(state: ProjectSetupState, projectId: string, draft: Release): ProjectSetupState {
  if (draft.projectId !== projectId) throw new Error('Release належить іншому проєкту.')
  if (!releaseStatuses.includes(draft.status)) throw new Error('Виберіть статус Release.')
  const item = { ...draft, ...identity(state.releases, projectId, draft.id), name: required(draft.name) }
  return { ...state, releases: [...state.releases.filter(value => value.id !== item.id), item] }
}
export function saveBuild(state: ProjectSetupState, projectId: string, draft: Build): ProjectSetupState {
  if (draft.projectId !== projectId) throw new Error('Build належить іншому проєкту.')
  const existing = state.builds.find(item => item.id === draft.id && item.projectId === projectId)
  if (draft.releaseId) {
    const release = state.releases.find(item => item.id === draft.releaseId && item.projectId === projectId)
    if (!release || (release.status === 'Archived' && existing?.releaseId !== release.id)) throw new Error('Виберіть неархівний Release поточного проєкту.')
  }
  const item = { ...draft, ...identity(state.builds, projectId, draft.id), version: required(draft.version), releaseId: draft.releaseId || undefined }
  return { ...state, builds: [...state.builds.filter(value => value.id !== item.id), item] }
}
export function deleteSetupEntity(state: ProjectSetupState, projectId: string, kind: 'environments' | 'builds', id: string): ProjectSetupState {
  return { ...state, [kind]: state[kind].filter(item => item.projectId !== projectId || item.id !== id) }
}
// Selectors submit IDs only. Historical context is trusted only from a saved record/source run.
export function resolveProjectContext(state: ProjectSetupState, projectId: string, selected: Pick<ProjectContext, 'environmentId' | 'buildId'>, previous?: ProjectContext): ProjectContext {
  const environment = state.environments.find(item => item.id === selected.environmentId)
  const build = state.builds.find(item => item.id === selected.buildId)
  if (environment && environment.projectId !== projectId || build && build.projectId !== projectId) throw new Error('Виберіть Environment і Build поточного проєкту.')
  const keepEnvironment = !!selected.environmentId && selected.environmentId === previous?.environmentId
  const keepBuild = !!selected.buildId && selected.buildId === previous?.buildId
  if (selected.environmentId && !keepEnvironment && (!environment || !environment.isActive)) throw new Error('Виберіть активне Environment поточного проєкту.')
  if (selected.buildId && !keepBuild && !build) throw new Error('Виберіть Build поточного проєкту.')
  return { environmentId: selected.environmentId || undefined, environmentNameSnapshot: selected.environmentId ? keepEnvironment ? previous?.environmentNameSnapshot : environment?.name : undefined, buildId: selected.buildId || undefined, buildVersionSnapshot: selected.buildId ? keepBuild ? previous?.buildVersionSnapshot : build?.version : undefined }
}
export function copyProjectContext(source: ProjectContext): ProjectContext {
  return { environmentId: source.environmentId, environmentNameSnapshot: source.environmentNameSnapshot, buildId: source.buildId, buildVersionSnapshot: source.buildVersionSnapshot }
}
