// @vitest-environment jsdom
import { setFieldValue, fieldValue } from '@/test/fields'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within, act } from '@testing-library/react'
import { renderAuthenticatedApp } from '@/test/renderAuthenticatedApp'
import { evidenceFileType } from '@/lib/auditEvidenceUrls'

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
async function open() { await renderAuthenticatedApp(); click('Audit'); click('Додати зауваження') }

describe('Audit Evidence attachments', () => {
  it('classifies supported images and videos and checks MOV browser support', async () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp']) expect(evidenceFileType(new File([''], 'file', { type: mime }))).toBe('image')
    for (const mime of ['video/mp4', 'video/webm']) expect(evidenceFileType(new File([''], 'file', { type: mime }))).toBe('video')
    const canPlay = vi.spyOn(HTMLMediaElement.prototype, 'canPlayType')
    canPlay.mockReturnValue('')
    expect(evidenceFileType(new File([''], 'file.mov', { type: 'video/quicktime' }))).toBeNull()
    canPlay.mockReturnValue('maybe')
    expect(evidenceFileType(new File([''], 'file.mov', { type: 'video/quicktime' }))).toBe('video')
    canPlay.mockRestore()
    expect(evidenceFileType(new File([''], 'file.pdf', { type: 'application/pdf' }))).toBeNull()
  })

  it('adds images and multiple files, opens preview, removes one and saves the others with a note', async () => {
    await open()
    add(image())
    const firstUrl = screen.getByRole('img', { name: 'login.png' }).getAttribute('src')
    click('Preview login.png')
    expect(within(screen.getByRole('dialog')).getByRole('img', { name: 'login.png' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.drop(screen.getByText('або перетягніть файли'), { dataTransfer: { files: [video(), new File([''], 'other.webp', { type: 'image/webp' })] } })
    expect(screen.getByLabelText('mobile.mp4').tagName).toBe('VIDEO')
    expect(screen.getByLabelText('mobile.mp4').hasAttribute('controls')).toBe(true)
    click('Видалити файл login.png')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledWith(firstUrl)
    expect(screen.queryByRole('img', { name: 'login.png' })).toBeNull()
    expect(screen.getByRole('img', { name: 'other.webp' })).toBeTruthy()
    change('Назва', 'Files finding')
    change('Note', 'Only at 390px')
    click('Створити зауваження')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledTimes(1)
    click('Закрити панель Audit')
    fireEvent.click(screen.getByText('Files finding'))
    expect(fieldValue(screen.getByLabelText('Note'))).toBe('Only at 390px')
    expect(screen.getByLabelText('mobile.mp4')).toBeTruthy()
    change('Назва', 'Edited finding')
    click('Зберегти зміни')
    click('Smoke')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledTimes(1)
    click('Audit')
    fireEvent.click(screen.getByText('Edited finding'))
    const savedUrl = screen.getByRole('img', { name: 'other.webp' }).getAttribute('src')
    click('Видалити файл other.webp')
    click('Зберегти зміни')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledWith(savedUrl)
    expect(screen.getByLabelText('mobile.mp4')).toBeTruthy()
  })

  it('releases abandoned new files, rejects unsupported files and allows no evidence', async () => {
    await open()
    add(new File([''], 'bad.pdf', { type: 'application/pdf' }))
    expect(screen.getByRole('alert').textContent).toContain('bad.pdf')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    add(image())
    const url = screen.getByRole('img', { name: 'login.png' }).getAttribute('src')
    click('Закрити панель Audit')
    await act(async () => { await Promise.resolve() })
    expect(revoke).toHaveBeenCalledWith(url)
    click('Додати зауваження')
    change('Назва', 'No evidence')
    click('Створити зауваження')
    expect(screen.queryByRole('img')).toBeNull()
    change('Назва', 'Still no evidence')
    click('Зберегти зміни')
    expect(screen.getByRole('heading', { name: 'Still no evidence' })).toBeTruthy()
  })
})
