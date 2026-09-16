// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { ProjectSettingsPage } from './ProjectSettingsPage'
import type { ProjectArea, ProjectSetupState, TestCaseDictionaryValue } from '@/types'

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const project = { id: '1', name: 'Alpha', description: 'API project', userIds: [] }
const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

function Harness({ protectedArea = false, description = 'API project', emptyDictionaries = false }: { protectedArea?: boolean; description?: string; emptyDictionaries?: boolean }) {
  const [areas, setAreas] = useState<ProjectArea[]>(emptyDictionaries ? [] : [{ id: '10', projectId: '1', name: 'Authentication' }, { id: '20', projectId: '2', name: 'Foreign Area' }])
  const [types, setTypes] = useState<TestCaseDictionaryValue[]>(emptyDictionaries ? [] : [{ id: '30', projectId: '1', name: 'Functional' }, { id: '40', projectId: '2', name: 'Foreign Type' }])
  const [setup, setSetup] = useState<ProjectSetupState>({ environments: [], releases: [], builds: [] })
  const save = <T extends ProjectArea | TestCaseDictionaryValue>(setter: React.Dispatch<React.SetStateAction<T[]>>, name: string, id?: string) => {
    const value = { id: id ?? crypto.randomUUID(), projectId: '1', name } as T
    setter(current => id ? current.map(item => item.id === id && item.projectId === '1' ? value : item) : [...current, value])
    return Promise.resolve(value.id)
  }
  return <ProjectSettingsPage project={{ ...project, description }} areas={areas} types={types} data={setup} onChange={setSetup}
    onAreaSave={(name, id) => save(setAreas, name, id)} onAreaRemove={async id => { if (protectedArea) return 'Area is used'; setAreas(current => current.filter(item => item.id !== id || item.projectId !== '1')); return '' }}
    onTypeSave={(name, id) => save(setTypes, name, id)} onTypeRemove={async id => { setTypes(current => current.filter(item => item.id !== id || item.projectId !== '1')); return '' }} onDeleteProject={vi.fn()} />
}

it('uses bilingual section titles and Ukrainian helper and empty-state text', () => {
  render(<Harness description="" emptyDictionaries />)

  for (const title of [
    'Project Areas / Області проєкту',
    'Test Case Types / Типи тест-кейсів',
    'Environments / Середовища',
    'Releases & Builds / Релізи та збірки',
    'Releases / Релізи',
    'Builds / Збірки',
    'Danger Zone / Небезпечна зона',
  ]) expect(screen.getByRole('heading', { name: title })).toBeTruthy()

  for (const text of [
    'Функціональні області проєкту, що використовуються у Requirements, Test Cases, Checklists, Defects, Audit та Coverage.',
    'Типи тест-кейсів, доступні в межах цього проєкту.',
    'Середовища, у яких виконується тестування проєкту.',
    'Релізи та збірки, для яких виконується тестування.',
    'Безповоротне видалення проєкту та всіх пов’язаних QA-даних.',
    'Областей поки немає.',
    'Типів тест-кейсів поки немає.',
    'Середовищ поки немає.',
    'Релізів поки немає.',
    'Збірок поки немає.',
  ]) expect(screen.getByText(text)).toBeTruthy()

  expect(screen.queryByText('General / Загальне')).toBeNull()
  expect(screen.queryByText('Основна інформація про проєкт.')).toBeNull()
  expect(screen.queryByText(/Frontend session only/i)).toBeNull()
})

it('manages project-scoped Areas and Test Case Types from Settings', async () => {
  render(<Harness />)
  expect(screen.queryByText('Alpha')).toBeNull()
  expect(screen.queryByText('API project')).toBeNull()
  expect(screen.queryByText('Foreign Area')).toBeNull()
  expect(screen.queryByText('Foreign Type')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: '+ Add area' }))
  change('Name', 'Payments')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  const areaRow = await screen.findByRole('row', { name: /Payments/ })
  fireEvent.click(within(areaRow).getByRole('button', { name: 'Rename' }))
  change('Name', 'Billing')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  const renamedArea = await screen.findByRole('row', { name: /Billing/ })
  fireEvent.click(within(renamedArea).getByRole('button', { name: 'Delete' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Delete “Billing”?' })).toBeNull())
  expect(screen.queryByText('Billing')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: '+ Add test case type' }))
  change('Name', 'Regression')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  const typeRow = await screen.findByRole('row', { name: /Regression/ })
  fireEvent.click(within(typeRow).getByRole('button', { name: 'Rename' }))
  change('Name', 'E2E')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  const renamedType = await screen.findByRole('row', { name: /E2E/ })
  fireEvent.click(within(renamedType).getByRole('button', { name: 'Delete' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Delete “E2E”?' })).toBeNull())
  expect(screen.queryByText('E2E')).toBeNull()
})

it('keeps an Area when its backend delete callback returns an error', async () => {
  render(<Harness protectedArea />)
  const row = screen.getByRole('row', { name: /Authentication/ })
  fireEvent.click(within(row).getByRole('button', { name: 'Delete' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Area is used')
  expect(document.body.textContent).toContain('Authentication')
})

it('uses the existing shared Environment, Release and Build state', async () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: '+ Add environment' }))
  change('Name', 'Staging')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByText('Staging')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '+ Add release' }))
  change('Name', '2.7')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  fireEvent.click(screen.getByRole('button', { name: '+ Add build' }))
  change('Version', '2.7-rc1')
  fireEvent.change(screen.getByLabelText('Release'), { target: { value: screen.getByRole('option', { name: '2.7' }).getAttribute('value') } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByText('2.7-rc1')).toBeTruthy()
})
