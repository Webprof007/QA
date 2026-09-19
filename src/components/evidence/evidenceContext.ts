import { createContext, useContext } from 'react'
import type { EvidenceDraft, EvidenceItem, EvidenceOwner } from '@/types'
import type { EvidenceOwners } from '@/lib/evidence'
import type { EvidenceUrls } from '@/lib/evidenceUrls'
export type EvidenceContextValue = {
  items: EvidenceItem[]; owners: EvidenceOwners; urls: EvidenceUrls; userId?: number
  replace: (owner: EvidenceOwner, update: (current: EvidenceDraft[]) => EvidenceDraft[]) => void
  upload: (owner: EvidenceOwner, file: File) => Promise<void>
  addLink: (owner: EvidenceOwner, name: string, url: string) => Promise<void>
  remove: (owner: EvidenceOwner, id: string) => Promise<void>
}
export const EvidenceContext = createContext<EvidenceContextValue | null>(null)
export function useEvidenceContext() {
  const context = useContext(EvidenceContext)
  if (!context) throw new Error('Evidence requires the QA app provider.')
  return context
}
