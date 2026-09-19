// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
const panel = () => screen.getByRole('complementary', { name: 'Checklist panel' })
const runPanel = () => screen.getByRole('complementary', { name: 'Checklist run' })
async function planAction(title: string, action: 'Edit' | 'Delete') {
  fireEvent.keyDown(screen.getByRole('button', { name: `Actions ${title}` }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: action }))
}
async function project(name: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name }))
  await waitFor(() => expect(screen.queryByText('Завантаження даних проєкту…')).toBeNull())
}
async function createChecklist(title = 'Form checks') {
  click('+ Add checklist'); change('Title', title); change('Description', 'Check the form'); change('Item 1', 'Required fields'); click('Add item'); change('Item 2', 'Success message'); click('Save Checklist'); await within(await screen.findByRole('complementary', { name: 'Checklist panel' })).findByText(`1. Required fields`)
}

describe('Test Plan', () => {
  it('creates, edits, cancels and retains a plan through navigation, scoped to project', async () => {
    await renderAuthenticatedApp(); click('Test Plan / План тестування')
    expect(screen.getByText('Плани тестування поки не створено.')).toBeTruthy()
    click('+ Create Test Plan'); change('Title / Назва', 'Release validation'); change('Objective / Мета', 'Check critical flows'); change('Version / Версія', '2.0'); change('Status / Статус', 'Active'); change('Start date / Дата початку', '2026-09-14'); change('End date / Дата завершення', '2026-09-15'); click('Save')
    await screen.findByRole('button', { name: 'Open Release validation' })
    await planAction('Release validation', 'Edit'); change('Objective / Мета', 'Discard me'); click('Cancel')
    expect(screen.queryByText('Discard me')).toBeNull()
    await planAction('Release validation', 'Edit'); change('Objective / Мета', 'Updated objective'); click('Save')
    await screen.findByRole('button', { name: 'Open Release validation' })
    click('Checklists / Чеклісти'); click('Test Plan / План тестування'); click('Open Release validation'); expect(screen.getByText('Updated objective')).toBeTruthy()
    await project('QP Notes'); expect(screen.queryByText('Release validation')).toBeNull(); click('+ Create Test Plan'); change('Title / Назва', 'QP plan'); click('Save'); await screen.findByRole('button', { name: 'Open QP plan' })
    await project('Voicli'); expect(screen.getByText('Release validation')).toBeTruthy(); expect(screen.queryByText('QP plan')).toBeNull()
  })
  it('keeps multiple plans and edits only the selected plan', async () => {
    await renderAuthenticatedApp(); click('Test Plan / План тестування')
    for (const title of ['Regression', 'Release 1.0', 'Release 2.0']) {
      click('+ Create Test Plan'); change('Title / Назва', title); change('Objective / Мета', `Objective for ${title}`); click('Save'); await screen.findByRole('button', { name: `Open ${title}` })
    }
    for (const title of ['Regression', 'Release 1.0', 'Release 2.0']) expect(screen.getByRole('button', { name: `Open ${title}` })).toBeTruthy()
    click('Open Release 1.0'); expect(screen.getByText('Objective for Release 1.0')).toBeTruthy()
    click('← Test Plans'); await planAction('Release 1.0', 'Edit'); change('Title / Назва', 'Discarded name'); click('Cancel'); expect(screen.queryByText('Discarded name')).toBeNull()
    await planAction('Release 1.0', 'Edit'); change('Title / Назва', 'Release 1.1'); change('Objective / Мета', 'Updated release'); click('Save')
    await screen.findByRole('button', { name: 'Open Release 1.1' })
    expect(screen.queryByRole('button', { name: 'Open Release 1.0' })).toBeNull()
    click('Open Regression'); expect(screen.getByText('Objective for Regression')).toBeTruthy(); click('← Test Plans')
    click('Open Release 2.0'); expect(screen.getByText('Objective for Release 2.0')).toBeTruthy()
    await project('QP Notes'); expect(screen.queryByText('Release 1.1')).toBeNull(); expect(screen.queryByText('Regression')).toBeNull()
    click('+ Create Test Plan'); change('Title / Назва', 'QP plan'); click('Save'); await screen.findByRole('button', { name: 'Open QP plan' })
    await project('Voicli'); expect(screen.queryByText('QP plan')).toBeNull(); click('Open Release 1.1'); expect(screen.getByText('Updated release')).toBeTruthy()
  })
  it('cancels creation and validates schedule', async () => {
    await renderAuthenticatedApp(); click('Test Plan / План тестування'); click('+ Create Test Plan'); click('Cancel'); click('+ Create Test Plan')
    change('Title / Назва', 'Schedule validation')
    change('Start date / Дата початку', '2026-09-20'); change('End date / Дата завершення', '2026-09-10'); click('Save')
    expect(screen.getByRole('alert').textContent).toContain('Дата завершення')
  })
})

