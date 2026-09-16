import { describe, expect, it } from 'vitest'
import { initialAudits, initialAuditByProject, initialAuditTypes } from '@/data/auditMockData'
import { initialProjectAreas } from '@/data/projectAreasMockData'
import { createSmokeMockData } from '@/data/smokeMockData'
import { auditCode, saveAudit, saveAuditCheck, saveAuditFinding, removeAuditFinding, transitionAudit } from './audit'
import { evidenceOwnerStatus, linkEvidenceDraft, ownerEvidence, replaceEvidence, type EvidenceOwners } from './evidence'
import type { AuditCheck, AuditState } from '@/types'
const project = 'voicli', id = 'audit-voicli-demo'
const fixture = (): AuditState => structuredClone({ audits: initialAudits, checks: [], findings: initialAuditByProject.voicli })
const check: AuditCheck = { id: 'check-1', projectId: project, auditId: id, criterion: 'Keyboard focus visible', result: 'Not Checked', comment: '' }
describe('Audit sessions domain', () => {
  it('creates independent technical IDs/codes, preserves identity and scoped creator metadata', () => {
    const state = fixture(), input = { ...state.audits[0], id: '', title: 'Second audit', status: 'Completed' as const }
    const next = saveAudit(state, project, input, initialAuditTypes, 42)
    expect(next.audits).toHaveLength(2)
    const audit = next.audits[1]
    expect(audit.id).not.toBe(audit.code); expect(audit.code).toBe('AUDIT-002')
    expect(audit.status).toBe('Draft'); expect(audit.createdByUserId).toBe(42)
    const edit = saveAudit(next, project, { ...audit, title: 'Edited', code: 'Forged', createdAt: 'forged', status: 'Completed' }, initialAuditTypes, 99).audits[1]
    expect(edit).toMatchObject({ id: audit.id, code: audit.code, createdAt: audit.createdAt, createdByUserId: 42, status: 'Draft' })
    expect(auditCode(next.audits, 'other', 'AUDIT-')).toBe('AUDIT-001')
    expect(() => saveAudit(state, 'other', input, initialAuditTypes)).toThrow()
    expect(() => saveAudit(state, project, { ...input, typeId: 'foreign' }, initialAuditTypes)).toThrow()
  })
  it.each(['Not Checked', 'Pass', 'Fail', 'N/A'] as const)('saves independent AuditCheck result %s and comment', result => {
    const state = saveAuditCheck(fixture(), project, id, { ...check, result, comment: 'Observed' })
    expect(state.checks[0]).toMatchObject({ result, comment: 'Observed', auditId: id })
    expect(state.checks[0]).not.toHaveProperty('testCaseId')
    expect(state.findings).toEqual(fixture().findings)
  })
  it('enforces Draft → In Progress → Completed and rejects all historical writes', () => {
    const state = saveAuditCheck(fixture(), project, id, check)
    expect(() => transitionAudit(state, project, id, 'complete', initialProjectAreas, initialAuditTypes)).toThrow()
    const started = transitionAudit(state, project, id, 'start', initialProjectAreas, initialAuditTypes)
    expect(started.audits[0].startedAt).toBeTruthy()
    expect(() => transitionAudit(started, project, id, 'start', initialProjectAreas, initialAuditTypes)).toThrow()
    const done = transitionAudit(started, project, id, 'complete', initialProjectAreas, initialAuditTypes)
    expect(done.audits[0].status).toBe('Completed'); expect(done.audits[0].completedAt).toBeTruthy()
    expect(done.checks[0].result).toBe('Not Checked')
    expect(done.findings[0].areaNameSnapshot).toBe('Landing')
    expect(done.audits[0].typeNameSnapshot).toBe('UI / UX')
    expect(() => saveAudit(done, project, done.audits[0], initialAuditTypes)).toThrow()
    expect(() => saveAuditCheck(done, project, id, check)).toThrow()
    expect(() => saveAuditFinding(done, project, id, done.findings[0], initialProjectAreas, initialAuditTypes)).toThrow()
    expect(() => removeAuditFinding(done, project, id, done.findings[0].id)).toThrow()
    expect(() => transitionAudit(done, project, id, 'start', initialProjectAreas, initialAuditTypes)).toThrow()
  })
  it('rejects cross-project parents, checks, findings, areas and transfers between audits', () => {
    const state = fixture()
    state.audits.push({ ...state.audits[0], id: 'second', code: 'AUDIT-002' })
    state.checks.push(check)
    expect(() => saveAuditCheck(state, 'other', id, { ...check, projectId: 'other' })).toThrow()
    expect(() => saveAuditCheck(state, project, 'second', { ...check, auditId: 'second' })).toThrow()
    expect(() => saveAuditFinding(state, project, 'second', { ...state.findings[0], auditId: 'second' }, initialProjectAreas, initialAuditTypes)).toThrow()
    expect(() => saveAuditFinding(state, project, id, { ...state.findings[0], projectId: 'other' }, initialProjectAreas, initialAuditTypes)).toThrow()
    expect(() => saveAuditFinding(state, project, id, { ...state.findings[0], areaId: 'foreign' }, initialProjectAreas, initialAuditTypes)).toThrow()
    expect(() => removeAuditFinding(state, project, 'second', state.findings[0].id)).toThrow()
  })
  it('uses shared Evidence with the actual parent lifecycle and rejects missing/foreign parents', () => {
    const state = fixture(), finding = state.findings[0]
    const owners: EvidenceOwners = { audits: state.audits, auditFindings: state.findings, defects: [], retests: [], testRuns: { runs: [], executions: [] }, smoke: createSmokeMockData([]) }
    const owner = { projectId: project, ownerType: 'auditFinding' as const, ownerId: finding.id }
    const items = replaceEvidence([], owner, [linkEvidenceDraft('Proof', 'https://example.com', 42)], owners)
    expect(items[0]).toMatchObject({ ownerId: finding.id, createdByUserId: 42 })
    owners.audits = [{ ...state.audits[0], status: 'Completed' }]
    expect(ownerEvidence(items, owner, owners)).toHaveLength(1)
    expect(() => replaceEvidence(items, owner, [], owners)).toThrow()
    owners.audits = [{ ...state.audits[0], projectId: 'other' }]
    expect(evidenceOwnerStatus(owner, owners)).toBeNull()
    expect(ownerEvidence(items, owner, owners)).toEqual([])
    owners.audits = []
    expect(() => replaceEvidence([], owner, [], owners)).toThrow()
  })
  it('creates/updates/deletes findings under one parent without copied attachments or defects', () => {
    const state = fixture()
    const created = saveAuditFinding(state, project, id, { ...state.findings[0], id: 'new', code: 'forged', title: 'New finding' }, initialProjectAreas, initialAuditTypes, 42)
    const finding = created.findings[4]
    expect(finding).toMatchObject({ code: 'AUD-005', auditId: id, createdByUserId: 42 })
    expect(finding).not.toHaveProperty('evidence')
    const edited = saveAuditFinding(created, project, id, { ...finding, code: 'changed', title: 'Edited' }, initialProjectAreas, initialAuditTypes, 99)
    expect(edited.findings[4]).toMatchObject({ code: 'AUD-005', createdByUserId: 42, title: 'Edited' })
    expect(removeAuditFinding(edited, project, id, finding.id).findings).toEqual(state.findings)
  })
})
