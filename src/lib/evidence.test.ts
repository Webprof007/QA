// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefectsMockData } from '@/data/defectsMockData'
import { createSmokeMockData } from '@/data/smokeMockData'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
import { createTestRun } from './testRuns'
import { createEvidenceUrls } from './evidenceUrls'
import { commitRetestEvidence, evidenceOwnerStatus, fileEvidenceDraft, linkEvidenceDraft, MAX_EVIDENCE_FILE_BYTES, ownerEvidence, replaceEvidence, safeEvidenceUrl, type EvidenceOwners } from './evidence'
import type { DefectRetest, EvidenceOwner } from '@/types'
afterEach(() => vi.unstubAllGlobals())
function fixture() {
  const cases = initialTestCasesByProject.voicli
  const testRuns = createTestRun('voicli', { name: 'Evidence run', testCaseIds: [cases.items[0].id], browser: '', deviceOrOs: '', notes: '' }, cases.items, [], cases.areas, cases.types, [])
  const owners: EvidenceOwners = { testRuns, smoke: createSmokeMockData(cases.items), defects: createDefectsMockData().items, retests: [], audits: [], auditFindings: [] }
  const owner: EvidenceOwner = { projectId: 'voicli', ownerType: 'testExecution', ownerId: testRuns.executions[0].id }
  return { owners, owner }
}
describe('Shared evidence domain', () => {
  it('stores IDs and metadata, isolates owners/projects and does not copy execution evidence to defect', () => {
    const { owners, owner } = fixture(), draft = linkEvidenceDraft('Report', 'https://example.com/report', 42)
    const items = replaceEvidence([], owner, [draft], owners)
    expect(items[0]).toMatchObject({ ...owner, kind: 'link', createdByUserId: 42 })
    expect(items[0]).not.toHaveProperty('owner')
    expect(ownerEvidence(items, owner, owners)).toHaveLength(1)
    expect(ownerEvidence(items, { ...owner, projectId: 'other' }, owners)).toEqual([])
    expect(() => replaceEvidence(items, { ...owner, projectId: 'other' }, [], owners)).toThrow()
    const defect = { ...owner, ownerType: 'defect' as const, ownerId: owners.defects[0].id }
    expect(ownerEvidence(items, defect, owners)).toEqual([])
    expect(() => replaceEvidence(items, defect, [draft], owners)).toThrow()
    expect(replaceEvidence(items, owner, [], owners)).toEqual([])
    expect(owners.defects).toHaveLength(3)
    owners.testRuns.executions = []
    expect(ownerEvidence(items, owner, owners)).toEqual([])
  })
  it('rejects mutations of completed executions and missing/foreign parent runs', () => {
    const { owners, owner } = fixture()
    const draft = linkEvidenceDraft('Report', 'https://example.com')
    const saved = replaceEvidence([], owner, [draft], owners)
    owners.testRuns.runs[0].status = 'Completed'
    expect(evidenceOwnerStatus(owner, owners)).toEqual({ editable: false })
    expect(() => replaceEvidence(saved, owner, [], owners)).toThrow()
    owners.testRuns.runs[0].projectId = 'foreign'
    expect(evidenceOwnerStatus(owner, owners)).toBeNull()
    expect(() => replaceEvidence([], owner, [draft], owners)).toThrow()
  })
  it('commits retest attachments once with owner creation and forbids later modifications', () => {
    const { owners, owner } = fixture()
    const retest: DefectRetest = { id: 'retest', projectId: owner.projectId, defectId: owners.defects[0].id, result: 'Pass', actualResult: '', comment: '', evidenceNote: '', executedAt: new Date().toISOString(), createdAt: new Date().toISOString() }
    const ref: EvidenceOwner = { ...owner, ownerType: 'defectRetest', ownerId: retest.id }
    const after = { ...owners, retests: [retest] }, draft = linkEvidenceDraft('Proof', 'https://example.com')
    const items = commitRetestEvidence([], ref, [draft], owners, after)
    expect(ownerEvidence(items, ref, after)).toHaveLength(1)
    expect(() => replaceEvidence(items, ref, [], after)).toThrow()
    expect(() => commitRetestEvidence(items, ref, [], after, after)).toThrow()
    expect(() => commitRetestEvidence([], { ...ref, projectId: 'other' }, [draft], owners, after)).toThrow()
  })
  it.each(['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/a', '//example.com', 'blob:link'])('rejects unsafe link %s', url => {
    expect(() => linkEvidenceDraft('Unsafe', url)).toThrow()
    expect(safeEvidenceUrl(url, 'link')).toBe('')
  })
  it('accepts ordinary files, stores metadata only and releases URLs after the last reference', async () => {
    const revoke = vi.fn()
    vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:temporary'); static revokeObjectURL = revoke })
    const urls = createEvidenceUrls(), draft = fileEvidenceDraft(new File(['hello'], 'log.txt', { type: 'text/plain' }), urls, 42)
    expect(draft).toMatchObject({ name: 'log.txt', mimeType: 'text/plain', sizeBytes: 5, url: 'blob:temporary', createdByUserId: 42 })
    expect(draft).not.toHaveProperty('file'); expect(JSON.stringify(draft)).not.toContain('base64')
    const releaseDraft = urls.retain([draft.url]), releaseSaved = urls.retain([draft.url])
    releaseDraft(); await Promise.resolve(); expect(revoke).not.toHaveBeenCalled()
    releaseSaved(); await Promise.resolve(); expect(revoke).toHaveBeenCalledWith(draft.url)
    const big = new File(['a'], 'large.log'); Object.defineProperty(big, 'size', { value: MAX_EVIDENCE_FILE_BYTES + 1 })
    expect(() => fileEvidenceDraft(big, urls)).toThrow('20 MB')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })
})
