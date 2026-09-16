import type { ProjectSetupState } from '@/types'
export function createProjectSetupMockData(): ProjectSetupState {
  const dates = { createdAt: '2026-09-15T00:00:00.000Z', updatedAt: '2026-09-15T00:00:00.000Z' }
  return {
    environments: ['Local', 'Staging', 'Production'].map(name => ({ id: `env-voicli-${name.toLowerCase()}`, projectId: 'voicli', name, isActive: true, ...dates })),
    releases: [{ id: 'release-voicli-25', projectId: 'voicli', name: '2.5', status: 'Released', ...dates }, { id: 'release-voicli-26', projectId: 'voicli', name: '2.6', status: 'Active', ...dates }],
    builds: [{ id: 'build-voicli-25', projectId: 'voicli', version: '2.5.0', releaseId: 'release-voicli-25', ...dates }, ...['rc1', 'rc2'].map(suffix => ({ id: `build-voicli-26-${suffix}`, projectId: 'voicli', version: `2.6.0-${suffix}`, releaseId: 'release-voicli-26', ...dates }))],
  }
}
