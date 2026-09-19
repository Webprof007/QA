// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
import { setFieldValue } from '@/test/fields'
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
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
    retest('Blocked'); change('Comment', 'Service unavailable'); click('Save Retest'); await screen.findByRole('button', { name: 'Retest #1' }); expect(screen.getByRole('button', { name: 'Retest' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Close Defect' })).toBeNull()
    retest('Fail'); change('Actual Result / Фактичний результат', 'Still reproduces'); change('Comment', 'Twice'); change('Evidence note', 'Browser recording'); click('Save Retest')
    await screen.findByRole('button', { name: 'Retest #2' }); expect(defectPanel().getByText('Ready for Retest / Готовий до повторного тестування')).toBeTruthy(); click('Reopen Defect'); expect(await defectPanel().findByText('Open / Відкритий')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Retest' })).toBeNull()
    click(/Mark Ready for Retest BUG-003/); await defectPanel().findByText('Ready for Retest / Готовий до повторного тестування'); retest('Pass'); change('Actual Result / Фактичний результат', 'Fix verified'); click('Save Retest'); await screen.findByRole('button', { name: 'Retest #3' }); expect(defectPanel().getByText('Ready for Retest / Готовий до повторного тестування')).toBeTruthy(); click('Close Defect')
    expect(await defectPanel().findByText('Closed / Закритий')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Retest' })).toBeNull()
    expect(history().getAllByRole('button', { name: /^Retest #/ })).toHaveLength(3)
    click('Retest #2'); expect(details().getByText('Still reproduces')).toBeTruthy(); expect(details().getByText('Twice')).toBeTruthy(); expect(details().getByText('Browser recording')).toBeTruthy(); expect(details().getByText('Executed by: 42')).toBeTruthy()
    expect(details().queryByRole('textbox')).toBeNull(); expect(details().queryByRole('button', { name: /Edit|Delete/ })).toBeNull()
    click('Retest #1'); expect(details().getByText('Service unavailable')).toBeTruthy(); click('Retest #3'); expect(details().getByText('Fix verified')).toBeTruthy()
    click('Settings / Налаштування'); click('Staging'); change('Name', 'Renamed staging'); click('Save'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); click('2.6.0-rc2'); click('Delete Build'); click('Підтвердити видалення'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    click('Defects / Дефекти'); click('Open BUG-003'); click('Retest #3'); expect(details().getByText('Environment / Середовище: Staging')).toBeTruthy(); expect(details().getByText('Build / Збірка: 2.6.0-rc2')).toBeTruthy()
  })
  it('uses current TestCase snapshot, defaults incident IDs and leaves incident build and original execution unchanged', async () => {
    await renderAuthenticatedApp(); click('Test Runs / Запуски тестів'); click('+ Add test run'); change('Name', 'Incident run'); change(env, 'env-voicli-staging'); change(build, 'build-voicli-26-rc1'); click('Select all visible'); click('Create Run'); await screen.findByText('Draft'); click('TC-001'); change('Result', 'Fail'); click('Save result'); await screen.findByRole('button', { name: 'Create Defect' }); click('Create Defect'); click('Save Defect'); const viewDefect = await screen.findByRole('button', { name: 'View Defect' }); fireEvent.click(viewDefect); await screen.findByRole('complementary', { name: 'Defect panel' }); click(/Open Defect BUG-004/); await defectPanel().findByText('Open / Відкритий'); click(/Mark Ready for Retest BUG-004/); await defectPanel().findByText('Ready for Retest / Готовий до повторного тестування')
    click('Test Cases / Тест-кейси'); click('Open TC-001'); click('Edit test case'); change('Title', 'Updated definition'); click('Save test case')
    await screen.findByRole('heading', { name: 'Updated definition' })
    click('Defects / Дефекти'); click('Open BUG-004'); click('Retest'); expect((screen.getByRole('combobox', { name: env }) as HTMLSelectElement).value).toBe('env-voicli-staging'); expect((screen.getByRole('combobox', { name: build }) as HTMLSelectElement).value).toBe('build-voicli-26-rc1')
    expect(screen.getByRole('heading', { name: 'TC-001 — Updated definition' })).toBeTruthy(); change(build, 'build-voicli-26-rc2'); change('Result', 'Pass'); click('Save Retest'); await screen.findByRole('button', { name: 'Retest #1' }); click('Close Defect'); await defectPanel().findByText('Closed / Закритий')
    expect(defectPanel().getByText('2.6.0-rc1', { selector: 'p' })).toBeTruthy()
    click('Test Cases / Тест-кейси'); click('Open TC-001'); click('Edit test case'); change('Title', 'Later definition'); click('Save test case')
    await screen.findByRole('heading', { name: 'Later definition' })
    click('Defects / Дефекти'); click('Open BUG-004'); click('Retest #1'); expect(details().getByRole('heading', { name: 'TC-001 — Updated definition' })).toBeTruthy(); expect(details().queryByText('Later definition')).toBeNull()
    click('View Execution'); expect(screen.getByRole('heading', { name: 'Login valid user' })).toBeTruthy(); expect(screen.getByRole('combobox', { name: 'Result' })).toHaveProperty('value', 'Fail')
  })
  it('keeps Retest unavailable for closed/rejected/duplicate and scopes history and selectors to project', async () => {
    await renderAuthenticatedApp(); click('Defects / Дефекти'); click('Open BUG-003'); retest('Pass'); click('Save Retest'); await screen.findByRole('button', { name: 'Retest #1' }); click('Close Defect'); await defectPanel().findByText('Closed / Закритий')
    for (const status of ['Rejected', 'Duplicate']) { click('Edit Defect'); change('Status', status); click('Save Defect'); await defectPanel().findByText(new RegExp(`^${status} /`)); expect(screen.queryByRole('button', { name: 'Retest' })).toBeNull(); expect(screen.getByRole('button', { name: 'Retest #1' })).toBeTruthy() }
    click('Edit Defect'); change('Status', 'Ready for Retest'); click('Save Defect'); expect(await screen.findByRole('button', { name: 'Retest' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' }); fireEvent.click(await screen.findByRole('menuitemradio', { name: 'QP Notes' })); await waitFor(() => expect(screen.queryByText('Завантаження даних проєкту…')).toBeNull())
    expect(screen.queryByRole('button', { name: 'Open BUG-003' })).toBeNull(); click('+ Add defect'); change('Title', 'QP manual'); change('Status', 'Ready for Retest'); click('Save Defect'); await screen.findByText('Created by: 42'); expect(screen.getByText('No retests yet.')).toBeTruthy(); click('Retest')
    expect(screen.queryByRole('option', { name: 'Staging' })).toBeNull(); expect(screen.queryByRole('option', { name: /2.6.0-rc2/ })).toBeNull(); expect((screen.getByRole('button', { name: 'Save Retest' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
