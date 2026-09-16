import * as XLSX from 'xlsx'
import type { Checklist, ProjectArea, Requirement, TestCase, TestCaseDictionaryValue, TestStep } from '@/types'

export type ImportKind = 'requirements' | 'testCases' | 'checklists'
export type ImportFormat = 'csv' | 'xlsx'
export type ImportField = { key: string; label: string; required?: boolean }
export type ImportRow = Record<string, string>
export type ImportIssue = { row: number; errors: string[]; warnings: string[] }
export type ImportValidation<T> = { values: T[]; issues: ImportIssue[]; total: number }

export const importFields: Record<ImportKind, ImportField[]> = {
  requirements: [
    { key: 'code', label: 'Code' }, { key: 'title', label: 'Title', required: true }, { key: 'description', label: 'Description' },
    { key: 'area', label: 'Area' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }, { key: 'source', label: 'Source' }, { key: 'notes', label: 'Notes' },
  ],
  testCases: [
    { key: 'code', label: 'Code' }, { key: 'title', label: 'Title', required: true }, { key: 'area', label: 'Area' }, { key: 'type', label: 'Type' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' },
    { key: 'preconditions', label: 'Preconditions' }, { key: 'steps', label: 'Steps' }, { key: 'expectedResult', label: 'Expected Result' }, { key: 'postconditions', label: 'Postconditions' }, { key: 'notes', label: 'Notes' },
  ],
  checklists: [{ key: 'title', label: 'Title', required: true }, { key: 'area', label: 'Area' }, { key: 'description', label: 'Description' }, { key: 'items', label: 'Items', required: true }],
}

const aliases: Record<string, string[]> = {
  code: ['code', 'id', 'код'], title: ['title', 'name', 'test title', 'назва', 'название'], description: ['description', 'опис', 'описание'],
  area: ['area', 'область', 'область функціоналу'], priority: ['priority', 'пріоритет', 'приоритет'], status: ['status', 'стан', 'статус'],
  source: ['source', 'джерело', 'источник'], notes: ['notes', 'note', 'нотатки', 'заметки'], type: ['type', 'тип'],
  preconditions: ['preconditions', 'передумови', 'предусловия'], steps: ['steps', 'кроки', 'шаги'], expectedResult: ['expected result', 'expected', 'очікуваний результат', 'ожидаемый результат'],
  postconditions: ['postconditions', 'післяумови', 'постусловия'], items: ['items', 'checklist items', 'пункти', 'элементы'],
}

const normalize = (value: string) => value.trim().toLocaleLowerCase()
const clean = (value: unknown) => String(value ?? '').trim()
const lines = (value: string) => value.split(/\r?\n/).map(item => item.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean)

export function autoMapHeaders(kind: ImportKind, headers: string[]) {
  const normalized = headers.map(normalize)
  return Object.fromEntries(importFields[kind].map(field => [field.key, headers[normalized.findIndex(header => aliases[field.key].includes(header))] ?? ''])) as Record<string, string>
}

export async function readImportFile(file: File): Promise<{ headers: string[]; rows: ImportRow[] }> {
  if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error('Choose a CSV or XLSX file.')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', codepage: 65001 })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('The file has no worksheet.')
  const grid = XLSX.utils.sheet_to_json<unknown[][]>(sheet, { header: 1, defval: '', raw: false })
  const headers = (grid[0] ?? []).map(clean).filter(Boolean)
  if (!headers.length) throw new Error('The first row must contain column headers.')
  const rows = grid.slice(1).filter(row => row.some(value => clean(value))).map(row => Object.fromEntries(headers.map((header, index) => [header, clean(row[index])])))
  return { headers, rows }
}

function mapped(row: ImportRow, mapping: Record<string, string>, field: string) { return clean(row[mapping[field]]) }
function lookup(values: { id: string; projectId: string; name: string }[], projectId: string, name: string) { return values.find(value => value.projectId === projectId && normalize(value.name) === normalize(name)) }
function generatedCode(prefix: string, existing: string[], allocated: Set<string>) {
  let number = Math.max(0, ...existing.map(code => new RegExp(`^${prefix}-(\\d+)$`, 'i').exec(code)?.[1] ? Number(new RegExp(`^${prefix}-(\\d+)$`, 'i').exec(code)?.[1]) : 0)) + 1
  let code = `${prefix}-${String(number).padStart(3, '0')}`
  while (allocated.has(normalize(code))) { number += 1; code = `${prefix}-${String(number).padStart(3, '0')}` }
  return code
}

function validateCommon(row: ImportRow, mapping: Record<string, string>, areas: ProjectArea[], projectId: string, issues: string[]) {
  const areaName = mapped(row, mapping, 'area')
  const area = areaName ? lookup(areas, projectId, areaName) : undefined
  if (areaName && !area) issues.push(`Unknown Area: ${areaName}`)
  return area
}

export function validateRequirements(rows: ImportRow[], mapping: Record<string, string>, context: { projectId: string; areas: ProjectArea[]; existing: Requirement[] }): ImportValidation<Requirement> {
  const values: Requirement[] = [], issues: ImportIssue[] = [], codes = new Set(context.existing.filter(item => item.projectId === context.projectId).map(item => normalize(item.code))), sourceRows = new Set<string>()
  for (const [index, row] of rows.entries()) {
    const errors: string[] = [], warnings: string[] = [], title = mapped(row, mapping, 'title'), area = validateCommon(row, mapping, context.areas, context.projectId, errors)
    const priority = normalize(mapped(row, mapping, 'priority')), status = normalize(mapped(row, mapping, 'status'))
    const signature = JSON.stringify(importFields.requirements.map(field => normalize(mapped(row, mapping, field.key))))
    if (sourceRows.has(signature)) errors.push('Duplicate row in file.')
    sourceRows.add(signature)
    if (!title) errors.push('Title is required.')
    if (priority && !['critical', 'high', 'medium', 'low'].includes(priority)) errors.push(`Invalid Priority: ${mapped(row, mapping, 'priority')}`)
    if (status && !['draft', 'approved', 'deprecated'].includes(status)) errors.push(`Invalid Status: ${mapped(row, mapping, 'status')}`)
    let code = mapped(row, mapping, 'code')
    if (!code) code = generatedCode('REQ', [...codes], codes)
    if (codes.has(normalize(code))) errors.push(`Duplicate Code: ${code}`)
    if (errors.length) { issues.push({ row: index + 2, errors, warnings }); continue }
    codes.add(normalize(code)); const now = new Date().toISOString()
    values.push({ id: crypto.randomUUID(), projectId: context.projectId, code, title, description: mapped(row, mapping, 'description'), areaId: area?.id, priority: priority as Requirement['priority'], status: (status || 'draft') as Requirement['status'], source: mapped(row, mapping, 'source'), notes: mapped(row, mapping, 'notes'), createdAt: now, updatedAt: now })
  }
  return { values, issues, total: rows.length }
}

export function validateTestCases(rows: ImportRow[], mapping: Record<string, string>, context: { projectId: string; areas: ProjectArea[]; types: TestCaseDictionaryValue[]; existing: TestCase[] }): ImportValidation<TestCase> {
  const values: TestCase[] = [], issues: ImportIssue[] = [], codes = new Set(context.existing.filter(item => item.projectId === context.projectId).map(item => normalize(item.code))), sourceRows = new Set<string>()
  for (const [index, row] of rows.entries()) {
    const errors: string[] = [], warnings: string[] = [], title = mapped(row, mapping, 'title'), area = validateCommon(row, mapping, context.areas, context.projectId, errors)
    const typeName = mapped(row, mapping, 'type'), type = typeName ? lookup(context.types, context.projectId, typeName) : undefined
    const priority = normalize(mapped(row, mapping, 'priority')), status = normalize(mapped(row, mapping, 'status'))
    const signature = JSON.stringify(importFields.testCases.map(field => normalize(mapped(row, mapping, field.key))))
    if (sourceRows.has(signature)) errors.push('Duplicate row in file.')
    sourceRows.add(signature)
    if (!title) errors.push('Title is required.')
    if (typeName && !type) errors.push(`Unknown Test Case Type: ${typeName}`)
    if (priority && !['critical', 'high', 'medium', 'low'].includes(priority)) errors.push(`Invalid Priority: ${mapped(row, mapping, 'priority')}`)
    if (status && !['active', 'draft', 'deprecated'].includes(status)) errors.push(`Invalid Status: ${mapped(row, mapping, 'status')}`)
    let code = mapped(row, mapping, 'code')
    if (!code) code = generatedCode('TC', [...codes], codes)
    if (codes.has(normalize(code))) errors.push(`Duplicate Code: ${code}`)
    const actions = lines(mapped(row, mapping, 'steps')), expected = lines(mapped(row, mapping, 'expectedResult'))
    if (actions.some((_, stepIndex) => !expected[stepIndex])) errors.push('Each Step requires an Expected Result.')
    if (!actions.length && expected.length) errors.push('Expected Result requires a Step.')
    if (errors.length) { issues.push({ row: index + 2, errors, warnings }); continue }
    codes.add(normalize(code));
    const steps: TestStep[] = actions.map((action, sortOrder) => ({ id: crypto.randomUUID(), action, expectedResult: expected[sortOrder] ?? '', sortOrder }))
    if (expected.length > actions.length) warnings.push('Extra Expected Result lines were ignored.')
    const now = new Date().toISOString()
    values.push({ id: crypto.randomUUID(), projectId: context.projectId, code, title, areaId: area?.id, typeId: type?.id, priority: (priority || 'medium') as TestCase['priority'], status: (status || 'draft') as TestCase['status'], preconditions: lines(mapped(row, mapping, 'preconditions')), steps, postconditions: lines(mapped(row, mapping, 'postconditions')), notes: mapped(row, mapping, 'notes'), createdAt: now, updatedAt: now })
    if (warnings.length) issues.push({ row: index + 2, errors, warnings })
  }
  return { values, issues, total: rows.length }
}

export function validateChecklists(rows: ImportRow[], mapping: Record<string, string>, context: { projectId: string; areas: ProjectArea[] }): ImportValidation<Checklist> {
  const values: Checklist[] = [], issues: ImportIssue[] = [], sourceRows = new Set<string>()
  for (const [index, row] of rows.entries()) {
    const errors: string[] = [], warnings: string[] = [], title = mapped(row, mapping, 'title'), area = validateCommon(row, mapping, context.areas, context.projectId, errors), itemTexts = lines(mapped(row, mapping, 'items'))
    const signature = JSON.stringify(importFields.checklists.map(field => normalize(mapped(row, mapping, field.key))))
    if (sourceRows.has(signature)) errors.push('Duplicate row in file.')
    sourceRows.add(signature)
    if (!title) errors.push('Title is required.')
    if (!itemTexts.length) errors.push('At least one Item is required.')
    if (errors.length) { issues.push({ row: index + 2, errors, warnings }); continue }
    const id = crypto.randomUUID(), now = new Date().toISOString()
    values.push({ id, projectId: context.projectId, title, areaId: area?.id, description: mapped(row, mapping, 'description'), items: itemTexts.map((text, order) => ({ id: crypto.randomUUID(), checklistId: id, text, order })), createdAt: now, updatedAt: now })
  }
  return { values, issues, total: rows.length }
}

export function exportRows(kind: ImportKind, context: { requirements?: Requirement[]; testCases?: TestCase[]; checklists?: Checklist[]; areas: ProjectArea[]; types?: TestCaseDictionaryValue[] }) {
  const area = (id?: string) => context.areas.find(item => item.id === id)?.name ?? ''
  if (kind === 'requirements') return (context.requirements ?? []).map(item => ({ Code: item.code, Title: item.title, Description: item.description, Area: area(item.areaId), Priority: item.priority ?? '', Status: item.status, Source: item.source ?? '', Notes: item.notes ?? '' }))
  if (kind === 'testCases') return (context.testCases ?? []).map(item => ({ Code: item.code, Title: item.title, Area: area(item.areaId), Type: context.types?.find(type => type.id === item.typeId)?.name ?? '', Priority: item.priority, Status: item.status, Preconditions: item.preconditions.join('\n'), Steps: [...item.steps].sort((a, b) => a.sortOrder - b.sortOrder).map((step, index) => `${index + 1}. ${step.action}`).join('\n'), 'Expected Result': [...item.steps].sort((a, b) => a.sortOrder - b.sortOrder).map((step, index) => `${index + 1}. ${step.expectedResult}`).join('\n'), Postconditions: (item.postconditions ?? []).join('\n'), Notes: item.notes ?? '' }))
  return (context.checklists ?? []).map(item => ({ Title: item.title, Area: area(item.areaId), Description: item.description, Items: [...item.items].sort((a, b) => a.order - b.order).map(entry => entry.text).join('\n') }))
}

export function downloadExport(kind: ImportKind, format: ImportFormat, rows: Record<string, string>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, kind)
  const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const output = XLSX.write(workbook, { bookType: format, type: 'array' })
  const url = URL.createObjectURL(new Blob([output], { type: mime })); const link = document.createElement('a')
  link.href = url; link.download = `${kind}.${format}`; link.click(); URL.revokeObjectURL(url)
}
