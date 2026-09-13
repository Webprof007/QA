// @vitest-environment jsdom
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import App from './App'

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

const openFirstTest = () =>
  fireEvent.click(screen.getByRole('button', { name: /SMK-PUB-001 Landing/ }))
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))
const panel = () => screen.getByRole('complementary')
const history = () =>
  screen.getByRole('region', { name: 'История результатов' })

async function menuAction(trigger: string, action: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: trigger }), {
    key: 'Enter',
  })
  fireEvent.click(await screen.findByRole('menuitem', { name: action }))
}

describe('Smoke MVP', () => {
  it('shows 16 tests and keeps the draft when closing the panel or switching tests', () => {
    render(<App />)
    expect(
      screen.getAllByRole('button', { name: /^SMK-.*(?:Core|Full)/ }),
    ).toHaveLength(16)
    expect(screen.queryByRole('complementary')).toBeNull()
    openFirstTest()
    expect(screen.getByText('Что проверить')).toBeTruthy()
    expect(
      screen.getAllByText('Описание теста пока не добавлено.'),
    ).toHaveLength(2)
    change('Комментарий', 'Черновик первой проверки')
    click('Закрыть рабочую панель')
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(document.querySelector('.smoke-layout.with-panel')).toBeNull()
    click('Результаты')
    expect(
      (screen.getByLabelText('Комментарий') as HTMLTextAreaElement).value,
    ).toBe('Черновик первой проверки')
    fireEvent.click(screen.getByRole('button', { name: /SMK-REG-001 Email/ }))
    expect(
      (screen.getByLabelText('Комментарий') as HTMLTextAreaElement).value,
    ).toBe('')
    openFirstTest()
    expect(
      (screen.getByLabelText('Комментарий') as HTMLTextAreaElement).value,
    ).toBe('Черновик первой проверки')
  })

  it('stores separate dated results, supports same-day runs and edits only the selected result', () => {
    render(<App />)
    openFirstTest()
    change('Дата', '2026-09-12')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Проверено' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Fail' }))
    change('Комментарий', 'Первое выполнение')
    change('Ссылка на задачу · необязательно', 'https://example.com/QA-1')
    click('Сохранить результат')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(1)
    expect(within(history()).getByText('Fail')).toBeTruthy()
    expect(within(history()).getByText('Проверено')).toBeTruthy()
    click('Новый результат')
    change('Дата', '2026-09-13')
    change('Комментарий', 'Второе выполнение')
    fireEvent.click(screen.getByRole('radio', { name: 'Pass' }))
    click('Сохранить результат')
    click('Новый результат')
    change('Дата', '2026-09-13')
    change('Комментарий', 'Третье выполнение')
    fireEvent.click(screen.getByRole('radio', { name: 'Blocked' }))
    click('Сохранить результат')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(3)
    click('Изменить результат за 2026-09-12')
    change('Комментарий', 'Исправленный комментарий')
    click('Сохранить изменения')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(3)
    expect(within(history()).getByText('Исправленный комментарий')).toBeTruthy()
    expect(within(history()).getByText('Второе выполнение')).toBeTruthy()
    expect(within(history()).getByText('Третье выполнение')).toBeTruthy()
    expect(within(history()).queryByText('Первое выполнение')).toBeNull()
    click('Закрыть рабочую панель')
    click('Результаты')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(3)
  })

  it('adds, checks, edits and deletes prerequisites', async () => {
    render(<App />)
    click('Добавить пункт')
    change('Текст пункта подготовки', 'Подготовить окружение')
    click('Сохранить')
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Подготовить окружение' }),
    )
    expect(
      screen
        .getByRole('checkbox', { name: 'Подготовить окружение' })
        .getAttribute('aria-checked'),
    ).toBe('true')
    await menuAction('Действия: Подготовить окружение', 'Изменить')
    change('Текст пункта подготовки', 'Выбрать окружение')
    click('Сохранить')
    expect(
      screen
        .getByRole('checkbox', { name: 'Выбрать окружение' })
        .getAttribute('aria-checked'),
    ).toBe('true')
    await menuAction('Действия: Выбрать окружение', 'Удалить')
    expect(
      screen.queryByRole('checkbox', { name: 'Выбрать окружение' }),
    ).toBeNull()
  })

  it('validates test IDs, edits step arrays and keeps history when a test ID changes', async () => {
    render(<App />)
    click('Добавить тест')
    change('ID', 'SMK-PUB-001')
    change('Проверка', 'Новая проверка')
    click('Сохранить тест')
    expect(screen.getByRole('alert').textContent).toContain('уже существует')
    change('ID', 'SMK-NEW-001')
    change('Что проверить', 'Первый пункт\n\nВторой пункт')
    change('Ожидаемый результат', 'Первый результат\nВторой результат')
    click('Сохранить тест')
    fireEvent.click(
      screen.getByRole('button', { name: /SMK-NEW-001 Новая проверка/ }),
    )
    expect(screen.getByText('Первый пункт')).toBeTruthy()
    expect(screen.getByText('Второй результат')).toBeTruthy()
    change('Комментарий', 'Сохранить историю при переименовании')
    click('Сохранить результат')
    await menuAction('Действия с тестом SMK-NEW-001', 'Изменить')
    change('ID', 'SMK-NEW-002')
    change('Проверка', 'Изменённая проверка')
    click('Сохранить тест')
    expect(within(panel()).getByText('SMK-NEW-002')).toBeTruthy()
    expect(
      within(history()).getByText('Сохранить историю при переименовании'),
    ).toBeTruthy()
    await menuAction('Действия с тестом SMK-NEW-002', 'Удалить')
    click('Удалить тест')
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.queryByText('Изменённая проверка')).toBeNull()
    expect(document.querySelector('.smoke-layout.with-panel')).toBeNull()
  })
})
