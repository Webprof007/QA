// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
const panel = () => screen.getByRole('complementary', { name: 'Checklist panel' })
const runPanel = () => screen.getByRole('complementary', { name: 'Checklist run' })
async function project(name: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: /^Project:/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name }))
}
function createChecklist(title = 'Form checks') {
  click('New Checklist'); change('Title', title); change('Description', 'Check the form'); change('Item 1', 'Required fields'); click('Add item'); change('Item 2', 'Success message'); click('Save Checklist')
}

describe('Test Plan', () => {
  it('creates, edits, cancels and retains a plan through navigation, scoped to project', async () => {
    await renderAuthenticatedApp(); click('Test Plan')
    expect(screen.getByText('Плани тестування поки не створено.')).toBeTruthy()
    click('New Test Plan'); change('Title', 'Release validation'); change('Objective', 'Check critical flows'); change('Version', '2.0'); change('Status', 'Active'); change('Start date', '2026-09-14'); change('End date', '2026-09-15'); click('Save')
    expect(screen.getByText('Release validation')).toBeTruthy()
    click('Edit'); change('Objective', 'Discard me'); click('Cancel')
    expect(screen.queryByText('Discard me')).toBeNull()
    expect(screen.getByText('Check critical flows')).toBeTruthy()
    click('Edit'); change('Objective', 'Updated objective'); click('Save')
    click('Checklists'); click('Test Plan'); click('Open Release validation'); expect(screen.getByText('Updated objective')).toBeTruthy()
    await project('QP Notes'); expect(screen.queryByText('Release validation')).toBeNull(); click('New Test Plan'); change('Title', 'QP plan'); click('Save')
    await project('Voicli'); expect(screen.getByText('Release validation')).toBeTruthy(); expect(screen.queryByText('QP plan')).toBeNull()
  })
  it('keeps multiple plans and edits only the selected plan', async () => {
    await renderAuthenticatedApp(); click('Test Plan')
    for (const title of ['Regression', 'Release 1.0', 'Release 2.0']) {
      click('New Test Plan'); change('Title', title); change('Objective', `Objective for ${title}`); click('Save'); click('← Test Plans')
    }
    for (const title of ['Regression', 'Release 1.0', 'Release 2.0']) expect(screen.getByRole('button', { name: `Open ${title}` })).toBeTruthy()
    click('Open Release 1.0'); expect(screen.getByText('Objective for Release 1.0')).toBeTruthy()
    click('Edit'); change('Title', 'Discarded name'); click('Cancel'); expect(screen.queryByText('Discarded name')).toBeNull()
    click('Edit'); change('Title', 'Release 1.1'); change('Objective', 'Updated release'); click('Save'); click('← Test Plans')
    expect(screen.queryByRole('button', { name: 'Open Release 1.0' })).toBeNull()
    click('Open Regression'); expect(screen.getByText('Objective for Regression')).toBeTruthy(); click('← Test Plans')
    click('Open Release 2.0'); expect(screen.getByText('Objective for Release 2.0')).toBeTruthy()
    await project('QP Notes'); expect(screen.queryByText('Release 1.1')).toBeNull(); expect(screen.queryByText('Regression')).toBeNull()
    click('New Test Plan'); change('Title', 'QP plan'); click('Save')
    await project('Voicli'); expect(screen.queryByText('QP plan')).toBeNull(); click('Open Release 1.1'); expect(screen.getByText('Updated release')).toBeTruthy()
  })
  it('cancels creation and validates schedule', async () => {
    await renderAuthenticatedApp(); click('Test Plan'); click('New Test Plan'); click('Cancel'); click('New Test Plan')
    change('Start date', '2026-09-20'); change('End date', '2026-09-10'); click('Save')
    expect(screen.getByRole('alert').textContent).toContain('Дата завершення')
  })
})

