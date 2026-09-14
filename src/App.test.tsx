// @vitest-environment jsdom
import { setFieldValue, fieldValue } from '@/test/fields'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  screen,
  within,
} from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'

afterEach(cleanup)
// jsdom has no layout observer; Radix uses it to size form controls.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)
afterAll(() => vi.unstubAllGlobals())

const openMainSmoke = () => {
  const suite = document.querySelector<HTMLElement>('.suite-data')
  if (suite) fireEvent.click(suite)
}
const openFirstTest = () => {
  openMainSmoke()
  fireEvent.click(screen.getByRole('button', { name: /SMK-PUB-001 Landing/ }))
}
const change = (label: string, value: string) =>
  setFieldValue(screen.getByLabelText(label), value)
const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))
const panel = () => screen.getByRole('complementary')
const history = () =>
  screen.getByRole('region', { name: 'Історія результатів' })

async function menuAction(trigger: string, action: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: trigger }), {
    key: 'Enter',
  })
  fireEvent.click(await screen.findByRole('menuitem', { name: action }))
}

describe('Smoke MVP', () => {
  it('shows 16 tests and keeps the draft when closing the panel or switching tests', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    expect(
      screen.getAllByRole('button', { name: /^SMK-.*(?:Core|Full)/ }),
    ).toHaveLength(16)
    expect(screen.queryByRole('complementary')).toBeNull()
    openFirstTest()
    expect(screen.getByText('Що перевірити')).toBeTruthy()
    expect(
      screen.getAllByText('Опис тесту поки не додано.'),
    ).toHaveLength(2)
    change('Коментар', 'Черновик первой проверки')
    click('Закрити робочу панель')
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(document.querySelector('.smoke-layout.with-panel')).toBeNull()
    click('Результати')
    expect(
      fieldValue(screen.getByLabelText('Коментар')),
    ).toBe('Черновик первой проверки')
    fireEvent.click(screen.getByRole('button', { name: /SMK-REG-001 Email/ }))
    expect(
      fieldValue(screen.getByLabelText('Коментар')),
    ).toBe('')
    openFirstTest()
    expect(
      fieldValue(screen.getByLabelText('Коментар')),
    ).toBe('Черновик первой проверки')
  })

  it('stores separate dated results, supports same-day runs and edits only the selected result', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    openFirstTest()
    change('Дата', '2026-09-12')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Перевірено' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Fail' }))
    change('Коментар', 'Первое выполнение')
    change('Посилання на задачу · необов’язково', 'https://example.com/QA-1')
    click('Зберегти результат')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(1)
    expect(within(history()).getByText('Fail')).toBeTruthy()
    expect(within(history()).getByText('Перевірено')).toBeTruthy()
    click('Новий результат')
    change('Дата', '2026-09-13')
    change('Коментар', 'Второе выполнение')
    fireEvent.click(screen.getByRole('radio', { name: 'Pass' }))
    click('Зберегти результат')
    click('Новий результат')
    change('Дата', '2026-09-13')
    change('Коментар', 'Третье выполнение')
    fireEvent.click(screen.getByRole('radio', { name: 'Blocked' }))
    click('Зберегти результат')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(3)
    click('Змінити результат за 2026-09-12')
    change('Коментар', 'Исправленный комментарий')
    click('Зберегти зміни')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(3)
    expect(within(history()).getByText('Исправленный комментарий')).toBeTruthy()
    expect(within(history()).getByText('Второе выполнение')).toBeTruthy()
    expect(within(history()).getByText('Третье выполнение')).toBeTruthy()
    expect(within(history()).queryByText('Первое выполнение')).toBeNull()
    click('Закрити робочу панель')
    click('Результати')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(3)
  })

  it('adds, checks, edits and deletes prerequisites', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    click('Додати пункт')
    change('Текст пункту підготовки', 'Подготовить окружение')
    click('Зберегти')
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Подготовить окружение' }),
    )
    expect(
      screen
        .getByRole('checkbox', { name: 'Подготовить окружение' })
        .getAttribute('aria-checked'),
    ).toBe('true')
    await menuAction('Дії: Подготовить окружение', 'Змінити')
    change('Текст пункту підготовки', 'Выбрать окружение')
    click('Зберегти')
    expect(
      screen
        .getByRole('checkbox', { name: 'Выбрать окружение' })
        .getAttribute('aria-checked'),
    ).toBe('true')
    await menuAction('Дії: Выбрать окружение', 'Видалити')
    expect(
      screen.queryByRole('checkbox', { name: 'Выбрать окружение' }),
    ).toBeNull()
  })

  it('validates test IDs, edits step arrays and keeps history when a test ID changes', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    click('Додати тест')
    change('ID', 'SMK-PUB-001')
    change('Перевірка', 'Нова перевірка')
    click('Зберегти тест')
    expect(screen.getByRole('alert').textContent).toContain('існує')
    change('ID', 'SMK-NEW-001')
    change('Що перевірити', 'Первый пункт\n\nВторой пункт')
    change('Очікуваний результат', 'Первый результат\nВторой результат')
    click('Зберегти тест')
    fireEvent.click(
      screen.getByRole('button', { name: /SMK-NEW-001 Нова перевірка/ }),
    )
    expect(screen.getByText('Первый пункт')).toBeTruthy()
    expect(screen.getByText('Второй результат')).toBeTruthy()
    change('Коментар', 'Зберегти историю при переименовании')
    click('Зберегти результат')
    await menuAction('Дії з тестом SMK-NEW-001', 'Змінити')
    change('ID', 'SMK-NEW-002')
    change('Перевірка', 'Изменённая проверка')
    click('Зберегти тест')
    expect(within(panel()).getByText('SMK-NEW-002')).toBeTruthy()
    expect(
      within(history()).getByText('Зберегти историю при переименовании'),
    ).toBeTruthy()
    await menuAction('Дії з тестом SMK-NEW-002', 'Видалити')
    click('Видалити тест')
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.queryByText('Изменённая проверка')).toBeNull()
    expect(document.querySelector('.smoke-layout.with-panel')).toBeNull()
  })
})

