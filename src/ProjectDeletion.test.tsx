// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'

const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const projects = [
  { id: 3, name: 'Alpha', description: null, createdByUserId: 42, createdAt: '', updatedAt: '' },
  { id: 4, name: 'Beta', description: null, createdByUserId: 42, createdAt: '', updatedAt: '' },
]

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function fetchWithDelete(deleteRequest: () => Promise<Response>) {
  return vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/auth/me.php')) return Promise.resolve(response({ success: true, user: { id: 42, name: 'Alena', email: 'alena@example.com', emailVerified: true } }))
    if (url.endsWith('/projects/') && init?.method === 'DELETE') return deleteRequest()
    if (url.endsWith('/projects/')) return Promise.resolve(response({ success: true, projects }))
    if (url.includes('/project-areas/')) return Promise.resolve(response({ success: true, areas: [] }))
    if (url.includes('/requirements/')) return Promise.resolve(response({ success: true, requirements: [] }))
    if (url.includes('/test-plans/')) return Promise.resolve(response({ success: true, testPlans: [] }))
    if (url.includes('/test-case-types/')) return Promise.resolve(response({ success: true, types: [] }))
    throw new Error(`Unexpected request: ${url}`)
  })
}

async function openConfirmation() {
  await screen.findByRole('button', { name: 'Project: Alpha' })
  fireEvent.click(screen.getByRole('button', { name: 'Settings / Налаштування' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Project' }))
  await screen.findByRole('heading', { name: 'Delete project “Alpha”?' })
}

it('does not call DELETE before confirmation and Cancel keeps the Project', async () => {
  const fetch = fetchWithDelete(() => Promise.resolve(response({ success: true, deletedProjectId: 3 })))
  vi.stubGlobal('fetch', fetch)
  render(<App />)
  await openConfirmation()
  expect(fetch.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)
  expect(screen.getByText(/All project data will be permanently deleted/)).toBeTruthy()
  expect(screen.getByText('This action cannot be undone.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('button', { name: 'Project: Alpha' })).toBeTruthy()
  expect(fetch.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)
})

it('calls DELETE only after Delete permanently and removes state only after success', async () => {
  let resolveDelete!: (value: Response) => void
  const pending = new Promise<Response>(resolve => { resolveDelete = resolve })
  const fetch = fetchWithDelete(() => pending)
  vi.stubGlobal('fetch', fetch)
  render(<App />)
  await openConfirmation()
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  expect(document.querySelector('.sidebar-project')?.textContent).toContain('Project: Alpha')
  const deletion = fetch.mock.calls.find(([, init]) => init?.method === 'DELETE')
  expect(deletion).toBeTruthy()
  expect(JSON.parse(String(deletion?.[1]?.body))).toEqual({ id: 3 })
  await act(async () => resolveDelete(response({ success: true, deletedProjectId: 3 })))
  expect(await screen.findByRole('button', { name: 'Project: Beta' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Delete project “Alpha”?' })).toBeNull()
})

it('keeps the Project and shows the backend message when DELETE fails', async () => {
  const fetch = fetchWithDelete(() => Promise.resolve(response({ success: false, message: 'Project deletion failed' }, 500)))
  vi.stubGlobal('fetch', fetch)
  render(<App />)
  await openConfirmation()
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Project deletion failed')
  expect(document.querySelector('.sidebar-project')?.textContent).toContain('Project: Alpha')
  expect(screen.getByRole('heading', { name: 'Delete project “Alpha”?' })).toBeTruthy()
})
