import { createContext } from 'react'
import type { AuditDictionaryValue } from '@/types'

export type DictionaryKind = 'area' | 'type'
export const DictionaryContext = createContext<{
  area: AuditDictionaryValue[]
  type: AuditDictionaryValue[]
  save: (kind: DictionaryKind, name: string, id?: string) => string
  remove: (kind: DictionaryKind, id: string) => string
}>({ area: [], type: [], save: () => '', remove: () => '' })
