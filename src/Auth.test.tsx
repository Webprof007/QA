// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

vi.mock('@/lib/qaApi', () => ({ loadProjects: async () => [] }))

type WidgetOptions = Parameters<NonNullable<Window['turnstile']>['render']>[1]
let widgetOptions: WidgetOptions
const resetCaptcha = vi.fn()
const renderCaptcha = vi.fn((_container: HTMLElement, options: WidgetOptions) => { widgetOptions = options; return 'widget-1' })
beforeEach(() => {
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-public-key')
  vi.stubGlobal('turnstile', { render: renderCaptcha, reset: resetCaptcha, remove: vi.fn() })
  resetCaptcha.mockClear(); renderCaptcha.mockClear()
})
async function passCaptcha() {
  await waitFor(() => expect(renderCaptcha).toHaveBeenCalled())
  act(() => widgetOptions.callback('captcha-test-token'))
}
const user = { id: 27, name: 'API User', email: 'api@example.com', emailVerified: true }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const guest = () => response({ success: false, message: 'Unauthorized' }, 401)
const ok = (verified = true) => response({ success: true, user: { ...user, emailVerified: verified } })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const loginForm = async () => { change('Email', user.email); change('Пароль', 'password123'); await passCaptcha(); click('Увійти') }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); window.history.replaceState(null, '', '/') })

