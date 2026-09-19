// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
import { setFieldValue } from '@/test/fields'

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => setFieldValue(screen.getByLabelText(name), value)

describe('Run Reports UI', () => {
  it('renders Test Run report from existing results and returns to the selected execution', async () => {
    await renderAuthenticatedApp(); click('Test Runs / Запуски тестів'); click('+ Add test run')
    change('Name', 'Report regression'); change('Environment / Середовище', 'env-voicli-staging'); change('Build / Збірка', 'build-voicli-26-rc1'); click('Select all visible'); click('Create Run')
    await screen.findByText('Draft', { selector: 'span' })
    click('TC-001'); change('Result', 'Pass'); click('Save result')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save result' })).toHaveProperty('disabled', false))
    click('Next'); change('Result', 'Fail'); click('Save result')
    await screen.findByRole('button', { name: 'Create Defect' })
    click('Create Defect'); click('Save Defect')
    await screen.findByRole('button', { name: 'View Report' })
    click('View Report')
    const report = within(screen.getByRole('region', { name: 'Test Run report' }))
    expect(report.getByText('Total: 4')).toBeTruthy(); expect(report.getByText('Completed: 2')).toBeTruthy(); expect(report.getByText('Remaining: 2')).toBeTruthy()
    expect(report.getByText('Pass: 1')).toBeTruthy(); expect(report.getByText('Fail: 1')).toBeTruthy()
    expect(report.getAllByText(/BUG-004/)).toHaveLength(2); expect(report.getByText('Staging')).toBeTruthy(); expect(report.getByText('2.6.0-rc1')).toBeTruthy()
    fireEvent.click(report.getByRole('button', { name: 'TC-002' }))
    expect(screen.getByRole('heading', { name: 'Wrong password' })).toBeTruthy()
  })

  it('renders Smoke report with prerequisites, empty/not-run totals and source snapshot rows', async () => {
    await renderAuthenticatedApp(); click('Open SMK-001'); click('Run Smoke'); change('Environment / Середовище', 'env-voicli-staging'); click('Create Draft')
    await screen.findByText('Draft', { selector: 'span' })
    click('View Report')
    let report = within(screen.getByRole('region', { name: 'Smoke Run report' }))
    expect(report.getByText('Total: 2')).toBeTruthy(); expect(report.getByText('Completed: 0')).toBeTruthy(); expect(report.getByText('Not Run: 2')).toBeTruthy(); expect(report.getByText('Not Checked: 1')).toBeTruthy()
    click('Back to Run'); change('Prerequisite result 1', 'Pass'); click('TC-001'); change('Result', 'Fail'); click('Save result')
    await screen.findByRole('button', { name: 'Create Defect' })
    click('Create Defect'); click('Save Defect')
    await screen.findByRole('button', { name: 'View Report' })
    click('View Report'); report = within(screen.getByRole('region', { name: 'Smoke Run report' }))
    expect(report.getByText('Fail: 1')).toBeTruthy(); expect(report.getByText('Pass: 1')).toBeTruthy(); expect(report.getAllByText(/BUG-004/)).toHaveLength(2)
    fireEvent.click(report.getByRole('button', { name: 'TC-001' })); expect(screen.getByRole('heading', { name: 'Login valid user' })).toBeTruthy()
  })
})
