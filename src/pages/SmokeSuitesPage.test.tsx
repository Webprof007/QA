// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SmokeSuitesPage } from './SmokeSuitesPage'
import type { SmokeSuiteState } from '@/types'

const suite = (id: string, projectId: string, name: string, tests = 0): SmokeSuiteState => ({
  suite: { id, projectId, name, createdAt: '2026-09-13' },
  preparation: [],
  drafts: {},
  tests: Array.from({ length: tests }, (_, index) => ({
    id: `${id}-test-${index}`,
    projectId,
    smokeSuiteId: id,
    title: `Test ${index}`,
    profile: 'Core',
    estimatedMinutes: 1,
    steps: [],
    expectedResults: [],
    results: [],
  })),
})

const noop = () => undefined

afterEach(cleanup)

describe('Smoke suites', () => {
  it('renders multiple suites and their test counts', () => {
    render(<SmokeSuitesPage suites={[suite('main', 'voicli', 'Main Smoke', 16), suite('mobile', 'voicli', 'Mobile Smoke', 5)]} onAdd={noop} onOpen={noop} onEdit={noop} onDelete={noop} />)
    expect(screen.getByText('Main Smoke')).toBeTruthy()
    expect(screen.getByText('Mobile Smoke')).toBeTruthy()
    expect(screen.getByText('16')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('opens only the selected suite and exposes deletion without affecting siblings', async () => {
    const onOpen = vi.fn()
    const onDelete = vi.fn()
    const main = suite('main', 'voicli', 'Main Smoke', 16)
    const mobile = suite('mobile', 'voicli', 'Mobile Smoke', 5)
    render(<SmokeSuitesPage suites={[main, mobile]} onAdd={noop} onOpen={onOpen} onEdit={noop} onDelete={onDelete} />)
    fireEvent.click(screen.getByText('Mobile Smoke'))
    expect(onOpen).toHaveBeenCalledWith('mobile')
    fireEvent.keyDown(screen.getByText('Main Smoke'), { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledWith('main')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Дії зі Smoke Mobile Smoke' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Видалити' }))
    expect(onDelete).toHaveBeenCalledWith(mobile)
    expect(main.tests).toHaveLength(16)
  })

  it('shows an empty list for a project without suites', () => {
    render(<SmokeSuitesPage suites={[]} onAdd={noop} onOpen={noop} onEdit={noop} onDelete={noop} />)
    expect(screen.getByText('Smoke suites поки немає. Створіть перший набір.')).toBeTruthy()
  })
})