async function chooseSidebarItem(trigger: string, item: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: trigger }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: item }))
}

describe('Application shell', () => {
  it('navigates between sections and preserves Smoke drafts on return', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    const navigation = screen.getByRole('navigation', { name: 'Розділи застосунку' })
    expect(within(navigation).getAllByRole('button').map(button => button.textContent)).toEqual([
      'Requirements', 'Test Plan', 'Smoke', 'Checklists', 'Test Cases', 'Audit',
    ])
    openFirstTest()
    change('Коментар', 'Черновик до перехода')
    for (const page of ['Audit', 'Requirements', 'Test Plan', 'Checklists', 'Test Cases']) {
      fireEvent.click(within(navigation).getByRole('button', { name: page }))
      expect(screen.getByRole('heading', { level: 1, name: page })).toBeTruthy()
      expect(within(navigation).getByRole('button', { name: page }).getAttribute('aria-current')).toBe('page')
      expect(screen.queryByRole('complementary')).toBeNull()
    }
    click('Smoke')
    openFirstTest()
    expect(fieldValue(screen.getByLabelText('Коментар'))).toBe('Черновик до перехода')
  })

  it('isolates prerequisites, tests and result history between projects with matching test IDs', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    click('Додати пункт')
    change('Текст пункту підготовки', 'Подготовка Voicli')
    click('Зберегти')
    openFirstTest()
    change('Коментар', 'Результат Voicli')
    click('Зберегти результат')

    await chooseSidebarItem('Project: Voicli', 'QP Notes')
    expect(screen.queryByRole('button', { name: /^SMK-/ })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Подготовка Voicli' })).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.getByText('Smoke suites поки немає. Створіть перший набір.')).toBeTruthy()
    click('Додати Smoke')
    change('Назва', 'QP Smoke')
    click('Зберегти')
    fireEvent.click(screen.getByText('QP Smoke'))
    click('Додати пункт')
    change('Текст пункту підготовки', 'Подготовка QP Notes')
    click('Зберегти')
    click('Додати тест')
    change('ID', 'SMK-PUB-001')
    change('Перевірка', 'Перевірка QP Notes')
    click('Зберегти тест')
    fireEvent.click(screen.getByRole('button', { name: /SMK-PUB-001 Перевірка QP Notes/ }))
    expect(within(history()).queryByRole('listitem')).toBeNull()
    change('Коментар', 'Результат QP Notes')
    click('Зберегти результат')

    await chooseSidebarItem('Project: QP Notes', 'Voicli')
    openMainSmoke()
    expect(screen.getAllByRole('button', { name: /^SMK-.*(?:Core|Full)/ })).toHaveLength(16)
    expect(screen.getByRole('checkbox', { name: 'Подготовка Voicli' })).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: 'Подготовка QP Notes' })).toBeNull()
    openFirstTest()
    expect(within(history()).getByText('Результат Voicli')).toBeTruthy()
    expect(within(history()).queryByText('Результат QP Notes')).toBeNull()

    await chooseSidebarItem('Project: Voicli', 'QP Notes')
    expect(screen.getByText('QP Smoke')).toBeTruthy()
    fireEvent.click(screen.getByText('QP Smoke'))
    expect(screen.getAllByRole('button', { name: /^SMK-/ })).toHaveLength(1)
    expect(screen.getByRole('checkbox', { name: 'Подготовка QP Notes' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /SMK-PUB-001 Перевірка QP Notes/ }))
    expect(within(history()).getByText('Результат QP Notes')).toBeTruthy()
    expect(within(history()).getAllByRole('listitem')).toHaveLength(1)
  })

  it('does not show Users or the old mock-user switcher in the sidebar', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    expect(screen.queryByRole('button', { name: 'Users' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Current User:/ })).toBeNull()
  })

})

