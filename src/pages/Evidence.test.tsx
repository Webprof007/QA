// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within, act } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
import { setFieldValue } from '@/test/fields'
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  let id = 0
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:evidence-' + ++id); static revokeObjectURL = vi.fn() })
})
afterEach(async () => { cleanup(); await Promise.resolve(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => setFieldValue(screen.getByLabelText(name), value)
const section = () => screen.getByRole('region', { name: 'Attachments / Evidence' })
function addLink(root: HTMLElement, name: string, url = 'https://example.com/proof') {
  const ui = within(root)
  fireEvent.click(ui.getByRole('button', { name: 'Add link' }))
  fireEvent.change(ui.getByLabelText('Link name'), { target: { value: name } })
  fireEvent.change(ui.getByLabelText('Evidence URL'), { target: { value: url } })
  fireEvent.click(ui.getByRole('button', { name: 'Save link' }))
}
function addFile(root: HTMLElement, name: string) {
  fireEvent.change(within(root).getByLabelText('Evidence files'), { target: { files: [new File(['proof'], name, { type: 'text/plain' })] } })
}
describe('Shared owner Evidence integration', () => {
  it.each(['test', 'smoke'])('keeps %s execution files across navigation and locks evidence on completion', async mode => {
    await renderAuthenticatedApp()
    if (mode === 'test') {
      click('Test Runs / Запуски тестів'); click('+ Add test run'); change('Name', 'Evidence run'); click('Select all visible'); click('Create Run')
    } else { click('Open SMK-001'); click('Run Smoke'); click('Create Draft') }
    click('TC-001')
    addFile(section(), 'execution.log')
    addLink(section(), 'Recording')
    expect(within(section()).getAllByText(/Created by: 42/)).toHaveLength(2)
    click('Next'); expect(within(section()).queryByText('execution.log')).toBeNull()
    click('Previous'); expect(within(section()).getByText('execution.log')).toBeTruthy()
    click('Complete Run'); click('Завершити все одно')
    expect(within(section()).queryByRole('button', { name: 'Add file' })).toBeNull()
    expect(within(section()).queryByRole('button', { name: /Remove/ })).toBeNull()
    expect(within(section()).getByRole('link', { name: 'Open link' }).getAttribute('rel')).toBe('noopener noreferrer')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })
  it('keeps defect evidence independent, rejects unsafe links and removes only attachment', async () => {
    await renderAuthenticatedApp(); click('Defects / Дефекти'); click('Open BUG-003')
    addLink(section(), 'Unsafe', 'javascript:alert(1)')
    expect(within(section()).getByRole('alert')).toBeTruthy()
    expect(within(section()).queryByRole('link')).toBeNull()
    click('Cancel link')
    addFile(section(), 'defect.log')
    click('Remove defect.log')
    await act(async () => { await Promise.resolve() })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:evidence-1')
    expect(screen.getByRole('button', { name: 'Retest' })).toBeTruthy()
    addLink(section(), 'Incident')
    click('Test Cases / Тест-кейси'); click('Defects / Дефекти'); click('Open BUG-003')
    expect(within(section()).getByText('Incident')).toBeTruthy()
  })
  it('commits retest attachments with Save, freezes history and releases cancelled draft files', async () => {
    await renderAuthenticatedApp(); click('Defects / Дефекти'); click('Open BUG-003')
    addLink(section(), 'Incident only')
    click('Retest')
    const draftSection = () => screen.getAllByRole('region', { name: 'Attachments / Evidence' }).find(root => !within(root).queryByText('Incident only'))!
    addFile(draftSection(), 'discard.log'); click('Cancel Retest')
    await act(async () => { await Promise.resolve() })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:evidence-1')
    click('Retest'); change('Environment / Середовище', 'env-voicli-staging'); change('Result', 'Pass')
    addFile(draftSection(), 'retest.log'); addLink(draftSection(), 'Fixed proof')
    click('Save Retest'); click('Retest #1')
    const detail = within(screen.getByRole('region', { name: 'Retest details' }))
    expect(detail.getByText('retest.log')).toBeTruthy()
    expect(detail.getByText('Fixed proof')).toBeTruthy()
    expect(detail.queryByText('Incident only')).toBeNull()
    expect(detail.queryByRole('button', { name: 'Add file' })).toBeNull()
    expect(detail.queryByRole('button', { name: /Remove/ })).toBeNull()
    await act(async () => { await Promise.resolve() })
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:evidence-2')
    click('Close Defect'); expect(detail.getByText('retest.log')).toBeTruthy()
  })
})
