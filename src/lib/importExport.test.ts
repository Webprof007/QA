// @vitest-environment jsdom
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { autoMapHeaders, exportRows, readImportFile, validateChecklists, validateRequirements, validateTestCases } from './importExport'
import type { ProjectArea, TestCaseDictionaryValue } from '@/types'

const projectId = 'project-a'
const areas: ProjectArea[] = [{ id: 'area-a', projectId, name: 'Authentication' }, { id: 'area-b', projectId: 'project-b', name: 'Payments' }]
const types: TestCaseDictionaryValue[] = [{ id: 'type-a', projectId, name: 'Functional' }, { id: 'type-b', projectId: 'project-b', name: 'Security' }]

describe('Import / Export transport', () => {
  it('reads CSV requirements with auto-mapped Ukrainian columns', async () => {
    const parsed = await readImportFile(new File(['Назва,Область,Пріоритет\nLogin works,authentication,High'], 'requirements.csv', { type: 'text/csv' }))
    const mapping = autoMapHeaders('requirements', parsed.headers)
    const result = validateRequirements(parsed.rows, mapping, { projectId, areas, existing: [] })
    expect(result.issues).toEqual([])
    expect(result.values[0]).toMatchObject({ projectId, code: 'REQ-001', title: 'Login works', areaId: 'area-a', priority: 'high' })
  })

  it('reads XLSX and imports structured Test Case steps', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([['Title', 'Area', 'Type', 'Steps', 'Expected Result'], ['Reset password', 'Authentication', 'Functional', '1. Open reset page\n2. Submit password', '1. Form opens\n2. Password is saved']])
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Cases')
    const file = new File([XLSX.write(book, { type: 'array', bookType: 'xlsx' })], 'cases.xlsx')
    const parsed = await readImportFile(file)
    const result = validateTestCases(parsed.rows, autoMapHeaders('testCases', parsed.headers), { projectId, areas, types, existing: [] })
    expect(result.issues).toEqual([])
    expect(result.values[0].steps).toMatchObject([{ action: 'Open reset page', expectedResult: 'Form opens', sortOrder: 0 }, { action: 'Submit password', expectedResult: 'Password is saved', sortOrder: 1 }])
  })

  it('parses checklist items from a multiline cell', () => {
    const result = validateChecklists([{ Title: 'Release check', Area: 'Authentication', Items: 'Open app\nSign in\nCheck dashboard' }], autoMapHeaders('checklists', ['Title', 'Area', 'Items']), { projectId, areas })
    expect(result.values[0].items.map(item => item.text)).toEqual(['Open app', 'Sign in', 'Check dashboard'])
  })

  it('allows mapping a non-standard title header', () => {
    const result = validateRequirements([{ 'Requirement name': 'Session timeout' }], { title: 'Requirement name' }, { projectId, areas, existing: [] })
    expect(result.values).toHaveLength(1)
  })

  it('rejects unknown and cross-project Area or Type', () => {
    const requirement = validateRequirements([{ Title: 'Bad area', Area: 'Payments' }], { title: 'Title', area: 'Area' }, { projectId, areas, existing: [] })
    const testCase = validateTestCases([{ Title: 'Bad type', Type: 'Security' }], { title: 'Title', type: 'Type' }, { projectId, areas, types, existing: [] })
    expect(requirement.issues[0].errors).toContain('Unknown Area: Payments')
    expect(testCase.issues[0].errors).toContain('Unknown Test Case Type: Security')
  })

  it('rejects duplicate codes and returns only valid rows for explicit partial import', () => {
    const result = validateRequirements([{ Code: 'REQ-010', Title: 'First' }, { Code: 'REQ-010', Title: 'Duplicate' }, { Code: 'REQ-011', Title: '' }], { code: 'Code', title: 'Title' }, { projectId, areas, existing: [] })
    expect(result.values.map(item => item.code)).toEqual(['REQ-010'])
    expect(result.issues).toHaveLength(2)
  })

  it('exports readable Requirement, Test Case and Checklist definitions without technical IDs', () => {
    const requirementRows = exportRows('requirements', { areas, requirements: [{ id: 'internal', projectId, code: 'REQ-001', title: 'Login', description: '', areaId: 'area-a', status: 'approved', createdAt: '', updatedAt: '' }] })
    const caseRows = exportRows('testCases', { areas, types, testCases: [{ id: 'internal-case', projectId, code: 'TC-001', title: 'Login', areaId: 'area-a', typeId: 'type-a', priority: 'high', status: 'active', preconditions: [], steps: [{ id: 'step-id', action: 'Open', expectedResult: 'Page', sortOrder: 0 }], postconditions: [], createdAt: '', updatedAt: '' }] })
    const checklistRows = exportRows('checklists', { areas, checklists: [{ id: 'internal-checklist', projectId, title: 'Smoke', areaId: 'area-a', description: '', createdAt: '', updatedAt: '', items: [{ id: 'item-id', checklistId: 'internal-checklist', text: 'Open app', order: 0 }] }] })
    expect(requirementRows[0]).toMatchObject({ Area: 'Authentication', Code: 'REQ-001' })
    expect(caseRows[0]).toMatchObject({ Area: 'Authentication', Type: 'Functional', Steps: '1. Open' })
    expect(checklistRows[0]).toMatchObject({ Items: 'Open app' })
    expect(JSON.stringify([...requirementRows, ...caseRows, ...checklistRows])).not.toContain('internal')
  })

  it('does not mutate unrelated project definitions during validation', () => {
    const existing = [{ id: 'foreign', projectId: 'project-b', code: 'REQ-001', title: 'Foreign', description: '', status: 'draft' as const, createdAt: '', updatedAt: '' }]
    validateRequirements([{ Title: 'Current' }], { title: 'Title' }, { projectId, areas, existing })
    expect(existing).toHaveLength(1)
    expect(existing[0].projectId).toBe('project-b')
  })
})
