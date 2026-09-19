import { useEffect, useRef, useState } from 'react'
import { fileEvidenceDraft, linkEvidenceDraft } from '@/lib/evidence'
import type { EvidenceDraft, EvidenceOwner } from '@/types'
import { useEvidenceContext } from './evidenceContext'
export function useEvidenceDraft(owner: EvidenceOwner, initial: EvidenceDraft[] = []) {
  const { urls, userId } = useEvidenceContext()
  const [items, setItems] = useState<EvidenceDraft[]>(initial)
  // A File is transient UI data. It stays outside domain state until its owner exists.
  const files = useRef(new Map<string, File>())
  useEffect(() => urls.retain(items.map(item => item.url)), [items, urls])
  useEffect(() => {
    const active = new Set(items.map(item => item.id))
    for (const key of files.current.keys()) if (!active.has(key)) files.current.delete(key)
  }, [items])
  return {
    items, setItems,
    fileFor: (id: string) => files.current.get(id),
    sectionProps: {
      ...owner, temporary: true, items: items.map(item => ({ ...item, ...owner })),
      onAddFile(file: File) { const item = fileEvidenceDraft(file, urls, userId); files.current.set(item.id, file); setItems(current => [...current, item]) },
      onAddLink(name: string, url: string) { const item = linkEvidenceDraft(name, url, userId); setItems(current => [...current, item]) },
      onRemove(id: string) { files.current.delete(id); setItems(current => current.filter(item => item.id !== id)) },
    },
  }
}
