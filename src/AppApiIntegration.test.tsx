// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'

const json = (value: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }))
const user = { id: 42, name: 'Alena', email: 'alena@example.com', emailVerified: true }
const projects = [
  { id: 3, name: 'Alpha', description: null, createdByUserId: 42, createdAt: '', updatedAt: '' },
  { id: 4, name: 'Beta', description: null, createdByUserId: 42, createdAt: '', updatedAt: '' },
]
const requirement = (projectId: number) => ({ id: projectId * 10, projectId, code: `REQ-${projectId}`, title: `Requirement ${projectId}`, description: null, areaId: null, priority: 'medium', status: 'draft', source: null, notes: null, createdByUserId: 42, createdAt: '', updatedAt: '' })

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function apiFetch(options?: { requirementMutationError?: boolean }) {
  return vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/auth/me.php')) return json({ success: true, user })
    if (url.endsWith('/projects/')) return json({ success: true, projects })
    const projectId = Number(new URL(url).searchParams.get('projectId'))
    if (url.includes('/project-areas/')) return json({ success: true, areas: [] })
    if (url.includes('/test-plans/')) return json({ success: true, testPlans: [] })
    if (url.includes('/test-case-types/')) return json({ success: true, types: [] })
    if (url.includes('/requirements/')) {
      if (init?.method === 'POST' && options?.requirementMutationError) return json({ success: false, message: 'Requirement rejected', errors: { title: 'Invalid' } }, 422)
      return json({ success: true, requirements: [requirement(projectId)] })
    }
    throw new Error(`Unexpected request: ${url}`)
  })
}

it('loads backend-backed project data and replaces it when Project changes', async () => {
  const fetch = apiFetch()
  vi.stubGlobal('fetch', fetch)
  render(<App />)
  await screen.findByRole('button', { name: 'Project: Alpha' })
  fireEvent.click(screen.getByRole('button', { name: 'Requirements / Вимоги' }))
  expect(await screen.findByRole('button', { name: 'Open REQ-3' })).toBeTruthy()
  expect(screen.queryByText('REQ-AUTH')).toBeNull()

  fireEvent.keyDown(screen.getByRole('button', { name: 'Project: Alpha' }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Beta' }))
  expect(await screen.findByRole('button', { name: 'Project: Beta' })).toBeTruthy()
  expect(await screen.findByRole('button', { name: 'Open REQ-4' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Open REQ-3' })).toBeNull()

  await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).includes('/requirements/?projectId=4'))).toBe(true))
})

it('keeps Requirements state unchanged when backend validation rejects create', async () => {
  vi.stubGlobal('fetch', apiFetch({ requirementMutationError: true }))
  render(<App />)
  await screen.findByRole('button', { name: 'Project: Alpha' })
  fireEvent.click(screen.getByRole('button', { name: 'Requirements / Вимоги' }))
  await screen.findByRole('button', { name: 'Open REQ-3' })
  fireEvent.click(screen.getByRole('button', { name: '+ Add requirement' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Rejected requirement' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save requirement' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Requirement rejected')
  const list = screen.getByRole('region', { name: 'Requirements list' })
  expect(within(list).getAllByRole('row')).toHaveLength(2)
  expect(within(list).queryByText('Rejected requirement')).toBeNull()
})