describe('Checklist definitions and runs', () => {
  it('creates items, reorders, edits and isolates definitions', async () => {
    await renderAuthenticatedApp(); click('Checklists / Чеклісти'); click('+ Add checklist'); change('Title', 'Form checks')
    click('Save Checklist'); expect(screen.getByRole('alert').textContent).toContain('заповнений пункт')
    change('Item 1', 'First'); click('Add item'); change('Item 2', 'Second'); click('Move item 2 up')
    expect((screen.getByLabelText('Item 1') as HTMLTextAreaElement).value).toBe('Second')
    click('Add item'); change('Item 3', 'Remove this'); click('Delete item 3'); click('Save Checklist')
    expect(await within(panel()).findByText('1. Second')).toBeTruthy()
    click('Edit Checklist'); change('Title', 'Edited form checks'); change('Item 1', 'Revised'); click('Save Checklist'); await within(panel()).findByText('1. Revised'); click('Close checklist')
    expect(screen.getByRole('button', { name: 'Open Edited form checks' })).toBeTruthy()
    await project('QP Notes'); expect(screen.queryByText('Edited form checks')).toBeNull(); await createChecklist('QP checks')
    await project('Voicli'); expect(screen.queryByText('QP checks')).toBeNull(); click('Open Edited form checks'); expect(within(panel()).getByText('1. Revised')).toBeTruthy()
  })
  it('creates independent runs, persists per-item results, completes read-only and retains snapshots', async () => {
    await renderAuthenticatedApp(); click('Checklists / Чеклісти'); await createChecklist(); click('Run Checklist')
    expect(within(await screen.findByRole('complementary', { name: 'Checklist run' })).getByText('Status: In Progress')).toBeTruthy()
    change('Result 1', 'Pass'); change('Comment 1', 'All fields checked'); change('Result 2', 'Fail')
    click('Close run'); await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Checklist run' })).toBeNull()); click('Definition')
    expect(within(panel()).getByText('1. Required fields')).toBeTruthy(); expect(within(panel()).queryByText('All fields checked')).toBeNull()
    click('Runs'); click('Run 1'); expect((screen.getByLabelText('Comment 1') as HTMLTextAreaElement).value).toBe('All fields checked')
    click('Complete Run'); expect(await within(runPanel()).findByText('Status: Completed')).toBeTruthy()
    expect(within(runPanel()).queryByRole('combobox')).toBeNull(); expect(within(runPanel()).queryByRole('textbox')).toBeNull(); expect(screen.queryByRole('button', { name: 'Complete Run' })).toBeNull()
    click('Close run'); await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Checklist run' })).toBeNull()); expect(screen.getByRole('region', { name: 'Run history' })).toBeTruthy(); click('Definition'); click('Edit Checklist'); change('Item 1', 'New definition text'); click('Save Checklist'); await within(panel()).findByText('1. New definition text')
    click('Runs'); click('Run 1'); expect(within(runPanel()).getByText('1. Required fields')).toBeTruthy(); expect(within(runPanel()).queryByText('New definition text')).toBeNull()
    click('Close run'); await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Checklist run' })).toBeNull()); click('Run Checklist'); expect(within(await screen.findByRole('complementary', { name: 'Checklist run' })).getByText('1. New definition text')).toBeTruthy(); expect((screen.getByLabelText('Result 1') as HTMLSelectElement).value).toBe('Not Run')
    change('Result 1', 'Blocked'); change('Result 2', 'N/A'); await waitFor(() => { expect((screen.getByLabelText('Result 1') as HTMLSelectElement).value).toBe('Blocked'); expect((screen.getByLabelText('Result 2') as HTMLSelectElement).value).toBe('N/A') }); click('Test Plan / План тестування'); click('Checklists / Чеклісти'); click('Open Form checks'); click('Runs'); click('Run 2')
    expect((screen.getByLabelText('Result 1') as HTMLSelectElement).value).toBe('Blocked')
    await project('QP Notes'); expect(screen.queryByRole('complementary')).toBeNull(); await createChecklist('Other project'); click('Runs'); expect(screen.getByText('Проходжень поки немає.')).toBeTruthy()
    await project('Voicli'); click('Open Form checks'); click('Runs'); expect(screen.getByRole('button', { name: 'Run 1' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'Run 2' })).toBeTruthy()
  })
  it('uses the same project-scoped Area dictionary as Requirements', async () => {
    await renderAuthenticatedApp(); click('Checklists / Чеклісти'); click('+ Add checklist'); change('Title', 'Shared Area checklist'); change('Item 1', 'Check settings')
    const checklistArea = screen.getByRole('combobox', { name: 'Area' }) as HTMLSelectElement
    const authId = within(checklistArea).getByRole('option', { name: 'Auth' }).getAttribute('value')!
    fireEvent.change(checklistArea, { target: { value: authId } }); click('Save Checklist')
    click('Requirements / Вимоги'); click('+ Add requirement')
    expect(within(screen.getByRole('combobox', { name: 'Area' })).getByRole('option', { name: 'Auth' }).getAttribute('value')).toBe(authId)
    await project('QP Notes'); click('Checklists / Чеклісти'); click('+ Add checklist')
    expect(within(screen.getByRole('combobox', { name: 'Area' })).queryByRole('option', { name: 'Auth' })).toBeNull()
  })
})
