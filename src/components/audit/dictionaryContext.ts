import { createContext } from 'react'
import type { AuditDictionaryValue, ProjectArea } from '@/types'

export type DictionaryKind = 'area' | 'type'
export const DictionaryContext = createContext<{
  area: ProjectArea[]
  type: AuditDictionaryValue[]
  save: (kind: DictionaryKind, name: string, id?: string) => string
  remove: (kind: DictionaryKind, id: string) => string
}>({ area: [], type: [], save: () => '', remove: () => '' })
