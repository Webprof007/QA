// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
const selectArea = (name: string) => {
  const select = screen.getByRole('combobox', { name: 'Area' }) as HTMLSelectElement
  const value = (within(select).getByRole('option', { name }) as HTMLOptionElement).value
  fireEvent.change(select, { target: { value } })
}

it('shares an Area across Checklist, Defect, Audit, Requirement, Test Case and Coverage', async () => {
  await renderAuthenticatedApp()
  click('Checklists / Чеклісти'); click('+ Add checklist')
  change('Title', 'Area ownership checklist'); change('Item 1', 'Check area ownership'); selectArea('Auth'); click('Save Checklist')
  await screen.findAllByText('Area ownership checklist')
  click('Defects / Дефекти'); click('+ Add defect'); change('Title', 'Area ownership defect')
  const areaId = (screen.getByRole('option', { name: 'Auth' }) as HTMLOptionElement).value
  change('Area', areaId); click('Save Defect')
  await screen.findAllByText('Area ownership defect')
  click('Audit / Аудит'); click('AUDIT-001'); click('+ Add audit finding'); change('Назва', 'Area ownership finding'); selectArea('Auth')
  click('Створити зауваження')
  for (const page of ['Requirements / Вимоги', 'Test Cases / Тест-кейси', 'Checklists / Чеклісти', 'Defects / Дефекти']) {
    click(page)
    expect(within(screen.getByRole('table')).getAllByText('Auth').length).toBeGreaterThan(0)
  }
  click('Coverage / Покриття')
  expect(within(screen.getByRole('table', { name: 'Requirement coverage' })).getAllByText('Auth').length).toBeGreaterThan(0)
  fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: 'QP Notes' }))
  await waitFor(() => expect(screen.queryByText('Завантаження даних проєкту…')).toBeNull())
  expect(screen.queryByText('Auth')).toBeNull()
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