describe('PHP session authentication', () => {
  it('waits for me without flashing login or QA and restores the verified session', async () => {
    let resolve!: (value: Response) => void
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>(r => { resolve = r }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect(screen.getByRole('status').textContent).toContain('Завантаження')
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByLabelText('Email')).toBeNull()
    await act(async () => resolve(ok()))
    expect(await screen.findByText(user.name)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('https://api.smart-it.site/auth/me.php', expect.objectContaining({ credentials: 'include', method: 'GET' }))
  })

  it('registers through API, blocks unverified access, handles resend 429 and checks verification', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(guest()).mockResolvedValueOnce(ok(false))
      .mockResolvedValueOnce(response({ success: false, message: 'Please wait before requesting another email' }, 429))
      .mockResolvedValueOnce(response({ success: true, message: 'Verification email sent' }))
      .mockResolvedValueOnce(ok(false)).mockResolvedValueOnce(ok())
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByLabelText('Email')
    click('Створити обліковий запис')
    change('Ім’я', user.name); change('Email', user.email); change('Пароль', 'password123'); change('Повторіть пароль', 'password123')
    await passCaptcha()
    click('Зареєструватися')
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy()
    expect(screen.getByText(user.email)).toBeTruthy()
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/auth/register.php'), expect.objectContaining({ method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: user.name, email: user.email, password: 'password123', captchaToken: 'captcha-test-token' }) }))
    click('Resend email')
    expect((await screen.findByRole('alert')).textContent).toBe('Please wait before requesting another email')
    click('Resend email')
    expect(await screen.findByText('Verification email sent')).toBeTruthy()
    click('Check again')
    expect(await screen.findByText('Email is not confirmed yet.')).toBeTruthy()
    click('Check again')
    expect(await screen.findByText(user.name)).toBeTruthy()
    for (const [, options] of fetchMock.mock.calls) expect(options.credentials).toBe('include')
  })

  it('logs in, preserves the user on failed logout, logs out and supports unverified login', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(guest()).mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(response({ success: false, message: 'Logout failed' }, 500))
      .mockResolvedValueOnce(response({ success: true })).mockResolvedValueOnce(ok(false))
      .mockResolvedValueOnce(response({ success: true }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />); await screen.findByLabelText('Email'); await loginForm()
    await screen.findByText(user.name); click('Вийти')
    expect((await screen.findByRole('alert')).textContent).toBe('Logout failed')
    expect(screen.getByText(user.name)).toBeTruthy()
    click('Вийти'); await screen.findByLabelText('Email'); await loginForm()
    await screen.findByRole('heading', { name: 'Check your email' }); click('Logout')
    await screen.findByLabelText('Email')
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/logout.php'), expect.objectContaining({ method: 'POST', credentials: 'include' }))
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/login.php'), expect.objectContaining({ body: JSON.stringify({ email: user.email, password: 'password123', captchaToken: 'captcha-test-token' }) }))
  })

  it('checks me after resend reports already verified', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok(false)).mockResolvedValueOnce(response({ success: true, emailVerified: true })).mockResolvedValueOnce(ok())
    vi.stubGlobal('fetch', fetchMock)
    render(<App />); await screen.findByText('Resend email'); click('Resend email')
    expect(await screen.findByText(user.name)).toBeTruthy()
    expect(fetchMock.mock.calls[2][0]).toContain('/auth/me.php')
  })

  it('cleans the verification redirect without losing other URL state', async () => {
    window.history.replaceState(null, '', '/?emailVerified=1&keep=yes#section')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()))
    render(<App />); await screen.findByText(user.name)
    expect(window.location.search).toBe('?keep=yes')
    expect(window.location.hash).toBe('#section')
  })

  it('shows retry on network failure and backend messages on login failure', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('technical stack')).mockResolvedValueOnce(guest())
      .mockResolvedValueOnce(response({ success: false, message: 'Invalid credentials' }, 422))
      .mockResolvedValueOnce(new Response('not JSON', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect((await screen.findByRole('alert')).textContent).not.toContain('technical stack')
    expect(screen.queryByLabelText('Email')).toBeNull()
    click('Спробувати ще раз'); await screen.findByLabelText('Email'); await loginForm()
    expect((await screen.findByRole('alert')).textContent).toBe('Invalid credentials')
    await loginForm()
    expect((await screen.findByRole('alert')).textContent).toContain('Не вдалося виконати запит')
  })
  it('disables registration while pending and displays duplicate-email API errors', async () => {
    let resolve!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(guest()).mockImplementationOnce(() => new Promise<Response>(r => { resolve = r })))
    render(<App />); await screen.findByLabelText('Email'); click('Створити обліковий запис')
    change('Ім’я', user.name); change('Email', user.email); change('Пароль', 'password123'); change('Повторіть пароль', 'password123')
    await passCaptcha()
    click('Зареєструватися')
    expect(screen.getByRole('button', { name: 'Зачекайте…' }).closest('fieldset')?.disabled).toBe(true)
    await act(async () => resolve(response({ success: false, message: 'Email already registered' }, 409)))
    expect((await screen.findByRole('alert')).textContent).toBe('Email already registered')
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(resetCaptcha).toHaveBeenCalledWith('widget-1')
    expect((screen.getByRole('button', { name: 'Зареєструватися' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('requires me confirmation on redirect and returns to login when a session expires', async () => {
    window.history.replaceState(null, '', '/?emailVerified=1')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok(false)).mockResolvedValueOnce(guest()))
    render(<App />); await screen.findByRole('heading', { name: 'Check your email' })
    expect(window.location.search).toBe('')
    expect(screen.queryByRole('navigation')).toBeNull()
    click('Check again'); await screen.findByLabelText('Email')
  })

  it('requires a fresh token, handles expiration/error and resets after backend 403', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(guest()).mockResolvedValueOnce(response({ success: false, message: 'Bot verification failed. Please try again.' }, 403))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />); await screen.findByLabelText('Email')
    await waitFor(() => expect(renderCaptcha).toHaveBeenCalled())
    click('Створити обліковий запис')
    change('Ім’я', user.name); change('Email', user.email); change('Пароль', 'password123'); change('Повторіть пароль', 'password123')
    const submit = screen.getByRole('button', { name: 'Зареєструватися' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.submit(submit.closest('form')!)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await passCaptcha(); expect(submit.disabled).toBe(false)
    act(() => widgetOptions['expired-callback']()); expect(submit.disabled).toBe(true)
    await passCaptcha()
    act(() => widgetOptions['error-callback']()); expect(submit.disabled).toBe(true)
    await passCaptcha(); click('Зареєструватися')
    expect((await screen.findByRole('alert')).textContent).toBe('Bot verification failed. Please try again.')
    expect(resetCaptcha).toHaveBeenCalledWith('widget-1')
    expect(submit.disabled).toBe(true)
    await passCaptcha(); expect(submit.disabled).toBe(false)
  })

  it('shows missing-key configuration error and blocks login and registration', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(guest()).mockResolvedValueOnce(ok()))
    render(<App />); await screen.findByLabelText('Email'); click('Створити обліковий запис')
    expect(screen.getByRole('alert').textContent).toContain('VITE_TURNSTILE_SITE_KEY')
    expect((screen.getByRole('button', { name: 'Зареєструватися' }) as HTMLButtonElement).disabled).toBe(true)
    click('Уже є обліковий запис? Увійти')
    expect((screen.getByRole('button', { name: 'Увійти' }) as HTMLButtonElement).disabled).toBe(true)
    expect(renderCaptcha).not.toHaveBeenCalled()
  })

  it.each([401, 403, 422, 500])('resets Login CAPTCHA after HTTP %s and prevents token reuse', async status => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    const message = status === 401 ? 'Invalid email or password' : status === 403 ? 'Bot verification failed. Please try again.' : 'Login failed'
    const fetchMock = vi.fn().mockResolvedValueOnce(guest()).mockResolvedValueOnce(response({ success: false, message }, status)).mockResolvedValueOnce(ok())
    vi.stubGlobal('fetch', fetchMock)
    render(<App />); await screen.findByLabelText('Email')
    await loginForm()
    expect((await screen.findByRole('alert')).textContent).toBe(message)
    expect(resetCaptcha).toHaveBeenCalledWith('widget-1')
    const button = screen.getByRole('button', { name: 'Увійти' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.submit(button.closest('form')!)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await passCaptcha(); click('Увійти')
    expect(await screen.findByText(user.name)).toBeTruthy()
    expect(storage).not.toHaveBeenCalled()
    storage.mockRestore()
  })

  it('requires valid email, password and CAPTCHA, and blocks on expiration or error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(guest())
    vi.stubGlobal('fetch', fetchMock)
    render(<App />); await screen.findByLabelText('Email')
    const button = () => screen.getByRole('button', { name: 'Увійти' }) as HTMLButtonElement
    await waitFor(() => expect(renderCaptcha).toHaveBeenCalled())
    expect(button().disabled).toBe(true)
    change('Email', user.email); change('Пароль', 'password123')
    expect(button().disabled).toBe(true)
    fireEvent.submit(button().closest('form')!); expect(fetchMock).toHaveBeenCalledTimes(1)
    await passCaptcha(); expect(button().disabled).toBe(false)
    change('Email', 'invalid'); expect(button().disabled).toBe(true)
    change('Email', ''); expect(button().disabled).toBe(true)
    change('Email', user.email); change('Пароль', ''); expect(button().disabled).toBe(true)
    change('Пароль', 'password123'); expect(button().disabled).toBe(false)
    act(() => widgetOptions['expired-callback']()); expect(button().disabled).toBe(true)
    await passCaptcha()
    act(() => widgetOptions['error-callback']()); expect(button().disabled).toBe(true)
  })

})
