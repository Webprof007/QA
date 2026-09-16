import { evidenceOwnerStatus, fileEvidenceDraft, linkEvidenceDraft, ownerEvidence } from '@/lib/evidence'
import type { EvidenceOwner } from '@/types'
import { EvidenceSection } from './EvidenceSection'
import { useEvidenceContext } from './evidenceContext'
export function OwnerEvidence({ owner }: { owner: EvidenceOwner }) {
  const context = useEvidenceContext(), status = evidenceOwnerStatus(owner, context.owners)
  if (!status) return null
  return <EvidenceSection {...owner} items={ownerEvidence(context.items, owner, context.owners)} readOnly={!status.editable}
    onAddFile={file => { const draft = fileEvidenceDraft(file, context.urls, context.userId); try { context.replace(owner, current => [...current, draft]) } catch (error) { context.urls.retain([])(); throw error } }}
    onAddLink={(name, url) => { const draft = linkEvidenceDraft(name, url, context.userId); context.replace(owner, current => [...current, draft]) }}
    onRemove={id => context.replace(owner, current => current.filter(item => item.id !== id))} />
}
