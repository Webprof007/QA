// @vitest-environment jsdom
import { setFieldValue } from '@/test/fields'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'

afterEach(cleanup)
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (label: string, value: string) => setFieldValue(screen.getByLabelText(label), value)
const rows = () => Array.from(document.querySelectorAll<HTMLElement>('.audit-compact-row'))
const panel = () => screen.getByRole('complementary')
const openAudit = async () => { await renderAuthenticatedApp(); click('Audit / Аудит'); click('AUDIT-001') }

async function projectMenu(item: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: item }))
  await waitFor(() => expect(screen.queryByText('Завантаження даних проєкту…')).toBeNull())
}
async function rowMenu(id: string, action: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: `Дії із зауваженням ${id}` }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: action }))
}

describe('Audit table-first UX', () => {
  it('keeps rows compact and uses the right panel as the only detail view', async () => {
    await openAudit()
    expect(rows()).toHaveLength(4)
    expect(screen.queryByText('Що виявлено')).toBeNull()
    fireEvent.click(rows()[0])
    expect(screen.getByRole('complementary')).toBeTruthy()
    expect(screen.getByText('Що виявлено')).toBeTruthy()
    expect(screen.getByText('Expected / Очікуваний результат')).toBeTruthy()
    expect(screen.getByText('Actual / Фактичний результат')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Attachments / Evidence' })).toBeTruthy()
    click('Закрити панель Audit')
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(document.querySelector('.audit-with-panel')).toBeNull()
  })

  it('combines header filters and clears them only when active', async () => {
    await openAudit()
    expect(screen.queryByRole('button', { name: 'Очистити фільтри' })).toBeNull()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Area' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Landing' }))
    expect(rows()).toHaveLength(1)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Status' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Open' }))
    expect(rows()).toHaveLength(1)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Severity' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'High' }))
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Очистити фільтри' })).toBeTruthy()
    click('Очистити фільтри')
    expect(rows()).toHaveLength(4)
    expect(screen.queryByRole('button', { name: 'Очистити фільтри' })).toBeNull()
  })

  it('sorts dates newest and oldest from the Date header and filters a date range', async () => {
    await openAudit()
    const dateHeader = screen.getByRole('button', { name: 'Date' })
    fireEvent.click(dateHeader)
    fireEvent.click(await screen.findByRole('radio', { name: 'Спочатку старі' }))
    expect(rows()[0].textContent).toContain('10.09.2026')
    fireEvent.click(screen.getByRole('radio', { name: 'Спочатку нові' }))
    expect(rows()[0].textContent).toContain('13.09.2026')
    change('Від', '2026-09-11')
    change('До', '2026-09-12')
    expect(rows()).toHaveLength(2)
  })

  it('opens the same right panel for creating an item, then edits and deletes it', async () => {
    await openAudit()
    click('+ Add audit finding')
    expect(panel()).toBeTruthy()
    expect(within(panel()).getByText('Новий запис')).toBeTruthy()
    change('Назва', 'Новое зауваження')
    change('Що виявлено', 'Описание проблемы')
    change('Location / де виявлено', 'Новый экран')
    change('Expected / Очікуваний результат', 'Ожидается корректное поведение')
    change('Actual / Фактичний результат', 'Фактическое поведение отличается')
    change('Evidence note', 'Скриншот не приложен')
    const area = within(panel()).getByRole('combobox', { name: 'Area' })
    change('Area', (within(area).getByRole('option', { name: 'Registration' }) as HTMLOptionElement).value)
    fireEvent.click(within(panel()).getByRole('combobox', { name: 'Type' }))
    click('Bug')
    click('Створити зауваження')
    expect(rows()).toHaveLength(5)
    expect(rows().some(row => row.textContent?.includes('Новое зауваження'))).toBe(true)
    await rowMenu('AUD-005', 'Змінити')
    change('Назва', 'Изменённое зауваження')
    click('Зберегти зміни')
    expect(rows().some(row => row.textContent?.includes('Изменённое зауваження'))).toBe(true)
    await rowMenu('AUD-005', 'Видалити')
    click('Видалити зауваження')
    expect(rows()).toHaveLength(4)
  })

  it('keeps Audit project-specific and QP Notes empty', async () => {
    await openAudit()
    await projectMenu('QP Notes')
    expect(rows()).toHaveLength(0)
    expect(screen.getByText('Перевірок ще немає. Додайте Audit.')).toBeTruthy()
    await projectMenu('Voicli'); click('AUDIT-001')
    expect(rows()).toHaveLength(4)
  })
})

describe('Audit dictionaries and combined search', () => {
  it('combines search across ID and title with every category and date, retaining headers for no matches', async () => {
    await openAudit()
    change('Пошук за ID або назвою', 'aud-001')
    expect(rows()).toHaveLength(1)
    change('Пошук за ID або назвою', 'НЕПОМІТНИЙ')
    expect(rows()).toHaveLength(1)
    for (const [header, value] of [['Area', 'Landing'], ['Type', 'Accessibility'], ['Severity', 'High'], ['Status', 'Open']]) {
      fireEvent.keyDown(screen.getByRole('button', { name: header }), { key: 'Enter' })
      fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: value }))
    }
    click('Date')
    change('Від', '2026-09-10')
    change('До', '2026-09-10')
    expect(rows()).toHaveLength(1)
    change('Від', '2026-09-11')
    expect(rows()).toHaveLength(0)
    click('Скинути')
    expect(rows()).toHaveLength(1)
    fireEvent.keyDown(screen.getByLabelText('Від'), { key: 'Escape' })
    click('Очистити фільтри')
    expect(rows()).toHaveLength(4)
    expect(screen.queryByRole('button', { name: 'Task' })).toBeNull()
    expect(screen.queryByLabelText('Поиск по ID')).toBeNull()
  })

  it('uses centrally managed project Areas without local Area CRUD', async () => {
    await openAudit()
    fireEvent.click(rows()[0])
    const area = within(panel()).getByRole('combobox', { name: 'Area' })
    expect(within(area).getByRole('option', { name: 'Registration' })).toBeTruthy()
    expect(screen.queryByLabelText('Додати Area')).toBeNull()
    await projectMenu('QP Notes')
    click('+ Add audit'); change('Title / Назва', 'QP Audit'); click('Save Audit'); click('AUDIT-001')
    click('+ Add audit finding')
    expect(within(within(panel()).getByRole('combobox', { name: 'Area' })).queryByRole('option', { name: 'Registration' })).toBeNull()
  })
})
