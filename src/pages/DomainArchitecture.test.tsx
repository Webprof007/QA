// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
import { createProjectAreaData } from '@/data/projectAreaMockData'
import { AuditPage } from './AuditPage'
import { createAuditEvidenceUrls } from '@/lib/auditEvidenceUrls'

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
const selectArea = (name: string) => { fireEvent.click(screen.getByRole('combobox', { name: 'Area' })); click(name) }

it('shares an Area across Checklist, Defect, Audit, Requirement, Test Case and Coverage', async () => {
  await renderAuthenticatedApp()
  click('Checklists'); click('New Checklist')
  change('Title', 'Area ownership checklist'); change('Item 1', 'Check area ownership'); selectArea('Auth'); click('Save Checklist')
  click('Defects'); click('New Defect'); change('Title', 'Area ownership defect')
  const areaId = (screen.getByRole('option', { name: 'Auth' }) as HTMLOptionElement).value
  change('Area', areaId); click('Save Defect')
  click('Audit'); click('Додати зауваження'); change('Назва', 'Area ownership finding'); selectArea('Auth')
  // Rename through Audit; every other module keeps the same Area ID.
  fireEvent.click(screen.getByRole('combobox', { name: 'Area' }))
  click('Видалити Area Auth')
  expect(screen.getByRole('alert')).toBeTruthy()
  click('Перейменувати Area Auth'); change('Нова назва', 'Shared Authentication'); click('Зберегти назву')
  fireEvent.keyDown(screen.getByLabelText('Додати Area'), { key: 'Escape' })
  click('Створити зауваження')
  for (const page of ['Requirements', 'Test Cases', 'Checklists', 'Defects']) {
    click(page)
    expect(within(screen.getByRole('table')).getAllByText('Shared Authentication').length).toBeGreaterThan(0)
  }
  click('Coverage')
  expect(within(screen.getByRole('table', { name: 'Requirement coverage' })).getAllByText('Shared Authentication').length).toBeGreaterThan(0)
  fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: 'QP Notes' }))
  expect(screen.queryByText('Shared Authentication')).toBeNull()
})

it('Audit scopes reads itself even when its parent supplies mixed project data', () => {
  const seed = createProjectAreaData()
  const other = { ...seed.audit.voicli[0], projectId: 'other', title: 'Foreign finding' }
  render(<AuditPage projectId="voicli" items={[other, ...seed.audit.voicli]} auditAreas={seed.areas} auditTypes={[]} onAreasChange={vi.fn()} onTypesChange={vi.fn()} onChange={vi.fn()} evidenceUrls={createAuditEvidenceUrls()} />)
  expect(screen.queryByText('Foreign finding')).toBeNull()
  expect(document.querySelectorAll('.audit-compact-row')).toHaveLength(4)
  fireEvent.click(document.querySelector('.audit-compact-row')!)
  expect(screen.getByRole('complementary').textContent).not.toContain('Foreign finding')
})
