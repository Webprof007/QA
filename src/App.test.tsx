// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
afterEach(cleanup)
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
async function menu(trigger: string, name: string) { fireEvent.keyDown(screen.getByRole('button', { name: trigger }), { key: 'Enter' }); fireEvent.click(await screen.findByRole('menuitem', { name })) }
it('navigates through QA sections with a single authenticated account', async () => {
  await renderAuthenticatedApp()
  const nav = within(screen.getByRole('navigation', { name: 'Розділи застосунку' }))
  const groups = ['PLANNING', 'TEST DESIGN', 'EXECUTION', 'ANALYSIS', 'PROJECT']
  expect([...screen.getByRole('navigation').querySelectorAll('.sidebar-group-label')].map(label => label.textContent)).toEqual(groups)
  const pages = [
    ['Requirements / Вимоги', 'Requirements'],
    ['Test Plan / План тестування', 'Test Plan'],
    ['Test Cases / Тест-кейси', 'Test Cases'],
    ['Test Suites / Набори тестів', 'Test Suites / Набори тестів'],
    ['Checklists / Чеклісти', 'Checklists'],
    ['Smoke / Смоук-тестування', 'Smoke'],
    ['Coverage / Покриття', 'Coverage'],
    ['Test Runs / Запуски тестів', 'Test Runs'],
    ['Defects / Дефекти', 'Defects'],
    ['Audit / Аудит', 'Audit'],
    ['Settings / Налаштування', 'Settings / Налаштування'],
  ]
  expect(nav.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(pages.map(([label]) => label))
  expect([...screen.getByRole('navigation').querySelectorAll('.sidebar-group')].map(group => group.querySelectorAll('button').length)).toEqual([2, 5, 2, 1, 1])
  for (const [name, heading] of pages) {
    const button = nav.getByRole('button', { name })
    const [label, sublabel] = name.split(' / ')
    expect(button.querySelector('.sidebar-item-label')?.textContent).toBe(label)
    expect(button.querySelector('.sidebar-item-sublabel')?.textContent).toBe(sublabel)
    fireEvent.click(button)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy()
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
  expect(screen.getByRole('button', { name: 'Project: New Project' })).toBeTruthy()
  expect(screen.getByText('Smoke suites поки немає. Створіть перший набір.')).toBeTruthy()
  click('+ Add smoke suite'); change('Name', 'New project suite'); click('Save Suite')
  await menu('Project: New Project', 'Видалити поточний проєкт'); click('Скасувати')
  expect(screen.getByRole('heading', { name: 'New project suite' })).toBeTruthy()
  await menu('Project: New Project', 'Видалити поточний проєкт'); click('Видалити проєкт')
  expect(screen.getByRole('button', { name: 'Project: Voicli' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'Open SMK-001' })).toBeTruthy()
  await menu('Project: Voicli', 'Додати проєкт'); change('Назва проєкту', 'New Project'); click('Створити проєкт')
  expect(screen.queryByText('New project suite')).toBeNull()
})
it('allows creating a project after deleting all projects', async () => {
  await renderAuthenticatedApp()
  await menu('Project: Voicli', 'Видалити поточний проєкт'); click('Видалити проєкт')
  await menu('Project: QP Notes', 'Видалити поточний проєкт'); click('Видалити проєкт')
  expect(screen.getByText('У поточного користувача поки немає проєктів.')).toBeTruthy()
  await menu('Project: Немає проєктів', 'Додати проєкт'); change('Назва проєкту', 'First'); click('Створити проєкт')
  expect(screen.getByRole('button', { name: 'Project: First' })).toBeTruthy()
  expect(screen.getByText('Smoke suites поки немає. Створіть перший набір.')).toBeTruthy()
})
