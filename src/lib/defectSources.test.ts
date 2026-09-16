// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createProjectAreaData } from '@/data/projectAreaMockData'
import { createProjectSetupMockData } from '@/data/projectSetupMockData'
import { createSmokeMockData } from '@/data/smokeMockData'
import { initialAudits } from '@/data/auditMockData'
import { createSmokeRun, saveSmokeExecution, changeSmokeRunStatus } from './smoke'
import { defectFromSource, newDefect, saveDefect, linkSourceDefect, linkedSourceDefects, type DefectSources } from './defects'
import { retestSource } from './defectRetests'
import type { DefectSourceRef, DefectsState } from '@/types'
function fixture() {
  const seed = createProjectAreaData(), setup = createProjectSetupMockData(), cases = seed.testCases.voicli
  let smoke = createSmokeMockData(cases.items)
  smoke = createSmokeRun(smoke, 'voicli', smoke.suites[0].id, { environmentId: 'env-voicli-staging', buildId: 'build-voicli-26-rc1', browser: 'Chrome', deviceOrOs: 'macOS', notes: '' }, cases.items, seed.areas, cases.types, 42, setup)
  smoke = saveSmokeExecution(smoke, 'voicli', smoke.executions[0].id, { result: 'Fail', actualResult: 'Broken login', comment: 'Reproduces twice', evidenceNote: 'Console output' }, 42)
  smoke = changeSmokeRunStatus(smoke, 'voicli', smoke.runs[0].id, 'Completed')
  const sources: DefectSources = { testRuns: { runs: [], executions: [] }, smoke, audits: { audits: structuredClone(initialAudits), checks: [], findings: seed.audit.voicli } }
  const smokeRef: DefectSourceRef = { type: 'smokeExecution', id: smoke.executions[0].id }
  const auditRef: DefectSourceRef = { type: 'auditFinding', id: seed.audit.voicli[0].id }
  const create = (ref: DefectSourceRef, state: DefectsState = { items: [], links: [] }) => saveDefect(state, defectFromSource(newDefect('voicli', state.items), ref, sources, seed.areas), 'voicli', 42, sources.testRuns, seed.areas, setup, sources)
  return { seed, setup, cases, sources, smokeRef, auditRef, create }
}
describe('Defect sources across execution mechanisms and Audit', () => {
  it('creates from completed Smoke Fail using snapshot/context and leaves the historical source unchanged', () => {
    const f = fixture(), before = structuredClone(f.sources), state = f.create(f.smokeRef), defect = state.items[0]
    expect(defect).toMatchObject({ source: { type: 'smokeExecution', id: f.smokeRef.id, runId: f.sources.smoke.runs[0].id }, title: 'Login valid user', actualResult: 'Broken login', description: 'Reproduces twice', evidenceNote: 'Console output', environmentId: 'env-voicli-staging', environmentNameSnapshot: 'Staging', buildVersionSnapshot: '2.6.0-rc1', browser: 'Chrome', deviceOrOs: 'macOS' })
    expect(defect.expectedResult).toContain('signed-in screen')
    expect(f.sources).toEqual(before)
    expect(state.links[0]).toEqual({ projectId: 'voicli', sourceType: 'smokeExecution', sourceId: f.smokeRef.id, defectId: defect.id })
    f.cases.items[0].title = 'Changed central case'
    f.sources.smoke.executions[0].testCaseSnapshot.title = 'Changed source'
    expect(defect.title).toBe('Login valid user')
    expect(defect).not.toHaveProperty('attachments')
  })
  it('prefills a separate editable Defect from Finding without converting or deleting Finding', () => {
    const f = fixture(), before = structuredClone(f.sources.audits), draft = defectFromSource(newDefect('voicli', []), f.auditRef, f.sources, f.seed.areas)
    const state = saveDefect({ items: [], links: [] }, { ...draft, title: 'Edited defect title', severity: 'Blocker' }, 'voicli', 42, f.sources.testRuns, f.seed.areas, f.setup, f.sources)
    expect(state.items[0]).toMatchObject({ source: { type: 'auditFinding', id: f.auditRef.id, auditId: initialAudits[0].id }, expectedResult: before.findings[0].expected, actualResult: before.findings[0].actual, areaId: before.findings[0].areaId, title: 'Edited defect title', severity: 'Blocker' })
    expect(state.items[0].description).toContain(before.findings[0].location)
    expect(state.items[0].sourceTestCaseId).toBeUndefined()
    expect(state.items[0].environmentId).toBeUndefined()
    expect(f.sources.audits).toEqual(before)
    f.sources.audits.findings[0].expected = 'Later finding'
    expect(state.items[0].expectedResult).toBe(before.findings[0].expected)
  })
  it('shares one many-to-many relation collection and deduplicates by source type, ID and defect', () => {
    const f = fixture(), before = structuredClone(f.sources)
    let state = f.create(f.smokeRef)
    state = f.create(f.auditRef, state)
    for (const ref of [f.smokeRef, f.auditRef]) for (const defect of state.items) {
      state = linkSourceDefect(state, 'voicli', ref, defect.id, f.sources)
      state = linkSourceDefect(state, 'voicli', ref, defect.id, f.sources)
    }
    expect(state.links).toHaveLength(4)
    expect(linkedSourceDefects(state, 'voicli', f.smokeRef)).toHaveLength(2)
    expect(linkedSourceDefects(state, 'voicli', f.auditRef)).toHaveLength(2)
    expect(state.links.every(link => Object.keys(link).length === 4)).toBe(true)
    expect(f.sources).toEqual(before)
    // Identical technical IDs in different source types must remain distinct.
    f.sources.audits.findings[0].id = f.smokeRef.id
    state = linkSourceDefect(state, 'voicli', { type: 'auditFinding', id: f.smokeRef.id }, state.items[0].id, f.sources)
    expect(state.links).toHaveLength(5)
  })
  it('rejects foreign/missing sources, foreign defects, wrong parents and non-Fail executions', () => {
    const f = fixture(), state = f.create(f.auditRef)
    expect(() => linkSourceDefect(state, 'other', f.auditRef, state.items[0].id, f.sources)).toThrow()
    expect(() => linkSourceDefect(state, 'voicli', f.smokeRef, 'missing', f.sources)).toThrow()
    const foreign = { ...state.items[0], id: 'foreign', projectId: 'other' }
    expect(() => linkSourceDefect({ ...state, items: [...state.items, foreign] }, 'voicli', f.smokeRef, foreign.id, f.sources)).toThrow()
    f.sources.smoke.executions[0].result = 'Pass'
    expect(() => f.create(f.smokeRef)).toThrow()
    expect(() => linkSourceDefect(state, 'voicli', f.smokeRef, state.items[0].id, f.sources)).toThrow()
    f.sources.smoke.runs[0].projectId = 'other'
    expect(() => linkSourceDefect(state, 'voicli', f.smokeRef, state.items[0].id, f.sources)).toThrow()
    f.sources.audits.audits[0].projectId = 'other'
    expect(() => f.create(f.auditRef)).toThrow()
    f.sources.audits.audits = []
    expect(() => f.create(f.auditRef)).toThrow()
  })
  it('allows completed Audit follow-up and keeps origin immutable during Defect edits', () => {
    const f = fixture()
    f.sources.audits.audits[0].status = 'Completed'
    const before = structuredClone(f.sources), state = f.create(f.auditRef)
    const next = saveDefect(state, { ...state.items[0], source: { type: 'smokeExecution', id: f.smokeRef.id, runId: f.sources.smoke.runs[0].id } }, 'voicli', 42, f.sources.testRuns, f.seed.areas, f.setup, f.sources)
    expect(next.items[0].source).toEqual(state.items[0].source)
    expect(f.sources).toEqual(before)
  })
  it('preserves Smoke snapshot fallback for retests when live TestCase is unavailable', () => {
    const f = fixture(), defect = f.create(f.smokeRef).items[0]
    const context = retestSource(defect, [], f.sources.testRuns, f.seed.areas, f.cases.types, [], f.sources.smoke)
    expect(context.testCaseSnapshot).toEqual(f.sources.smoke.executions[0].testCaseSnapshot)
  })
})
