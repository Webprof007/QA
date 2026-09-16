// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
import { setFieldValue } from '@/test/fields'
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => setFieldValue(screen.getByLabelText(name), value)
const env = 'Environment / Середовище', build = 'Build / Збірка'
const history = () => within(screen.getByRole('region', { name: 'Retest History' }))
const details = () => within(screen.getByRole('region', { name: 'Retest details' }))
const defectPanel = () => within(screen.getByRole('complementary', { name: 'Defect panel' }))
const retest = (result: string) => { click('Retest'); change(env, 'env-voicli-staging'); change(build, 'build-voicli-26-rc2'); change('Result', result) }
describe('Defect Retest workflow', () => {
  it('supports manual Blocked → Fail → Reopen → Pass → Close with immutable numbered history', async () => {
    await renderAuthenticatedApp(); click('Defects / Дефекти'); click('Open BUG-003'); expect(screen.getByText('No retests yet.')).toBeTruthy()
    click('Retest'); expect((screen.getByRole('button', { name: 'Save Retest' }) as HTMLButtonElement).disabled).toBe(true); expect(screen.getByText('Original Actual Result / Початковий фактичний результат')).toBeTruthy(); click('Cancel Retest'); expect(screen.getByText('No retests yet.')).toBeTruthy()
    retest('Blocked'); change('Comment', 'Service unavailable'); click('Save Retest'); expect(screen.getByRole('button', { name: 'Retest' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Close Defect' })).toBeNull()
    retest('Fail'); change('Actual Result / Фактичний результат', 'Still reproduces'); change('Comment', 'Twice'); change('Evidence note', 'Browser recording'); click('Save Retest')
    expect(defectPanel().getByText('Ready for Retest', { selector: 'p' })).toBeTruthy(); click('Reopen Defect'); expect(defectPanel().getByText('Open', { selector: 'p' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Retest' })).toBeNull()
    click('Mark Ready for Retest'); retest('Pass'); change('Actual Result / Фактичний результат', 'Fix verified'); click('Save Retest'); expect(defectPanel().getByText('Ready for Retest', { selector: 'p' })).toBeTruthy(); click('Close Defect')
    expect(defectPanel().getByText('Closed', { selector: 'p' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Retest' })).toBeNull()
    expect(history().getAllByRole('button', { name: /^Retest #/ })).toHaveLength(3)
    click('Retest #2'); expect(details().getByText('Still reproduces')).toBeTruthy(); expect(details().getByText('Twice')).toBeTruthy(); expect(details().getByText('Browser recording')).toBeTruthy(); expect(details().getByText('Executed by: 42')).toBeTruthy()
    expect(details().queryByRole('textbox')).toBeNull(); expect(details().queryByRole('button', { name: /Edit|Delete/ })).toBeNull()
    click('Retest #1'); expect(details().getByText('Service unavailable')).toBeTruthy(); click('Retest #3'); expect(details().getByText('Fix verified')).toBeTruthy()
    click('Settings / Налаштування'); click('Staging'); change('Name', 'Renamed staging'); click('Save'); click('Releases & Builds'); click('2.6.0-rc2'); click('Delete Build'); click('Підтвердити видалення')
    click('Defects / Дефекти'); click('Open BUG-003'); click('Retest #3'); expect(details().getByText('Environment / Середовище: Staging')).toBeTruthy(); expect(details().getByText('Build / Збірка: 2.6.0-rc2')).toBeTruthy()
  })
  it('uses current TestCase snapshot, defaults incident IDs and leaves incident build and original execution unchanged', async () => {
    await renderAuthenticatedApp(); click('Test Runs / Запуски тестів'); click('+ Add test run'); change('Name', 'Incident run'); change(env, 'env-voicli-staging'); change(build, 'build-voicli-26-rc1'); click('Select all visible'); click('Create Run'); click('TC-001'); change('Result', 'Fail'); click('Save result'); click('Create Defect'); click('Save Defect'); click('View Defect'); click('Open Defect'); click('Mark Ready for Retest')
    click('Test Cases / Тест-кейси'); click('Open TC-001'); click('Edit test case'); change('Title', 'Updated definition'); click('Save test case')
    click('Defects / Дефекти'); click('Open BUG-004'); click('Retest'); expect((screen.getByRole('combobox', { name: env }) as HTMLSelectElement).value).toBe('env-voicli-staging'); expect((screen.getByRole('combobox', { name: build }) as HTMLSelectElement).value).toBe('build-voicli-26-rc1')
    expect(screen.getByRole('heading', { name: 'TC-001 — Updated definition' })).toBeTruthy(); change(build, 'build-voicli-26-rc2'); change('Result', 'Pass'); click('Save Retest'); click('Close Defect')
    expect(defectPanel().getByText('2.6.0-rc1', { selector: 'p' })).toBeTruthy()
    click('Test Cases / Тест-кейси'); click('Open TC-001'); click('Edit test case'); change('Title', 'Later definition'); click('Save test case')
    click('Defects / Дефекти'); click('Open BUG-004'); click('Retest #1'); expect(details().getByRole('heading', { name: 'TC-001 — Updated definition' })).toBeTruthy(); expect(details().queryByText('Later definition')).toBeNull()
    click('View Execution'); expect(screen.getByRole('heading', { name: 'Login valid user' })).toBeTruthy(); expect(screen.getByRole('combobox', { name: 'Result' })).toHaveProperty('value', 'Fail')
  })
  it('keeps Retest unavailable for closed/rejected/duplicate and scopes history and selectors to project', async () => {
    await renderAuthenticatedApp(); click('Defects / Дефекти'); click('Open BUG-003'); retest('Pass'); click('Save Retest'); click('Close Defect')
    for (const status of ['Rejected', 'Duplicate']) { click('Edit Defect'); change('Status', status); click('Save Defect'); expect(screen.queryByRole('button', { name: 'Retest' })).toBeNull(); expect(screen.getByRole('button', { name: 'Retest #1' })).toBeTruthy() }
    click('Edit Defect'); change('Status', 'Ready for Retest'); click('Save Defect'); expect(screen.getByRole('button', { name: 'Retest' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' }); fireEvent.click(await screen.findByRole('menuitemradio', { name: 'QP Notes' }))
    expect(screen.queryByRole('button', { name: 'Open BUG-003' })).toBeNull(); click('+ Add defect'); change('Title', 'QP manual'); change('Status', 'Ready for Retest'); click('Save Defect'); expect(screen.getByText('No retests yet.')).toBeTruthy(); click('Retest')
    expect(screen.queryByRole('option', { name: 'Staging' })).toBeNull(); expect(screen.queryByRole('option', { name: /2.6.0-rc2/ })).toBeNull(); expect((screen.getByRole('button', { name: 'Save Retest' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
