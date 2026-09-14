import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, errorMessage, forgotPassword, resetPassword } from '@/lib/api'
import './AuthPage.css'

function clearResetParameter() {
  const url = new URL(window.location.href)
  url.searchParams.delete('resetPassword')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export function PasswordRecoveryPage({ mode, onLogin, onForgot }: { mode: 'forgot' | 'reset'; onLogin: () => void; onForgot: () => void }) {
  const [token, setToken] = useState(() => mode === 'reset' ? new URLSearchParams(window.location.search).get('resetPassword') ?? '' : '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<'sent' | 'changed' | 'invalid' | null>(() => mode === 'reset' && !token ? 'invalid' : null)
  const leave = (next: () => void) => { setToken(''); clearResetParameter(); next() }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || result) return
    setError('')
    if (mode === 'reset') {
      if (password.length < 8) { setError('Пароль має містити щонайменше 8 символів.'); return }
      if (password !== confirmation) { setError('Паролі не збігаються.'); return }
      if (!token) { setResult('invalid'); return }
    }
    if (!event.currentTarget.reportValidity()) return
    setPending(true)
    try {
      if (mode === 'forgot') {
        await forgotPassword(email.trim())
        setResult('sent')
      } else {
        await resetPassword({ token, password })
        setToken(''); setPassword(''); setConfirmation(''); clearResetParameter()
        setResult('changed')
      }
    } catch (error) {
      if (mode === 'reset' && error instanceof ApiError && error.status === 400) {
        setToken(''); setPassword(''); setConfirmation(''); clearResetParameter(); setResult('invalid')
      } else {
        // Translate the documented contract errors without exposing account existence.
        setError(error instanceof ApiError && error.status === 422
          ? mode === 'forgot' ? 'Введіть коректну адресу email.' : 'Пароль має містити щонайменше 8 символів.'
          : error instanceof ApiError && error.status >= 500 ? 'Не вдалося виконати запит. Спробуйте ще раз.' : errorMessage(error))
      }
    } finally { setPending(false) }
  }

  const heading = result === 'sent' ? 'Перевірте пошту' : result === 'changed' ? 'Пароль змінено' : result === 'invalid' ? 'Посилання недійсне або термін його дії минув' : mode === 'forgot' ? 'Відновлення пароля' : 'Новий пароль'
  return <main className="auth-page"><div className="auth-content">
    <p className="auth-brand">QA Tool</p><h1>{heading}</h1>
    {result === 'sent' ? <p role="status" style={{ overflowWrap: 'anywhere' }}>Якщо обліковий запис із адресою {email.trim()} існує, ми надіслали посилання для відновлення пароля.</p>
      : result === 'changed' ? <p role="status">Ваш пароль успішно оновлено.</p>
      : result === 'invalid' ? <Button onClick={() => leave(onForgot)}>Запросити нове посилання</Button>
      : <form className="auth-form" onSubmit={submit}><fieldset disabled={pending}>
        {mode === 'forgot' ? <>
          <p>Введіть адресу email свого облікового запису.</p>
          <div className="auth-field"><label htmlFor="recovery-email">Email</label><Input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></div>
        </> : <>
          <div className="auth-field"><label htmlFor="new-password">Новий пароль</label><Input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} aria-describedby="recovery-hint" /></div>
          <div className="auth-field"><label htmlFor="confirm-password">Підтвердіть пароль</label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></div>
          <p id="recovery-hint" className="auth-hint">Щонайменше 8 символів.</p>
        </>}
        {error && <p role="alert" className="auth-error">{error}</p>}
        <Button className="auth-submit" type="submit" disabled={pending}>{pending ? 'Зачекайте…' : mode === 'forgot' ? 'Надіслати посилання' : 'Змінити пароль'}</Button>
      </fieldset></form>}
    <Button variant="link" className="auth-switch" disabled={pending} onClick={() => leave(onLogin)}>Повернутися до входу</Button>
  </div></main>
}
