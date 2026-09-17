// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { setFieldValue } from '@/test/fields'
import App from './App'

const json = (value: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }))
const user = { id: 42, name: 'Alena', email: 'alena@example.com', emailVerified: true }
const project = { id: 3, name: 'Alpha', description: null, createdByUserId: 42, createdAt: '', updatedAt: '' }
const requirement = { id: 30, projectId: 3, code: 'REQ-003', title: 'Login requirement', description: null, areaId: null, priority: 'medium', status: 'draft', source: null, notes: null, createdByUserId: 42, createdAt: '', updatedAt: '' }
const originalCase = { id: 31, projectId: 3, code: 'TC-003', title: 'Login case', areaId: null, typeId: null, priority: 'medium', status: 'active', preconditions: ['Existing user'], steps: [{ id: 310, action: 'Open login', expectedResult: 'Login form opens', sortOrder: 0 }], postconditions: ['User remains signed out'], notes: null, createdAt: '', updatedAt: '' }

beforeEach(() => {
  const values = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', { configurable: true, value: { get length() { return values.size }, clear: () => values.clear(), getItem: (key: string) => values.get(key) ?? null, key: (index: number) => [...values.keys()][index] ?? null, removeItem: (key: string) => { values.delete(key) }, setItem: (key: string, value: string) => { values.set(key, String(value)) } } satisfies Storage })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function backend(options: { rejectCreate?: boolean } = {}) {
  let cases = [structuredClone(originalCase)]
  let links: Array<{ projectId: number; requirementId: number; testCaseId: number; createdAt: string }> = []
  const fetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input), method = init?.method ?? 'GET'
    if (url.endsWith('/auth/me.php')) return json({ success: true, user })
    if (url.endsWith('/projects/')) return json({ success: true, projects: [project] })
    if (url.includes('/project-areas/')) return json({ success: true, areas: [] })
    if (url.includes('/test-plans/')) return json({ success: true, testPlans: [] })
    if (url.includes('/test-case-types/')) return json({ success: true, types: [] })
    if (url.includes('/requirements/')) return json({ success: true, requirements: [requirement] })
    if (url.includes('/requirement-test-cases/')) {
      const body = init?.body ? JSON.parse(String(init.body)) : null
      if (method === 'POST') links = [...links, { ...body, createdAt: '' }]
      if (method === 'DELETE') links = links.filter(link => link.requirementId !== body.requirementId || link.testCaseId !== body.testCaseId)
      return method === 'GET' ? json({ success: true, links }) : json({ success: true })
    }
    if (url.includes('/test-cases/')) {
      if (method === 'GET') return json({ success: true, testCases: cases })
      const body = JSON.parse(String(init?.body))
      if (method === 'POST' && options.rejectCreate) return json({ success: false, message: 'Test Case rejected' }, 422)
      if (method === 'POST') {
        const created = { ...body, id: 99, steps: body.steps.map((step: object, index: number) => ({ ...step, id: 990 + index })), createdAt: 'created', updatedAt: 'created' }
        cases = [...cases, created]
        return json({ success: true, testCase: created }, 201)
      }
      if (method === 'PATCH') {
        const updated = { ...body, steps: body.steps.map((step: object, index: number) => ({ ...step, id: 990 + index })), createdAt: 'created', updatedAt: 'updated' }
        cases = cases.map(item => item.id === body.id ? updated : item)
        return json({ success: true, testCase: updated })
      }
      if (method === 'DELETE') {
        cases = cases.filter(item => item.id !== body.id)
        return json({ success: true, deletedTestCaseId: body.id })
      }
    }
    throw new Error(`Unexpected request: ${method} ${url}`)
  })
  return fetch
}

async function openCases(fetch: ReturnType<typeof backend>) {
  vi.stubGlobal('fetch', fetch)
  render(<App />)
  await screen.findByRole('button', { name: 'Project: Alpha' })
  fireEvent.click(screen.getByRole('button', { name: 'Test Cases / Тест-кейси' }))
  await screen.findByRole('button', { name: 'Open TC-003' })
}

