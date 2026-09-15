import type { ProjectArea } from '@/types'

// One shared seed catalog. Keep existing IDs stable; names can be renamed independently.
export const initialProjectAreas: ProjectArea[] = [
  { id: 'Landing', projectId: 'voicli', name: 'Landing' },
  { id: 'Settings', projectId: 'voicli', name: 'Settings' },
  { id: 'Pricing', projectId: 'voicli', name: 'Pricing' },
  { id: 'Registration', projectId: 'voicli', name: 'Registration' },
  { id: 'tc-area-auth', projectId: 'voicli', name: 'Auth' },
  { id: 'tc-area-forms', projectId: 'voicli', name: 'Forms' },
  { id: 'tc-area-navigation', projectId: 'voicli', name: 'Navigation' },
]
