// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

const response = (value: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }))
const projects = [
  { id: 3, name: 'Alpha', description: null, createdByUserId: 42, createdAt: '', updatedAt: '' },
  { id: 4, name: 'Beta', description: null, createdByUserId: 42, createdAt: '', updatedAt: '' },
]

function api(userId = 42) {
  return vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/auth/me.php')) return response({ success: true, user: { id: userId, name: `User ${userId}`, email: `user${userId}@example.com`, emailVerified: true } })
    if (url.endsWith('/projects/') && init?.method === 'POST') return response({ success: true, project: { id: 5, name: JSON.parse(String(init.body)).name, description: '', createdByUserId: userId, createdAt: '', updatedAt: '' } }, 201)
    if (url.endsWith('/projects/') && init?.method === 'DELETE') return response({ success: true, deletedProjectId: JSON.parse(String(init.body)).id })
    if (url.endsWith('/projects/')) return response({ success: true, projects })
    if (url.includes('/project-areas/')) return response({ success: true, areas: [] })
    if (url.includes('/requirements/')) return response({ success: true, requirements: [] })
    if (url.includes('/test-plans/')) return response({ success: true, testPlans: [] })
    if (url.includes('/test-case-types/')) return response({ success: true, types: [] })
    throw new Error(`Unexpected request: ${url}`)
  })
}

async function selectProject(name: string) {
  const trigger = await screen.findByRole('button', { name: /^Project:/ })
  fireEvent.keyDown(trigger, { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name }))
}

beforeEach(() => {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, String(value)) },
  }
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('selected Project persistence', () => {
  it('persists a manual Project selection and restores it after App remount', async () => {
    vi.stubGlobal('fetch', api())
    render(<App />)
    await screen.findByRole('button', { name: 'Project: Alpha' })
    await selectProject('Beta')
    await waitFor(() => expect(window.localStorage.getItem('qa:selectedProjectId:42')).toBe('4'))
    cleanup()
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Project: Beta' })).toBeTruthy()
  })

  it('removes a stale saved id and persists the available fallback', async () => {
    window.localStorage.setItem('qa:selectedProjectId:42', '999')
    vi.stubGlobal('fetch', api())
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Project: Alpha' })).toBeTruthy()
    await waitFor(() => expect(window.localStorage.getItem('qa:selectedProjectId:42')).toBe('3'))
  })

  it('persists a newly created Project as active', async () => {
    vi.stubGlobal('fetch', api())
    render(<App />)
    const trigger = await screen.findByRole('button', { name: 'Project: Alpha' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Додати проєкт' }))
    fireEvent.change(screen.getByLabelText('Назва проєкту'), { target: { value: 'Gamma' } })
    fireEvent.click(screen.getByRole('button', { name: 'Створити проєкт' }))
    expect(await screen.findByRole('button', { name: 'Project: Gamma' })).toBeTruthy()
    await waitFor(() => expect(window.localStorage.getItem('qa:selectedProjectId:42')).toBe('5'))
  })

  it('replaces the persisted id when the selected Project is deleted', async () => {
    window.localStorage.setItem('qa:selectedProjectId:42', '4')
    vi.stubGlobal('fetch', api())
    render(<App />)
    await screen.findByRole('button', { name: 'Project: Beta' })
    fireEvent.click(screen.getByRole('button', { name: 'Settings / Налаштування' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Project' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
    expect(await screen.findByRole('button', { name: 'Project: Alpha' })).toBeTruthy()
    await waitFor(() => expect(window.localStorage.getItem('qa:selectedProjectId:42')).toBe('3'))
  })

  it('does not restore another user’s selected Project', async () => {
    window.localStorage.setItem('qa:selectedProjectId:42', '4')
    vi.stubGlobal('fetch', api(7))
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Project: Alpha' })).toBeTruthy()
    await waitFor(() => expect(window.localStorage.getItem('qa:selectedProjectId:7')).toBe('3'))
    expect(window.localStorage.getItem('qa:selectedProjectId:42')).toBe('4')
  })
})
