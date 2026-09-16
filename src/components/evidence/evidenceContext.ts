import { createContext, useContext } from 'react'
import type { EvidenceDraft, EvidenceItem, EvidenceOwner } from '@/types'
import type { EvidenceOwners } from '@/lib/evidence'
import type { EvidenceUrls } from '@/lib/evidenceUrls'
export type EvidenceContextValue = { items: EvidenceItem[]; owners: EvidenceOwners; urls: EvidenceUrls; userId?: number; replace: (owner: EvidenceOwner, update: (current: EvidenceDraft[]) => EvidenceDraft[]) => void }
export const EvidenceContext = createContext<EvidenceContextValue | null>(null)
export function useEvidenceContext() {
  const context = useContext(EvidenceContext)
  if (!context) throw new Error('Evidence requires the QA app provider.')
  return context
}
