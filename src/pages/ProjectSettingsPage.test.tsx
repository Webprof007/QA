// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const env = 'Environment / Середовище', build = 'Build / Збірка'
const selectContext = () => { change(env, 'env-voicli-staging'); change(build, 'build-voicli-26-rc1') }
const metadataText = () => document.querySelector('.run-metadata')!.textContent
const saveSetting = async () => { click('Save'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()) }
async function project(name: string) { fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' }); fireEvent.click(await screen.findByRole('menuitemradio', { name })); await waitFor(() => expect(screen.queryByText('Завантаження даних проєкту…')).toBeNull()) }
describe('Project Settings and shared context UI', () => {
  it('creates/edits environment, cancels drafts, and excludes inactive environments from all new selectors', async () => {
    await renderAuthenticatedApp(); click('Settings / Налаштування'); click('+ Add environment'); change('Name', 'QA'); change('Base URL', 'https://qa.example.com'); change('Description', 'Shared test setup'); await saveSetting()
    click('QA'); change('Name', 'Discard'); click('Cancel'); expect(screen.queryByText('Discard')).toBeNull()
    click('QA'); change('Name', 'Internal QA'); fireEvent.click(screen.getByRole('checkbox', { name: 'Active' })); await saveSetting()
    expect(screen.getByText('Inactive')).toBeTruthy()
    click('Test Runs / Запуски тестів'); click('+ Add test run'); expect(screen.getByRole('combobox', { name: env })).toBeTruthy(); expect(screen.queryByRole('option', { name: 'Internal QA' })).toBeNull(); expect(screen.getByRole('option', { name: 'Staging' })).toBeTruthy()
    click('Smoke / Смоук-тестування'); click('Open SMK-001'); click('Run Smoke'); expect(screen.queryByRole('option', { name: 'Internal QA' })).toBeNull(); expect(screen.getByRole('combobox', { name: build })).toBeTruthy()
    click('Defects / Дефекти'); click('+ Add defect'); expect(screen.queryByRole('option', { name: 'Internal QA' })).toBeNull(); expect(screen.getByRole('option', { name: 'Staging' })).toBeTruthy()
  })
  it('creates/releases builds, preserves archived relationships and isolates setup and selectors by project', async () => {
    await renderAuthenticatedApp(); click('Settings / Налаштування'); click('+ Add release'); change('Name', 'September'); change('Status', 'Active'); change('Start date', '2026-09-15'); await saveSetting()
    click('+ Add build'); change('Version', 'September rc'); const release = screen.getByRole('option', { name: 'September' }) as HTMLOptionElement; change('Release', release.value); await saveSetting()
    click('September'); change('Status', 'Archived'); await saveSetting(); click('+ Add build'); expect(screen.queryByRole('option', { name: 'September' })).toBeNull(); change('Version', 'Standalone'); await saveSetting()
    click('September rc'); expect(screen.getByRole('option', { name: 'September · Archived' })).toBeTruthy(); click('Cancel')
    await project('QP Notes'); expect(screen.queryByRole('button', { name: 'Staging' })).toBeNull(); expect(screen.queryByRole('button', { name: 'September rc' })).toBeNull()
    click('+ Add build'); expect(within(screen.getByRole('combobox', { name: 'Release' })).getAllByRole('option')).toHaveLength(1); click('Cancel')
    click('Test Runs / Запуски тестів'); click('+ Add test run'); expect(within(screen.getByRole('combobox', { name: env })).getAllByRole('option')).toHaveLength(1); expect(within(screen.getByRole('combobox', { name: build })).getAllByRole('option')).toHaveLength(1)
    click('Defects / Дефекти'); click('+ Add defect'); expect(screen.queryByRole('option', { name: 'Staging' })).toBeNull(); expect(screen.queryByRole('option', { name: /2.6.0-rc1/ })).toBeNull()
  })
  it('keeps Run and Defect incident snapshots through shared renames/deletions and supports explicit changes', async () => {
    await renderAuthenticatedApp(); click('Test Runs / Запуски тестів'); click('+ Add test run'); change('Name', 'Historical context'); selectContext(); click('Select all visible'); click('Create Run'); await screen.findByText('Draft'); click('TC-001'); change('Result', 'Fail'); click('Save result'); await screen.findByText('Progress: 1 / 4'); click('Create Defect'); click('Save Defect'); fireEvent.click(await screen.findByRole('button', { name: 'View Defect' }))
    expect(within(screen.getByRole('complementary', { name: 'Defect panel' })).getByText('Staging')).toBeTruthy()
    click('Settings / Налаштування'); click('Staging'); change('Name', 'New staging'); await saveSetting(); click('2.6.0-rc1'); change('Version', 'New version'); await saveSetting()
    click('Test Runs / Запуски тестів'); click('Historical context'); expect(metadataText()).toContain('Staging'); expect(metadataText()).toContain('2.6.0-rc1'); expect(metadataText()).not.toContain('New staging')
    click('Defects / Дефекти'); click('Open BUG-004'); click('Edit Defect'); change('Title', 'Only title changed'); click('Save Defect'); await within(screen.getByRole('complementary', { name: 'Defect panel' })).findByRole('heading', { name: 'Only title changed' }); expect(within(screen.getByRole('complementary', { name: 'Defect panel' })).getByText('Staging')).toBeTruthy()
    click('Edit Defect'); change(env, 'env-voicli-production'); change(build, 'build-voicli-25'); click('Save Defect'); await within(screen.getByRole('complementary', { name: 'Defect panel' })).findByText('Production')
    click('Settings / Налаштування'); click('New staging'); click('Delete Environment'); click('Підтвердити видалення'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); click('New version'); click('Delete Build'); click('Підтвердити видалення'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    click('Test Runs / Запуски тестів'); click('Historical context'); expect(metadataText()).toContain('Staging'); expect(metadataText()).toContain('2.6.0-rc1'); click('Complete Run'); click('Завершити все одно'); await waitFor(() => expect(screen.queryByRole('button', { name: 'Start Run' })).toBeNull())
    click('TC-001'); expect(screen.queryByRole('combobox', { name: 'Result' })).toBeNull()
  })
  it('Smoke history renders shared snapshots even after environment/build deletion', async () => {
    await renderAuthenticatedApp(); click('Open SMK-001'); click('Run Smoke'); selectContext(); click('Create Draft'); await screen.findByText('Draft'); click('Complete Run'); click('Завершити все одно'); await waitFor(() => expect(screen.queryByRole('button', { name: 'Start Run' })).toBeNull())
    click('Settings / Налаштування'); click('Staging'); click('Delete Environment'); click('Підтвердити видалення'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); click('2.6.0-rc1'); click('Delete Build'); click('Підтвердити видалення'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    click('Smoke / Смоук-тестування'); click('Open SMK-001'); click('Run #1'); expect(metadataText()).toContain('Staging'); expect(metadataText()).toContain('2.6.0-rc1'); click('TC-001'); expect(screen.queryByRole('combobox', { name: 'Result' })).toBeNull()
  })
})
