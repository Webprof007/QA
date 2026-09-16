import { createContext, useContext } from 'react'
import type { DefectSourceRef, DefectsState } from '@/types'
import type { DefectSources } from '@/lib/defects'
export type DefectContextValue = {
  state: DefectsState; sources: DefectSources
  create: (source: DefectSourceRef) => void
  view: (id: string) => void
  viewSource: (source: DefectSourceRef) => void
  link: (source: DefectSourceRef, defectId: string) => string | null
}
export const DefectContext = createContext<DefectContextValue | null>(null)
export function useDefectContext() {
  const context = useContext(DefectContext)
  if (!context) throw new Error('Defect follow-up requires the QA provider.')
  return context
}
