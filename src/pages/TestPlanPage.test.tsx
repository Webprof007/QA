// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TestPlanPage } from './TestPlanPage'
import type { TestPlan } from '@/types'

const plan = (id: string, projectId: string, title: string): TestPlan => ({
  id, projectId, title, version: '1.0', status: 'Draft', objective: `${title} objective`,
  scopeIn: '', scopeOut: '', environment: '', entryCriteria: '', exitCriteria: '', risks: '',
  startDate: '', endDate: '', notes: '', updatedAt: '2026-09-17T10:00:00.000Z',
})

type HarnessProps = {
  initial?: TestPlan[]
  failSave?: boolean
  failDelete?: boolean
  onSaveCall?: (value: TestPlan, creating: boolean) => void
  onDeleteCall?: (id: string) => void
}
function Harness({ initial = [], failSave, failDelete, onSaveCall, onDeleteCall }: HarnessProps) {
  const [plans, setPlans] = useState(initial)
  return <TestPlanPage projectId="project-a" plans={plans} onSave={async (value, creating) => {
    onSaveCall?.(value, creating)
    if (failSave) throw new Error('Backend save failed')
    const saved = { ...value, id: creating ? `api-${plans.length + 1}` : value.id }
    setPlans(current => creating ? [...current, saved] : current.map(item => item.id === saved.id ? saved : item))
    return saved
  }} onDelete={async id => {
    onDeleteCall?.(id)
    if (failDelete) throw new Error('Backend delete failed')
    setPlans(current => current.filter(item => item.id !== id))
  }} />
}

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const titleInput = () => screen.getByLabelText(/Title \/ Назва/) as HTMLInputElement
async function action(title: string, name: 'Edit' | 'Delete') {
  fireEvent.keyDown(screen.getByRole('button', { name: `Actions ${title}` }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name }))
}

describe('TestPlanPage table workflow', () => {
  it('shows multiple project plans and excludes plans from another project', () => {
    render(<Harness initial={[plan('1', 'project-a', 'Regression'), plan('2', 'project-a', 'Release'), plan('3', 'project-b', 'Foreign')]} />)
    expect(screen.getByRole('button', { name: '+ Create Test Plan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open Regression' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open Release' })).toBeTruthy()
    expect(screen.queryByText('Foreign')).toBeNull()
  })

  it('creates first and second plans and returns to the list after each successful save', async () => {
    const save = vi.fn()
    render(<Harness onSaveCall={save} />)
    expect(screen.getByText('Плани тестування поки не створено.')).toBeTruthy()
    for (const title of ['First plan', 'Second plan']) {
      click('+ Create Test Plan')
      expect(titleInput().value).toBe('')
      fireEvent.change(titleInput(), { target: { value: title } })
      click('Save')
      await waitFor(() => expect(screen.getByRole('button', { name: `Open ${title}` })).toBeTruthy())
    }
    expect(save).toHaveBeenNthCalledWith(1, expect.objectContaining({ title: 'First plan' }), true)
    expect(save).toHaveBeenNthCalledWith(2, expect.objectContaining({ title: 'Second plan' }), true)
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3)
  })

  it('edits only the selected row and returns to the list; Cancel saves nothing', async () => {
    const save = vi.fn()
    render(<Harness initial={[plan('1', 'project-a', 'Regression'), plan('2', 'project-a', 'Release')]} onSaveCall={save} />)
    await action('Release', 'Edit')
    fireEvent.change(titleInput(), { target: { value: 'Discarded' } })
    click('Cancel')
    expect(screen.queryByText('Discarded')).toBeNull()
    expect(save).not.toHaveBeenCalled()
    await action('Release', 'Edit')
    fireEvent.change(titleInput(), { target: { value: 'Release updated' } })
    click('Save')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open Release updated' })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Open Regression' })).toBeTruthy()
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: '2', title: 'Release updated' }), false)
  })

  it('deletes only the selected row after confirmation and Cancel preserves it', async () => {
    const remove = vi.fn()
    render(<Harness initial={[plan('1', 'project-a', 'Regression'), plan('2', 'project-a', 'Release')]} onDeleteCall={remove} />)
    await action('Release', 'Delete')
    expect(screen.getByRole('heading', { name: 'Delete test plan “Release”?' })).toBeTruthy()
    expect(screen.getByText('Тест-план буде видалено безповоротно.')).toBeTruthy()
    click('Cancel')
    expect(screen.getByRole('button', { name: 'Open Release' })).toBeTruthy()
    expect(remove).not.toHaveBeenCalled()
    await action('Release', 'Delete')
    click('Delete')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Open Release' })).toBeNull())
    expect(screen.getByRole('button', { name: 'Open Regression' })).toBeTruthy()
    expect(remove).toHaveBeenCalledWith('2')
  })

  it('keeps the form or row intact when backend save or delete fails', async () => {
    const { unmount } = render(<Harness initial={[plan('1', 'project-a', 'Regression')]} failSave />)
    await action('Regression', 'Edit')
    fireEvent.change(titleInput(), { target: { value: 'Failed update' } })
    click('Save')
    expect((await screen.findByRole('alert')).textContent).toContain('Backend save failed')
    expect(titleInput().value).toBe('Failed update')
    unmount()
    render(<Harness initial={[plan('1', 'project-a', 'Regression')]} failDelete />)
    await action('Regression', 'Delete')
    click('Delete')
    expect((await screen.findByRole('alert')).textContent).toContain('Backend delete failed')
    click('Cancel')
    expect(screen.getByRole('button', { name: 'Open Regression' })).toBeTruthy()
  })
})
