import type { Audit, AuditFinding, Defect, DefectRetest, EvidenceDraft, EvidenceItem, EvidenceOwner, SmokeState, TestRunsState } from '@/types'
import type { EvidenceUrls } from './evidenceUrls'
// Temporary browser-memory protection, not a future server upload contract.
export const MAX_EVIDENCE_FILE_BYTES = 20 * 1024 * 1024
export type EvidenceOwners = { testRuns: TestRunsState; smoke: SmokeState; defects: Defect[]; retests: DefectRetest[]; audits: Audit[]; auditFindings: AuditFinding[] }
export function evidenceOwnerStatus(owner: EvidenceOwner, owners: EvidenceOwners): { editable: boolean } | null {
  const matches = (item: { id: string; projectId: string }) => item.id === owner.ownerId && item.projectId === owner.projectId
  if (owner.ownerType === 'defect') return owners.defects.some(matches) ? { editable: true } : null
  if (owner.ownerType === 'auditFinding') {
    const finding = owners.auditFindings.find(matches)
    const audit = finding && owners.audits.find(item => item.id === finding.auditId && item.projectId === owner.projectId)
    return audit ? { editable: audit.status !== 'Completed' } : null
  }
  if (owner.ownerType === 'defectRetest') return owners.retests.some(matches) ? { editable: false } : null
  const data = owner.ownerType === 'testExecution' ? owners.testRuns : owner.ownerType === 'smokeExecution' ? owners.smoke : null
  if (!data) return null
  const execution = data.executions.find(matches)
  const run = execution && data.runs.find(item => item.id === execution.runId && item.projectId === owner.projectId)
  return run ? { editable: run.status !== 'Completed' } : null
}
export function sameEvidenceOwner(a: EvidenceOwner, b: EvidenceOwner) {
  return a.projectId === b.projectId && a.ownerType === b.ownerType && a.ownerId === b.ownerId
}
export function ownerEvidence(items: EvidenceItem[], owner: EvidenceOwner, owners: EvidenceOwners) {
  return evidenceOwnerStatus(owner, owners) ? items.filter(item => sameEvidenceOwner(item, owner)) : []
}
export function safeEvidenceUrl(value: string, kind: EvidenceItem['kind']) {
  if (kind === 'file' && (value.startsWith('blob:') || /^\/uploads\/(?!\/)/.test(value))) return value
  if (!/^https?:\/\//i.test(value)) return ''
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}
const metadata = (userId?: number) => ({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), createdByUserId: userId })
export function fileEvidenceDraft(file: File, urls: EvidenceUrls, userId?: number): EvidenceDraft {
  if (file.size > MAX_EVIDENCE_FILE_BYTES) throw new Error(`${file.name}: тимчасовий frontend-ліміт — 20 MB на файл.`)
  return { ...metadata(userId), kind: 'file', name: file.name, mimeType: file.type, sizeBytes: file.size, url: urls.create(file) }
}
export function linkEvidenceDraft(name: string, url: string, userId?: number): EvidenceDraft {
  const safe = safeEvidenceUrl(url.trim(), 'link')
  if (!safe || !name.trim()) throw new Error('Вкажіть назву та коректне посилання http:// або https://.')
  return { ...metadata(userId), kind: 'link', name: name.trim(), url: safe }
}
function mergeEvidence(items: EvidenceItem[], owner: EvidenceOwner, drafts: EvidenceDraft[]) {
  const ids = new Set<string>()
  const next = drafts.map(draft => {
    if (ids.has(draft.id)) throw new Error('Вкладення не може повторюватися.')
    ids.add(draft.id)
    const existing = items.find(item => item.id === draft.id)
    if (existing && !sameEvidenceOwner(existing, owner)) throw new Error('Вкладення належить іншому запису.')
    if (existing) return existing // Existing metadata is not editable.
    if (!draft.name.trim() || !['file', 'link'].includes(draft.kind) || !safeEvidenceUrl(draft.url, draft.kind)) throw new Error('Некоректне вкладення.')
    if (draft.kind === 'file' && (draft.sizeBytes === undefined || draft.sizeBytes < 0 || draft.sizeBytes > MAX_EVIDENCE_FILE_BYTES)) throw new Error('Некоректний розмір вкладення.')
    return { ...owner, id: draft.id, kind: draft.kind, name: draft.name, mimeType: draft.mimeType, sizeBytes: draft.sizeBytes, url: draft.url, createdAt: draft.createdAt, createdByUserId: draft.createdByUserId }
  })
  return [...items.filter(item => !sameEvidenceOwner(item, owner)), ...next]
}
export function replaceEvidence(items: EvidenceItem[], owner: EvidenceOwner, drafts: EvidenceDraft[], owners: EvidenceOwners) {
  if (!evidenceOwnerStatus(owner, owners)?.editable) throw new Error('Власник вкладення недоступний або вже read-only.')
  return mergeEvidence(items, owner, drafts)
}
// Only an owner-creation transaction can attach evidence to a new immutable Retest.
export function commitRetestEvidence(items: EvidenceItem[], owner: EvidenceOwner, drafts: EvidenceDraft[], before: EvidenceOwners, after: EvidenceOwners) {
  if (owner.ownerType !== 'defectRetest' || evidenceOwnerStatus(owner, before) || !evidenceOwnerStatus(owner, after)) throw new Error('Evidence Retest зберігається лише разом із новою спробою.')
  const retest = after.retests.find(item => item.id === owner.ownerId && item.projectId === owner.projectId)!
  if (!after.defects.some(item => item.id === retest.defectId && item.projectId === owner.projectId)) throw new Error('Defect поточного проєкту недоступний.')
  return mergeEvidence(items, owner, drafts)
}
