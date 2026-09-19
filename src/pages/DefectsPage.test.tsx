// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
import { setFieldValue } from '@/test/fields'
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => setFieldValue(screen.getByLabelText(name), value)
const defectPanel = () => screen.getByRole('complementary', { name: 'Defect panel' })
const executionPanel = () => screen.getByRole('complementary', { name: 'Execution panel' })
const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
async function project(name: string) { fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' }); fireEvent.click(await screen.findByRole('menuitemradio', { name })); await waitFor(() => expect(screen.queryByText('Завантаження даних проєкту…')).toBeNull()) }
async function filter(label: string, value: string) {
  const header = within(screen.getByRole('table')).getByRole('button', { name: label })
  fireEvent.keyDown(header, { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: value }))
}
async function createRun() { click('Test Runs / Запуски тестів'); click('+ Add test run'); change('Name', 'Defect run'); change('Environment / Середовище', 'env-voicli-staging'); change('Build / Збірка', 'build-voicli-26-rc1'); change('Browser', 'Chrome'); change('Device / OS', 'macOS'); click('Select all visible'); click('Create Run'); await screen.findByText('Draft'); click('TC-001') }

describe('Defects workspace', () => {
  it('searches, filters, creates and edits with Cancel, supports reopening Closed and project isolation', async () => {
    await renderAuthenticatedApp(); click('Defects / Дефекти'); expect(rows()).toHaveLength(3)
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    change('Search defects', 'bug-002'); expect(rows()).toHaveLength(1); change('Search defects', 'loses input'); expect(rows()).toHaveLength(1); click('Clear filters')
    await filter('Severity', 'Critical'); await filter('Priority', 'Highest'); await filter('Status', 'Ready for Retest'); expect(rows()).toHaveLength(1)
    await filter('Priority', 'Low'); expect(rows()).toHaveLength(0); click('Clear filters')
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    await filter('Severity', 'Major'); expect(rows()).toHaveLength(1)
    await filter('Severity', 'Major'); expect(rows()).toHaveLength(3)
    click('+ Add defect'); expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('New'); expect((screen.getByLabelText('Severity') as HTMLSelectElement).value).toBe('Major')
    change('Title', 'Discarded'); click('Cancel'); expect(rows()).toHaveLength(3)
    click('+ Add defect'); change('Title', 'Manual bug'); change('External task URL', 'https://example.com/issue/1')
    const option = within(screen.getByLabelText('Area')).getAllByRole('option')[1] as HTMLOptionElement
    change('Area', option.value); click('Save Defect'); expect(await within(defectPanel()).findByText('Created by: 42')).toBeTruthy(); expect(within(defectPanel()).getByText('BUG-004')).toBeTruthy()
    const link = within(defectPanel()).getByRole('link', { name: 'Open external task' }); expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    click('Edit Defect'); change('Title', 'Discard edit'); click('Cancel'); expect(within(defectPanel()).getByRole('heading', { name: 'Manual bug' })).toBeTruthy()
    click('Edit Defect'); change('Status', 'Closed'); click('Save Defect'); await within(defectPanel()).findByText('Closed'); click('Edit Defect'); change('Status', 'Open'); change('Title', 'Updated manual bug'); click('Save Defect'); await within(defectPanel()).findByRole('heading', { name: 'Updated manual bug' })
    expect(within(defectPanel()).getByText('BUG-004')).toBeTruthy(); expect(within(defectPanel()).getByText('Open')).toBeTruthy()
    click('Close defect'); await filter('Area', option.textContent!); expect(rows()).toHaveLength(1)
    await project('QP Notes'); expect(rows()).toHaveLength(0); click('+ Add defect'); change('Title', 'QP bug'); click('Save Defect'); expect(await within(defectPanel()).findByText('Created by: 42')).toBeTruthy(); expect(within(defectPanel()).getByText('BUG-001')).toBeTruthy()
    await project('Voicli'); expect(screen.queryByText('QP bug')).toBeNull()
  })
  it('creates from Fail, preserves context, navigates both directions and links several defects', async () => {
    await renderAuthenticatedApp(); await createRun()
    for (const result of ['Not Run', 'Pass', 'Blocked', 'Skipped']) { change('Result', result); click('Save result'); await waitFor(() => expect((screen.getByLabelText('Result') as HTMLSelectElement).value).toBe(result)); expect(screen.queryByRole('button', { name: 'Create Defect' })).toBeNull() }
    change('Result', 'Fail'); change('Actual Result / Фактичний результат', 'Unexpected redirect'); change('Comment', 'Context from tester'); change('Evidence note', 'Observed at 390px'); click('Save result'); await screen.findByRole('button', { name: 'Create Defect' }); click('Create Defect')
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Login valid user')
    for (const [label, value] of [['Environment / Середовище', 'env-voicli-staging'], ['Build / Збірка', 'build-voicli-26-rc1'], ['Browser', 'Chrome'], ['Device / OS', 'macOS'], ['Actual result / Фактичний результат', 'Unexpected redirect'], ['Description', 'Context from tester'], ['Evidence / Notes', 'Observed at 390px']]) expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe(value)
    click('Save Defect'); const returnedExecution = await screen.findByRole('complementary', { name: 'Execution panel' }); expect(await within(returnedExecution).findByText('BUG-004 — Login valid user')).toBeTruthy()
    click('View Defect'); expect(within(defectPanel()).getByText('Test Run: Defect run')).toBeTruthy(); expect(within(defectPanel()).getByText('Execution Result: Fail')).toBeTruthy()
    click('View Execution'); expect(within(executionPanel()).getByRole('heading', { name: 'Login valid user' })).toBeTruthy()
    click('Link Existing Defect'); change('Search existing defects', 'BUG-001'); click('Link BUG-001'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(within(executionPanel()).getAllByRole('button', { name: 'View Defect' })).toHaveLength(2))
    click('Next'); change('Result', 'Fail'); click('Save result'); await screen.findByRole('button', { name: 'Create Defect' }); click('Link Existing Defect'); change('Search existing defects', 'BUG-004'); click('Link BUG-004'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await within(executionPanel()).findByText('BUG-004 — Login valid user')).toBeTruthy()
    click('Test Cases / Тест-кейси'); click('Open TC-001'); click('Edit test case'); change('Title', 'Changed source title'); change('Expected / Очікуваний результат', 'Changed source expected'); click('Save test case')
    click('Defects / Дефекти'); click('Open BUG-004'); expect(within(defectPanel()).getByRole('heading', { name: 'Login valid user' })).toBeTruthy(); expect(within(defectPanel()).queryByText('Changed source expected')).toBeNull()
  })
  it('keeps the existing-defect picker scoped to project and can link a completed Fail without editing history', async () => {
    await renderAuthenticatedApp(); await project('QP Notes'); click('Defects / Дефекти'); click('+ Add defect'); change('Title', 'Foreign QP bug'); click('Save Defect'); await within(defectPanel()).findByText('Created by: 42')
    await project('Voicli'); await createRun(); change('Result', 'Fail'); click('Save result'); await screen.findByRole('button', { name: 'Create Defect' }); click('Complete Run'); click('Завершити все одно')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save result' })).toBeNull())
    click('Link Existing Defect'); expect(screen.queryByText(/Foreign QP bug/)).toBeNull(); click('Link BUG-001')
    const returnedExecution = await screen.findByRole('complementary', { name: 'Execution panel' }); expect(await within(returnedExecution).findByText(/BUG-001 — Demo/)).toBeTruthy(); expect(within(returnedExecution).queryByRole('textbox')).toBeNull()
  })
})
