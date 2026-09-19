// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TestSuitesPage } from './TestSuitesPage'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
import { createTestSuitesMockData } from '@/data/testSuitesMockData'
import { createTestRun } from '@/lib/testRuns'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
const members = () => within(screen.getByRole('table', { name: 'Suite members' })).getAllByRole('row').slice(1).map(row => row.textContent)
const open = async () => { await renderAuthenticatedApp(); click('Test Suites / Набори тестів') }
describe('General Test Suites UI', () => {
  it('creates, stages picker selection, reorders, edits and cancels without editing central cases', async () => {
    await open(); click('+ Add test suite'); change('Name', 'Release checks'); change('Description', 'Description')
    click('Select Test Cases'); click('Select all visible'); click('Clear selection')
    fireEvent.click(screen.getByRole('checkbox', { name: 'TC-001 Login valid user' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'TC-002 Wrong password' }))
    click('Apply selection'); click('Move TC-002 up'); click('Save Suite')
    await waitFor(() => expect(members()[0]).toContain('TC-002'))
    click('Edit Suite'); change('Name', 'Discard'); click('Remove TC-001'); click('Cancel')
    expect(members()).toHaveLength(2); expect(screen.queryByText('Discard')).toBeNull()
    click('Edit Suite'); change('Name', 'Renamed'); change('Description', 'Updated description'); click('Move TC-002 down'); click('Remove TC-002'); click('Save Suite')
    await waitFor(() => expect(members()).toHaveLength(1)); expect(members()[0]).toContain('TC-001'); expect(screen.getByText('Updated description')).toBeTruthy()
    click('Close suite'); change('Search test suites', 'ts-003'); expect(screen.getByText('Renamed')).toBeTruthy(); expect(screen.queryByText('Regression')).toBeNull()
    change('Search test suites', 'AUTHENTICATION'); expect(screen.getByText('Authentication')).toBeTruthy()
    click('Test Cases / Тест-кейси'); expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(5)
  })
  it('preselects suite cases, creates ordinary Run, navigates history and retains deleted suite context', async () => {
    await open(); click('Open TS-001'); click('Create Test Run')
    expect(screen.getByRole('checkbox', { name: 'Select TC-001 Login valid user' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('checkbox', { name: 'Select TC-004 Navigation link' }).getAttribute('aria-checked')).toBe('true')
    change('Name', 'Regression 2.6'); click('Create Run')
    await screen.findByText('Draft', { selector: 'span' })
    expect(screen.getByLabelText('Source Suite').textContent).toContain('TS-001 — Regression')
    expect(screen.getByLabelText('Run progress').textContent).toContain('Progress: 0 / 3')
    const codes = [...screen.getByRole('table').querySelectorAll<HTMLButtonElement>('.tc-open')].map(button => button.textContent)
    expect(codes).toEqual(['TC-001', 'TC-004', 'TC-002'])
    click('View Suite'); expect(within(screen.getByRole('region', { name: 'Source test runs' })).getByRole('button', { name: 'Regression 2.6' })).toBeTruthy()
    click('Edit Suite'); change('Name', 'Changed suite'); click('Remove TC-004'); click('Save Suite')
    await waitFor(() => expect(screen.getAllByText('Changed suite')).not.toHaveLength(0))
    click('Regression 2.6'); expect(screen.getByLabelText('Source Suite').textContent).toContain('TS-001 — Regression'); expect(screen.getByRole('button', { name: 'TC-004' })).toBeTruthy()
    click('View Suite'); click('Delete Suite'); click('Cancel'); expect(screen.getByRole('button', { name: 'Open TS-001' })).toBeTruthy()
    click('Delete Suite'); click('Delete Test Suite'); await waitFor(() => expect(screen.queryByRole('button', { name: 'Open TS-001' })).toBeNull()); expect(screen.getByRole('button', { name: 'Open TS-002' })).toBeTruthy()
    click('Test Runs / Запуски тестів'); click('Regression 2.6'); expect(screen.getByLabelText('Source Suite').textContent).toContain('TS-001 — Regression'); expect(screen.queryByRole('button', { name: 'View Suite' })).toBeNull()
    click('TC-004'); expect(screen.getByRole('complementary', { name: 'Execution panel' })).toBeTruthy()
  })
  it('isolates suites and picker by current project and keeps unsaved selection out of state', async () => {
    await open(); click('Open TS-001'); click('Edit Suite'); click('Select Test Cases'); click('Clear selection'); click('Cancel'); expect(members()).toHaveLength(3); click('Cancel')
    fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' }); fireEvent.click(await screen.findByRole('menuitemradio', { name: 'QP Notes' }))
    await waitFor(() => expect(screen.queryByText('Завантаження даних проєкту…')).toBeNull())
    expect(screen.queryByRole('button', { name: 'Open TS-001' })).toBeNull()
    click('+ Add test suite'); change('Name', 'QP suite'); click('Select Test Cases'); expect(screen.queryByRole('checkbox', { name: /TC-001/ })).toBeNull(); click('Cancel'); click('Save Suite')
    await waitFor(() => expect(screen.getByText('TS-001', { selector: 'p' })).toBeTruthy()); expect(screen.queryByText('Regression')).toBeNull()
  })
  it('keeps Suite state unchanged when the backend rejects a save', async () => {
    const data = structuredClone(initialTestCasesByProject.voicli)
    render(<TestSuitesPage projectId="voicli" data={{ suites: [], links: [] }} cases={data.items} areas={data.areas} types={data.types} runs={{ runs: [], executions: [] }} onSave={async () => { throw new Error('Suite rejected') }} onDelete={async () => undefined} onCreateRun={vi.fn()} onOpenRun={vi.fn()} />)
    click('+ Add test suite'); change('Name', 'Rejected Suite'); click('Save Suite')
    expect((await screen.findByRole('alert')).textContent).toContain('Suite rejected')
    expect(screen.queryByText('Rejected Suite', { selector: 'td' })).toBeNull()
  })
  it('handles missing live cases and isolates source run history even with mixed project data', () => {
    const data = structuredClone(initialTestCasesByProject.voicli), suites = createTestSuitesMockData(data.items)
    const run = createTestRun('voicli', { name: 'Visible run', browser: '', deviceOrOs: '', notes: '', sourceTestSuiteId: suites.suites[0].id, testCaseIds: [data.items[0].id] }, data.items, [], data.areas, data.types, suites.suites)
    const onOpenRun = vi.fn()
    render(<TestSuitesPage projectId="voicli" initialId={suites.suites[0].id} data={{ ...suites, suites: [...suites.suites, { ...suites.suites[0], id: 'foreign', projectId: 'qp-notes', name: 'Foreign suite' }] }} cases={data.items.slice(1)} areas={data.areas} types={data.types} runs={{ executions: run.executions, runs: [...run.runs, { ...run.runs[0], id: 'foreign-run', projectId: 'qp-notes', name: 'Foreign run' }, { ...run.runs[0], id: 'other-suite-run', sourceTestSuiteId: suites.suites[1].id, name: 'Other suite run' }] }} onSave={async () => suites.suites[0]} onDelete={async () => undefined} onCreateRun={vi.fn()} onOpenRun={onOpenRun} />)
    expect(screen.getByRole('status').textContent).toContain('Missing test case')
    expect((screen.getByRole('button', { name: 'Create Test Run' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText('Foreign suite')).toBeNull(); expect(screen.queryByText('Foreign run')).toBeNull(); expect(screen.queryByText('Other suite run')).toBeNull()
    click('Visible run'); expect(onOpenRun).toHaveBeenCalledWith(run.runs[0].id)
  })

})
