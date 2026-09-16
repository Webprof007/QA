// @vitest-environment jsdom
import { setFieldValue, fieldValue } from '@/test/fields'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, act } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'

let sequence = 0
const revoke = vi.fn()
beforeEach(() => {
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => `blob:evidence-${++sequence}`)
    static revokeObjectURL = revoke
  })
  revoke.mockClear()
})
afterEach(async () => { cleanup(); await Promise.resolve(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => setFieldValue(screen.getByLabelText(name), value)
const files = () => screen.getByLabelText('Evidence files')
const add = (...uploads: File[]) => fireEvent.change(files(), { target: { files: uploads } })
const image = () => new File(['image'], 'login.png', { type: 'image/png' })
const video = () => new File(['video'], 'mobile.mp4', { type: 'video/mp4' })
async function open() { await renderAuthenticatedApp(); click('Audit / Аудит'); click('AUDIT-001'); click('+ Add audit finding') }

describe('Audit Evidence attachments', () => {
  it('adds images and multiple files, opens preview, removes one and saves the others with a note', async () => {
    await open()
    add(image())
    const firstUrl = screen.getByRole('img', { name: 'login.png' }).getAttribute('src')
    expect(screen.getByRole('link', { name: 'Preview login.png' }).getAttribute('rel')).toBe('noopener noreferrer')
    add(video(), new File([''], 'other.webp', { type: 'image/webp' }))
    expect(screen.getByLabelText('mobile.mp4').tagName).toBe('VIDEO')
    expect(screen.getByLabelText('mobile.mp4').hasAttribute('controls')).toBe(true)
    click('Remove login.png')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledWith(firstUrl)
    expect(screen.queryByRole('img', { name: 'login.png' })).toBeNull()
    expect(screen.getByRole('img', { name: 'other.webp' })).toBeTruthy()
    change('Назва', 'Files finding')
    change('Evidence note', 'Only at 390px')
    click('Створити зауваження')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledTimes(1)
    click('Закрити панель Audit')
    fireEvent.click(screen.getByText('Files finding'))
    expect(fieldValue(screen.getByLabelText('Evidence note'))).toBe('Only at 390px')
    expect(screen.getByLabelText('mobile.mp4')).toBeTruthy()
    change('Назва', 'Edited finding')
    click('Зберегти зміни')
    click('Smoke / Смоук-тестування')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledTimes(1)
    click('Audit / Аудит'); click('AUDIT-001')
    fireEvent.click(screen.getByText('Edited finding'))
    const savedUrl = screen.getByRole('img', { name: 'other.webp' }).getAttribute('src')
    click('Remove other.webp')
    click('Зберегти зміни')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledWith(savedUrl)
    expect(screen.getByLabelText('mobile.mp4')).toBeTruthy()
  })

  it('releases abandoned new files, supports ordinary files and allows no evidence', async () => {
    await open()
    add(new File(['pdf'], 'document.pdf', { type: 'application/pdf' }))
    expect(screen.getByText('document.pdf')).toBeTruthy()
    add(image())
    const url = screen.getByRole('img', { name: 'login.png' }).getAttribute('src')
    click('Закрити панель Audit')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledWith(url)
    click('+ Add audit finding')
    change('Назва', 'No evidence')
    click('Створити зауваження')
    expect(screen.queryByRole('img')).toBeNull()
    change('Назва', 'Still no evidence')
    click('Зберегти зміни')
    expect(screen.getByRole('heading', { name: 'Still no evidence' })).toBeTruthy()
  })
})
