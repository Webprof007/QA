// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
afterEach(cleanup)
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
async function menu(trigger: string, name: string) { fireEvent.keyDown(screen.getByRole('button', { name: trigger }), { key: 'Enter' }); fireEvent.click(await screen.findByRole('menuitem', { name })) }
function openProjectDelete() { click('Settings / Налаштування'); click('Delete Project') }
it('navigates through QA sections with a single authenticated account', async () => {
  await renderAuthenticatedApp()
  const nav = within(screen.getByRole('navigation', { name: 'Розділи застосунку' }))
  const groups = ['PLANNING', 'TEST DESIGN', 'EXECUTION', 'ANALYSIS', 'PROJECT']
  expect([...screen.getByRole('navigation').querySelectorAll('.sidebar-group-label')].map(label => label.textContent)).toEqual(groups)
  const pages = ['Requirements / Вимоги', 'Test Plan / План тестування', 'Coverage / Покриття', 'Test Cases / Тест-кейси', 'Test Suites / Набори тестів', 'Checklists / Чеклісти', 'Smoke / Смоук-тестування', 'Test Runs / Запуски тестів', 'Defects / Дефекти', 'Audit / Аудит', 'Settings / Налаштування']
  expect(nav.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(pages)
  expect([...screen.getByRole('navigation').querySelectorAll('.sidebar-group')].map(group => group.querySelectorAll('button').length)).toEqual([3, 4, 2, 1, 1])
  for (const name of pages) {
    const button = nav.getByRole('button', { name })
    const [label, sublabel] = name.split(' / ')
    expect(button.querySelector('.sidebar-item-label')?.textContent).toBe(label)
    expect(button.querySelector('.sidebar-item-sublabel')?.textContent).toBe(sublabel)
    fireEvent.click(button)
    expect(screen.getByLabelText(`Current page: ${name}`)).toBeTruthy()
    expect(nav.getByRole('button', { name }).getAttribute('aria-current')).toBe('page')
    expect(nav.getAllByRole('button').filter(button => button.getAttribute('aria-current') === 'page')).toHaveLength(1)
  }
  expect(nav.queryByRole('button', { name: 'Users' })).toBeNull(); expect(screen.queryByRole('button', { name: /^Current User:/ })).toBeNull()
})
it('validates project names, creates isolated empty projects and preserves other project data', async () => {
  await renderAuthenticatedApp(); await menu('Project: Voicli', 'Додати проєкт')
  change('Назва проєкту', '   '); click('Створити проєкт'); expect(screen.getByRole('alert').textContent).toContain('Введіть назву')
  change('Назва проєкту', 'voicli'); click('Створити проєкт'); expect(screen.getByRole('alert').textContent).toContain('існує')
  change('Назва проєкту', 'New Project'); click('Створити проєкт')
  await screen.findByRole('button', { name: 'Project: New Project' })
  expect(screen.getByLabelText('Current page: Settings / Налаштування')).toBeTruthy()
  click('Smoke / Смоук-тестування')
  expect(screen.getByText('Smoke suites поки немає. Створіть перший набір.')).toBeTruthy()
  click('+ Add smoke suite'); change('Name', 'New project suite'); click('Save Suite'); await screen.findByRole('heading', { name: 'New project suite' })
  openProjectDelete(); click('Cancel')
  click('Smoke / Смоук-тестування')
  expect(screen.getByText('New project suite')).toBeTruthy()
  openProjectDelete(); click('Delete permanently')
  await screen.findByRole('button', { name: 'Project: Voicli' }); click('Smoke / Смоук-тестування'); expect(screen.getByRole('button', { name: 'Open SMK-001' })).toBeTruthy()
  await menu('Project: Voicli', 'Додати проєкт'); change('Назва проєкту', 'New Project'); click('Створити проєкт')
  await screen.findByRole('button', { name: 'Project: New Project' })
  expect(screen.queryByText('New project suite')).toBeNull()
})
it('allows creating a project after deleting all projects', async () => {
  await renderAuthenticatedApp()
  openProjectDelete(); click('Delete permanently')
  await screen.findByRole('button', { name: 'Project: QP Notes' })
  openProjectDelete(); click('Delete permanently')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Project: Немає проєктів' })).toBeTruthy())
  expect(screen.getByText('У поточного користувача поки немає проєктів.')).toBeTruthy()
  await menu('Project: Немає проєктів', 'Додати проєкт'); change('Назва проєкту', 'First'); click('Створити проєкт')
  await screen.findByRole('button', { name: 'Project: First' })
  expect(screen.getByLabelText('Current page: Settings / Налаштування')).toBeTruthy()
})
