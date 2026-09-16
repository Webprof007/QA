// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
import { createProjectAreaData } from '@/data/projectAreaMockData'
import { AuditFindingsPage } from './AuditFindingsPage'
import { initialAudits } from '@/data/auditMockData'
import { EvidenceContext } from '@/components/evidence/evidenceContext'
import { createEvidenceUrls } from '@/lib/evidenceUrls'
import { createSmokeMockData } from '@/data/smokeMockData'

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
const selectArea = (name: string) => { fireEvent.click(screen.getByRole('combobox', { name: 'Area' })); click(name) }

it('shares an Area across Checklist, Defect, Audit, Requirement, Test Case and Coverage', async () => {
  await renderAuthenticatedApp()
  click('Checklists / Чеклісти'); click('+ Add checklist')
  change('Title', 'Area ownership checklist'); change('Item 1', 'Check area ownership'); selectArea('Auth'); click('Save Checklist')
  click('Defects / Дефекти'); click('+ Add defect'); change('Title', 'Area ownership defect')
  const areaId = (screen.getByRole('option', { name: 'Auth' }) as HTMLOptionElement).value
  change('Area', areaId); click('Save Defect')
  click('Audit / Аудит'); click('AUDIT-001'); click('+ Add audit finding'); change('Назва', 'Area ownership finding'); selectArea('Auth')
  // Rename through Audit; every other module keeps the same Area ID.
  fireEvent.click(screen.getByRole('combobox', { name: 'Area' }))
  click('Видалити Area Auth')
  expect(screen.getByRole('alert')).toBeTruthy()
  click('Перейменувати Area Auth'); change('Нова назва', 'Shared Authentication'); click('Зберегти назву')
  fireEvent.keyDown(screen.getByLabelText('Додати Area'), { key: 'Escape' })
  click('Створити зауваження')
  for (const page of ['Requirements / Вимоги', 'Test Cases / Тест-кейси', 'Checklists / Чеклісти', 'Defects / Дефекти']) {
    click(page)
    expect(within(screen.getByRole('table')).getAllByText('Shared Authentication').length).toBeGreaterThan(0)
  }
  click('Coverage / Покриття')
  expect(within(screen.getByRole('table', { name: 'Requirement coverage' })).getAllByText('Shared Authentication').length).toBeGreaterThan(0)
  fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: 'QP Notes' }))
  expect(screen.queryByText('Shared Authentication')).toBeNull()
})

it('Audit scopes reads itself even when its parent supplies mixed project data', () => {
  const seed = createProjectAreaData()
  const other = { ...seed.audit.voicli[0], projectId: 'other', title: 'Foreign finding' }
  render(<EvidenceContext.Provider value={{ items: [], owners: { testRuns: { runs: [], executions: [] }, smoke: createSmokeMockData([]), defects: [], retests: [], audits: initialAudits, auditFindings: [other, ...seed.audit.voicli] }, urls: createEvidenceUrls(), replace: vi.fn() }}><AuditFindingsPage auditId="audit-voicli-demo" readOnly={false} projectId="voicli" items={[other, ...seed.audit.voicli]} auditAreas={seed.areas} auditTypes={[]} onAreasChange={vi.fn()} onTypesChange={vi.fn()} onDeleteItem={() => null} /></EvidenceContext.Provider>)
  expect(screen.queryByText('Foreign finding')).toBeNull()
  expect(document.querySelectorAll('.audit-compact-row')).toHaveLength(4)
  fireEvent.click(document.querySelector('.audit-compact-row')!)
  expect(screen.getByRole('complementary').textContent).not.toContain('Foreign finding')
})
