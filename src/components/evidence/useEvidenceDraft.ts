import { useEffect, useState } from 'react'
import { fileEvidenceDraft, linkEvidenceDraft } from '@/lib/evidence'
import type { EvidenceDraft, EvidenceOwner } from '@/types'
import { useEvidenceContext } from './evidenceContext'
export function useEvidenceDraft(owner: EvidenceOwner, initial: EvidenceDraft[] = []) {
  const { urls, userId } = useEvidenceContext()
  const [items, setItems] = useState<EvidenceDraft[]>(initial)
  useEffect(() => urls.retain(items.map(item => item.url)), [items, urls])
  return {
    items, setItems,
    sectionProps: {
      ...owner, items: items.map(item => ({ ...item, ...owner })),
      onAddFile(file: File) { const item = fileEvidenceDraft(file, urls, userId); setItems(current => [...current, item]) },
      onAddLink(name: string, url: string) { const item = linkEvidenceDraft(name, url, userId); setItems(current => [...current, item]) },
      onRemove(id: string) { setItems(current => current.filter(item => item.id !== id)) },
    },
  }
}
