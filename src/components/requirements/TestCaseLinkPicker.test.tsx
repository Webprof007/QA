// @vitest-environment jsdom
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TestCaseLinkPicker } from './TestCaseLinkPicker'
import { initialTestCasesByProject } from '@/data/testCasesMockData'
vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn() })
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())
const cases = Array.from({ length: 22 }, (_, index) => ({ ...initialTestCasesByProject.voicli.items[0], id: 'case-' + index, code: 'TC-' + String(index + 1).padStart(3, '0'), title: 'Scenario ' + index, status: index % 2 ? 'draft' as const : 'active' as const }))
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
describe('Test case link picker', () => {
  it('paginates a large list and retains selections across pages and filters until Apply', async () => {
    const apply = vi.fn()
    render(<TestCaseLinkPicker testCases={cases} selectedIds={['case-0']} onApply={apply} onClose={vi.fn()} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(9) // 8 results plus Selected only.
    click('Next')
    fireEvent.click(screen.getByRole('checkbox', { name: 'TC-009 Scenario 8' }))
    change('Search test cases', 'SCENARIO 21')
    fireEvent.click(screen.getByRole('checkbox', { name: 'TC-022 Scenario 21' }))
    change('Search test cases', '')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Status' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Draft' }))
    expect(screen.queryByRole('checkbox', { name: 'TC-001 Scenario 0' })).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selected only' }))
    expect(screen.getByRole('checkbox', { name: 'TC-022 Scenario 21' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Status' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'All' }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    expect(apply).not.toHaveBeenCalled()
    click('Apply selection')
    expect(apply).toHaveBeenCalledWith(['case-0', 'case-8', 'case-21'])
  })
  it('cancel does not change links and selections can be removed', () => {
    const apply = vi.fn(), close = vi.fn()
    render(<TestCaseLinkPicker testCases={cases} selectedIds={['case-0']} onApply={apply} onClose={close} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'TC-001 Scenario 0' }))
    click('Cancel')
    expect(close).toHaveBeenCalledOnce()
    expect(apply).not.toHaveBeenCalled()
  })
})
