// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const guest = () => response({ success: false }, 401)
const success = () => response({ success: true, message: 'Password has been reset' })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
const passwords = (password = 'NewPassword123!', confirmation = password) => { change('Новий пароль', password); change('Підтвердіть пароль', confirmation) }
const submitReset = () => fireEvent.submit(screen.getByRole('button', { name: 'Змінити пароль' }).closest('form')!)
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/') })

describe('Password recovery', () => {
  it.each(['existing@example.com', 'unknown@example.com'])('sends %s and shows the same generic confirmation without CAPTCHA', async email => {
    const fetchMock = vi.fn().mockResolvedValueOnce(guest()).mockResolvedValueOnce(response({ success: true, message: 'If an account exists, a reset link has been sent.' }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />); await screen.findByLabelText('Email'); click('Забули пароль?')
    change('Email', email); click('Надіслати посилання')
    expect(await screen.findByRole('heading', { name: 'Перевірте пошту' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe(`Якщо обліковий запис із адресою ${email} існує, ми надіслали посилання для відновлення пароля.`)
    expect(fetchMock).toHaveBeenLastCalledWith('https://api.smart-it.site/auth/forgot-password.php', expect.objectContaining({ method: 'POST', credentials: 'include', body: JSON.stringify({ email }) }))
    click('Повернутися до входу'); expect(screen.getByLabelText('Пароль')).toBeTruthy()
  })

  it('validates passwords, resets with URL token ahead of an active session, removes query and returns to login', async () => {
    window.history.replaceState(null, '', '/?resetPassword=secret-token&keep=yes#section')
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ success: true, user: { id: 1, name: 'Session User', email: 'user@example.com', emailVerified: true } })).mockResolvedValueOnce(success())
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Новий пароль' })).toBeTruthy()
    await act(async () => {})
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(document.body.textContent).not.toContain('secret-token')
    passwords('short'); submitReset()
    expect(screen.getByRole('alert').textContent).toContain('8 символів')
    passwords('NewPassword123!', 'OtherPassword'); submitReset()
    expect(screen.getByRole('alert').textContent).toBe('Паролі не збігаються.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    passwords(); click('Змінити пароль')
    expect(await screen.findByRole('heading', { name: 'Пароль змінено' })).toBeTruthy()
    expect(fetchMock).toHaveBeenLastCalledWith('https://api.smart-it.site/auth/reset-password.php', expect.objectContaining({ credentials: 'include', method: 'POST', body: JSON.stringify({ token: 'secret-token', password: 'NewPassword123!' }) }))
    expect(window.location.search).toBe('?keep=yes'); expect(window.location.hash).toBe('#section')
    expect(storage).not.toHaveBeenCalled()
    click('Повернутися до входу')
    expect(screen.getByRole('heading', { name: 'Вхід до облікового запису' })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('handles expired links and requests a new link without reusing the token', async () => {
    window.history.replaceState(null, '', '/?resetPassword=expired')
    const fetchMock = vi.fn().mockResolvedValueOnce(guest()).mockResolvedValueOnce(response({ success: false, message: 'Reset link is invalid or expired' }, 400)).mockResolvedValueOnce(success())
    vi.stubGlobal('fetch', fetchMock)
    render(<App />); passwords(); click('Змінити пароль')
    expect(await screen.findByRole('heading', { name: 'Посилання недійсне або термін його дії минув' })).toBeTruthy()
    expect(screen.queryByLabelText('Новий пароль')).toBeNull()
    expect(window.location.search).toBe('')
    click('Запросити нове посилання'); change('Email', 'user@example.com'); click('Надіслати посилання')
    await screen.findByRole('heading', { name: 'Перевірте пошту' })
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/reset-password.php'))).toHaveLength(1)
  })

  it('treats an empty reset parameter as an invalid link', () => {
    window.history.replaceState(null, '', '/?resetPassword=')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(guest()))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Посилання недійсне або термін його дії минув' })).toBeTruthy()
  })

  it('disables requests while pending and reports server errors in Ukrainian', async () => {
    let resolve!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(guest()).mockImplementationOnce(() => new Promise<Response>(r => { resolve = r })))
    render(<App />); await screen.findByLabelText('Email'); click('Забули пароль?'); change('Email', 'user@example.com'); click('Надіслати посилання')
    expect((screen.getByRole('button', { name: 'Зачекайте…' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => resolve(response({ success: false, message: 'Unable to reset password' }, 500)))
    expect((await screen.findByRole('alert')).textContent).toBe('Не вдалося виконати запит. Спробуйте ще раз.')
    expect((screen.getByRole('button', { name: 'Надіслати посилання' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
