// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
import { setFieldValue } from '@/test/fields'
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => setFieldValue(screen.getByLabelText(name), value)
const panel = () => screen.getByRole('complementary', { name: 'Execution panel' })
async function project(name: string) { fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' }); fireEvent.click(await screen.findByRole('menuitemradio', { name })) }
async function filter(label: string, value: string) {
  fireEvent.keyDown(within(screen.getByRole('table')).getByRole('button', { name: label }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: value }))
}
function createRun() { click('+ Add test run'); change('Name', 'Regression 2.4'); change('Environment / Середовище', 'env-voicli-staging'); change('Build / Збірка', 'build-voicli-26-rc1'); click('Select all visible'); click('Create Run') }

describe('Test Runs workspace', () => {
  it('selects cases by search and filters, validates creation, starts and executes sequentially', async () => {
    await renderAuthenticatedApp(); click('Test Runs / Запуски тестів'); click('+ Add test run'); change('Name', 'Regression 2.4'); click('Create Run')
    expect(screen.getByRole('alert').textContent).toContain('Виберіть Test Cases')
    change('Search test cases', 'wrong'); expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    click('Select all visible'); change('Search test cases', 'TC-001'); click('Select all visible'); expect(screen.getByText('2 selected')).toBeTruthy()
    click('Clear selection'); expect(screen.getByText('0 selected')).toBeTruthy(); change('Search test cases', '')
    await filter('Priority', 'Low'); expect(screen.getAllByRole('checkbox')).toHaveLength(1); await filter('Priority', 'Low')
    await filter('Area', 'Auth'); await filter('Priority', 'High'); await filter('Type', 'Functional')
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    click('Clear filters'); expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    click('Select all visible'); click('Create Run'); expect(screen.getByText('Draft')).toBeTruthy(); expect(screen.getByText('Progress: 0 / 4')).toBeTruthy()
    expect(screen.getByRole('button', { name: '← Test Runs' }).closest('.account-bar')).not.toBeNull()
    click('Start Run'); expect(screen.getByText('In Progress')).toBeTruthy(); click('TC-001')
    expect(within(panel()).getByText('Submit valid demo credentials.')).toBeTruthy()
    change('Result', 'Pass'); click('Save result'); expect(screen.getByText('Progress: 1 / 4')).toBeTruthy()
    expect(within(panel()).getByText('Executed by: 42')).toBeTruthy(); expect(within(panel()).queryByText('Executed at: —')).toBeNull()
    click('Next'); expect(within(panel()).getByRole('heading', { name: 'Wrong password' })).toBeTruthy()
    change('Result', 'Fail'); change('Actual Result / Фактичний результат', 'Unexpected success'); change('Comment', 'Investigate'); change('Evidence note', 'Observed in Chrome'); click('Save result')
    click('Next'); change('Result', 'Blocked'); change('Comment', 'Environment unavailable'); click('Save result')
    click('Next'); change('Result', 'Skipped'); click('Save result')
    expect(screen.getByText('Progress: 4 / 4')).toBeTruthy()
    const progress = within(screen.getByLabelText('Run progress'))
    for (const result of ['Pass', 'Fail', 'Blocked', 'Skipped']) expect(progress.getByText(`${result}: 1`)).toBeTruthy()
    click('Previous'); expect((screen.getByLabelText('Comment') as HTMLTextAreaElement).value).toBe('Environment unavailable')
    click('Previous'); expect((screen.getByLabelText('Evidence note') as HTMLTextAreaElement).value).toBe('Observed in Chrome')
    click('Complete Run'); expect(screen.queryByRole('button', { name: 'Save result' })).toBeNull(); expect(within(panel()).queryByRole('textbox')).toBeNull()
    expect(within(panel()).getByText('Unexpected success')).toBeTruthy()
    click('← Test Runs'); click('Regression 2.4'); click('TC-002'); expect(within(panel()).getByText('Investigate')).toBeTruthy()
    click('Test Cases / Тест-кейси'); click('Open TC-002'); expect(screen.queryByText('Unexpected success')).toBeNull()
  })
  it('warns before completing an incomplete run and retains snapshots after editing Test Cases', async () => {
    await renderAuthenticatedApp(); click('Test Runs / Запуски тестів'); createRun(); click('Complete Run')
    expect(screen.getByRole('alert').textContent).toContain('4 Test Cases залишаються Not Run')
    click('Cancel'); expect(screen.getByRole('button', { name: 'Start Run' })).toBeTruthy()
    click('Complete Run'); click('Завершити все одно'); expect(screen.queryByRole('button', { name: 'Complete Run' })).toBeNull()
    click('Test Cases / Тест-кейси'); click('Open TC-001'); click('Edit test case'); change('Title', 'New definition title'); change('Action', 'New action'); change('Expected / Очікуваний результат', 'New expected'); click('Save test case')
    click('Test Runs / Запуски тестів'); click('Regression 2.4'); click('TC-001')
    expect(within(panel()).getByRole('heading', { name: 'Login valid user' })).toBeTruthy(); expect(within(panel()).getByText('Submit valid demo credentials.')).toBeTruthy(); expect(within(panel()).queryByText('New action')).toBeNull()
    expect(within(panel()).queryByRole('combobox')).toBeNull()
  })
  it('isolates runs, selectors and plans between projects', async () => {
    await renderAuthenticatedApp(); click('Test Plan / План тестування'); click('+ Add test plan'); change('Title', 'Voicli release'); click('Save')
    click('Test Runs / Запуски тестів'); click('+ Add test run'); expect(within(screen.getByLabelText('Test Plan')).getByRole('option', { name: 'Voicli release · 1.0' })).toBeTruthy()
    change('Test Plan', (within(screen.getByLabelText('Test Plan')).getByRole('option', { name: 'Voicli release · 1.0' }) as HTMLOptionElement).value)
    change('Name', 'Voicli regression'); click('Select all visible'); click('Create Run')
    await project('QP Notes'); expect(screen.queryByText('Voicli regression')).toBeNull(); click('+ Add test run')
    expect(screen.queryByRole('checkbox')).toBeNull(); expect(within(screen.getByLabelText('Test Plan')).queryByRole('option', { name: 'Voicli release · 1.0' })).toBeNull()
    await project('Voicli'); click('Voicli regression'); expect(screen.getByText('Progress: 0 / 4')).toBeTruthy()
    expect(screen.getByText('Voicli release')).toBeTruthy()
  })
})