describe('Project management', () => {
  it('validates project names and creates an empty project shared by current users', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    await menuAction('Project: Voicli', 'Додати проєкт')
    change('Назва проєкту', '   ')
    click('Створити проєкт')
    expect(screen.getByRole('alert').textContent).toContain('Введіть назву')
    change('Назва проєкту', '  voicli  ')
    click('Створити проєкт')
    expect(screen.getByRole('alert').textContent).toContain('існує')
    change('Назва проєкту', '  New   Project  ')
    click('Створити проєкт')
    expect(screen.getByRole('button', { name: 'Project: New Project' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Smoke' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^SMK-/ })).toBeNull()
    click('Додати Smoke')
    change('Назва', 'New Smoke')
    click('Зберегти')
    fireEvent.click(screen.getByText('New Smoke'))
    click('Додати пункт')
    change('Текст пункту підготовки', 'Новый пункт проекта')
    click('Зберегти')
    expect(screen.getByRole('checkbox', { name: 'Новый пункт проекта' })).toBeTruthy()
    await chooseSidebarItem('Project: New Project', 'Voicli')
    openMainSmoke()
    expect(screen.getAllByRole('button', { name: /^SMK-.*(?:Core|Full)/ })).toHaveLength(16)
    expect(screen.queryByRole('checkbox', { name: 'Новый пункт проекта' })).toBeNull()
  })

  it('cancels deletion or removes the selected project and its data without affecting other projects', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    await chooseSidebarItem('Project: Voicli', 'QP Notes')
    click('Додати Smoke')
    change('Назва', 'QP Smoke')
    click('Зберегти')
    fireEvent.click(screen.getByText('QP Smoke'))
    click('Додати пункт')
    change('Текст пункту підготовки', 'Оставить в QP Notes')
    click('Зберегти')
    await chooseSidebarItem('Project: QP Notes', 'Voicli')
    openMainSmoke()
    click('Додати пункт')
    change('Текст пункту підготовки', 'Видалити вместе с Voicli')
    click('Зберегти')
    openFirstTest()
    change('Коментар', 'История удаляемого проекта')
    click('Зберегти результат')
    await menuAction('Project: Voicli', 'Видалити поточний проєкт')
    click('Скасувати')
    expect(within(history()).getByText('История удаляемого проекта')).toBeTruthy()
    await menuAction('Project: Voicli', 'Видалити поточний проєкт')
    click('Видалити проєкт')
    expect(screen.getByRole('button', { name: 'Project: QP Notes' })).toBeTruthy()
    fireEvent.click(screen.getByText('QP Smoke'))
    expect(screen.getByRole('checkbox', { name: 'Оставить в QP Notes' })).toBeTruthy()
    expect(screen.queryByRole('complementary')).toBeNull()
    await menuAction('Project: QP Notes', 'Додати проєкт')
    change('Назва проєкту', 'Voicli')
    click('Створити проєкт')
    expect(screen.queryByRole('checkbox', { name: 'Видалити вместе с Voicli' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^SMK-/ })).toBeNull()
    click('Додати Smoke')
    change('Назва', 'Main Smoke')
    click('Зберегти')
    fireEvent.click(screen.getByText('Main Smoke'))
    click('Додати тест')
    change('ID', 'SMK-PUB-001')
    change('Перевірка', 'Перевірка нового Voicli')
    click('Зберегти тест')
    fireEvent.click(screen.getByRole('button', { name: /SMK-PUB-001 Перевірка нового Voicli/ }))
    expect(within(history()).queryByRole('listitem')).toBeNull()
    expect(fieldValue(screen.getByLabelText('Коментар'))).toBe('')
  })

  it('allows creating a project after deleting the last one', async () => {
    await renderAuthenticatedApp()
    openMainSmoke()
    await menuAction('Project: Voicli', 'Видалити поточний проєкт')
    click('Видалити проєкт')
    await menuAction('Project: QP Notes', 'Видалити поточний проєкт')
    click('Видалити проєкт')
    expect(screen.getByText('У поточного користувача поки немає проєктів.')).toBeTruthy()
    await menuAction('Project: Немає проєктів', 'Додати проєкт')
    change('Назва проєкту', 'Первый проект')
    click('Створити проєкт')
    expect(screen.getByRole('button', { name: 'Project: Первый проект' })).toBeTruthy()
    expect(screen.getByText('Smoke suites поки немає. Створіть перший набір.')).toBeTruthy()
  })
})