async function rowAction(code: string, action: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: `Actions ${code}` }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: action }))
}

it('loads, creates, edits and deletes API-backed Test Cases without changing state before success', async () => {
  const fetch = backend()
  await openCases(fetch)
  fireEvent.click(screen.getByRole('button', { name: 'Open TC-003' }))
  expect(screen.getByText('Existing user')).toBeTruthy()
  expect(screen.getByText('Login form opens')).toBeTruthy()
  expect(screen.getByText('User remains signed out')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: '+ Add test case' }))
  setFieldValue(screen.getByLabelText('Title'), 'Created through API')
  fireEvent.click(screen.getByRole('button', { name: 'Save test case' }))
  expect(await screen.findByRole('button', { name: 'Open TC-004' })).toBeTruthy()
  const post = fetch.mock.calls.find(([url, init]) => String(url).includes('/test-cases/') && init?.method === 'POST')
  expect(post).toBeTruthy()
  expect(JSON.parse(String(post?.[1]?.body))).not.toHaveProperty('id')

  await rowAction('TC-004', 'Edit')
  setFieldValue(within(screen.getByRole('complementary', { name: 'Test case panel' })).getByLabelText('Title'), 'Edited through API')
  fireEvent.click(screen.getByRole('button', { name: 'Save test case' }))
  await waitFor(() => expect(screen.getByText('Edited through API')).toBeTruthy())
  await rowAction('TC-004', 'Delete')
  fireEvent.click(screen.getByRole('button', { name: 'Delete test case' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Open TC-004' })).toBeNull())
  expect(fetch.mock.calls.some(([url, init]) => String(url).includes('/test-cases/') && init?.method === 'PATCH')).toBe(true)
  expect(fetch.mock.calls.some(([url, init]) => String(url).includes('/test-cases/') && init?.method === 'DELETE')).toBe(true)
})

it('keeps Test Case state intact when the backend rejects create', async () => {
  await openCases(backend({ rejectCreate: true }))
  fireEvent.click(screen.getByRole('button', { name: '+ Add test case' }))
  setFieldValue(screen.getByLabelText('Title'), 'Rejected case')
  fireEvent.click(screen.getByRole('button', { name: 'Save test case' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Test Case rejected')
  expect(screen.queryByRole('button', { name: 'Open TC-004' })).toBeNull()
})

it('creates and removes Requirement links through the API and persists imported Test Cases through POST', async () => {
  const fetch = backend()
  await openCases(fetch)
  fireEvent.click(screen.getByRole('button', { name: 'Open TC-003' }))
  fireEvent.click(screen.getByRole('button', { name: 'Manage Requirements' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'REQ-003 Login requirement' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply selection' }))
  await waitFor(() => expect(fetch.mock.calls.some(([url, init]) => String(url).includes('/requirement-test-cases/') && init?.method === 'POST')).toBe(true))
  await waitFor(() => expect(screen.getByText('REQ-003')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: 'Manage Requirements' }))
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply selection' }))
  await waitFor(() => expect(fetch.mock.calls.some(([url, init]) => String(url).includes('/requirement-test-cases/') && init?.method === 'DELETE')).toBe(true))

  fireEvent.click(screen.getByRole('button', { name: 'Import' }))
  const file = new File(['Title\nImported API case'], 'cases.csv', { type: 'text/csv' })
  fireEvent.change(screen.getByLabelText('Upload import file'), { target: { files: [file] } })
  fireEvent.click(await screen.findByRole('button', { name: 'Import 1 rows' }))
  await waitFor(() => expect(fetch.mock.calls.filter(([url, init]) => String(url).includes('/test-cases/') && init?.method === 'POST')).toHaveLength(1))
  expect(await screen.findByText('Imported API case')).toBeTruthy()
})