describe('Checklist definitions and runs', () => {
  it('creates items, reorders, edits and isolates definitions', async () => {
    await renderAuthenticatedApp(); click('Checklists'); click('New Checklist'); change('Title', 'Form checks')
    click('Save Checklist'); expect(screen.getByRole('alert').textContent).toContain('заповнений пункт')
    change('Item 1', 'First'); click('Add item'); change('Item 2', 'Second'); click('Move item 2 up')
    expect((screen.getByLabelText('Item 1') as HTMLTextAreaElement).value).toBe('Second')
    click('Add item'); change('Item 3', 'Remove this'); click('Delete item 3'); click('Save Checklist')
    expect(within(panel()).getByText('1. Second')).toBeTruthy()
    click('Edit Checklist'); change('Title', 'Edited form checks'); change('Item 1', 'Revised'); click('Save Checklist'); click('Close checklist')
    expect(screen.getByRole('button', { name: 'Open Edited form checks' })).toBeTruthy()
    await project('QP Notes'); expect(screen.queryByText('Edited form checks')).toBeNull(); createChecklist('QP checks')
    await project('Voicli'); expect(screen.queryByText('QP checks')).toBeNull(); click('Open Edited form checks'); expect(within(panel()).getByText('1. Revised')).toBeTruthy()
  })
  it('creates independent runs, persists per-item results, completes read-only and retains snapshots', async () => {
    await renderAuthenticatedApp(); click('Checklists'); createChecklist(); click('Run Checklist')
    expect(within(runPanel()).getByText('Status: In Progress')).toBeTruthy()
    change('Result 1', 'Pass'); change('Comment 1', 'All fields checked'); change('Result 2', 'Fail')
    click('Close run'); click('Definition')
    expect(within(panel()).getByText('1. Required fields')).toBeTruthy(); expect(within(panel()).queryByText('All fields checked')).toBeNull()
    click('Runs'); click('Run 1'); expect((screen.getByLabelText('Comment 1') as HTMLTextAreaElement).value).toBe('All fields checked')
    click('Complete Run'); expect(within(runPanel()).getByText('Status: Completed')).toBeTruthy()
    expect(within(runPanel()).queryByRole('combobox')).toBeNull(); expect(within(runPanel()).queryByRole('textbox')).toBeNull(); expect(screen.queryByRole('button', { name: 'Complete Run' })).toBeNull()
    click('Close run'); expect(screen.getByRole('region', { name: 'Run history' })).toBeTruthy(); click('Definition'); click('Edit Checklist'); change('Item 1', 'New definition text'); click('Save Checklist')
    click('Runs'); click('Run 1'); expect(within(runPanel()).getByText('1. Required fields')).toBeTruthy(); expect(within(runPanel()).queryByText('New definition text')).toBeNull()
    click('Close run'); click('Run Checklist'); expect(within(runPanel()).getByText('1. New definition text')).toBeTruthy(); expect((screen.getByLabelText('Result 1') as HTMLSelectElement).value).toBe('Not Run')
    change('Result 1', 'Blocked'); change('Result 2', 'N/A'); click('Test Plan'); click('Checklists'); click('Open Form checks'); click('Runs'); click('Run 2')
    expect((screen.getByLabelText('Result 1') as HTMLSelectElement).value).toBe('Blocked')
    await project('QP Notes'); expect(screen.queryByRole('complementary')).toBeNull(); createChecklist('Other project'); click('Runs'); expect(screen.getByText('Проходжень поки немає.')).toBeTruthy()
    await project('Voicli'); click('Open Form checks'); click('Runs'); expect(screen.getByRole('button', { name: 'Run 1' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'Run 2' })).toBeTruthy()
  })
  it('shares project Area creation and rename with Requirements and protects a used Area', async () => {
    await renderAuthenticatedApp(); click('Checklists'); click('New Checklist'); change('Title', 'Shared Area checklist'); change('Item 1', 'Check settings')
    fireEvent.click(screen.getByRole('combobox', { name: 'Area' })); change('Додати Area', 'Shared settings'); click('Додати Area'); fireEvent.keyDown(document.activeElement!, { key: 'Escape' }); click('Save Checklist')
    click('Requirements'); click('+ Add requirement'); fireEvent.click(screen.getByRole('combobox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Shared settings' })).toBeTruthy()
    click('Видалити Area Shared settings'); expect(screen.getByRole('alert').textContent).toContain('іншому розділі')
    click('Перейменувати Area Shared settings'); change('Нова назва', 'Shared preferences'); click('Зберегти назву'); fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    click('Checklists'); click('Open Shared Area checklist'); expect(within(panel()).getByText('Shared preferences')).toBeTruthy()
    await project('QP Notes'); click('New Checklist'); fireEvent.click(screen.getByRole('combobox', { name: 'Area' })); expect(screen.queryByRole('button', { name: 'Shared preferences' })).toBeNull()
  })
})
