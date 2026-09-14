import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/auth/PasswordInput'
import './AuthPage.css'
import { TurnstileWidget, type TurnstileHandle } from '@/components/auth/TurnstileWidget'

export type AuthInput = {
  name: string
  email: string
  password: string
}

export type RegisterInput = AuthInput & { captchaToken: string }

type Props = {
  onForgotPassword: () => void
  onLogin: (input: AuthInput) => Promise<string | null>
  onRegister: (input: RegisterInput) => Promise<string | null>
}

export function AuthPage({ onLogin, onRegister, onForgotPassword }: Props) {
  const [registering, setRegistering] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captcha = useRef<TurnstileHandle>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || (registering && !captchaToken)) return
    setError('')
    if (registering && !name.trim()) {
      setError('Введіть ім’я.')
      return
    }
    if (registering && password !== confirmation) {
      setError('Паролі не збігаються.')
      return
    }
    setPending(true)
    try {
      const input = { name: name.trim(), email: email.trim().toLowerCase(), password }
      const message = await (registering ? onRegister({ ...input, captchaToken: captchaToken! }) : onLogin(input))
      if (message) { setError(message); if (registering) captcha.current?.reset() }
    } catch {
      if (registering) captcha.current?.reset()
      setError('Не вдалося виконати запит. Спробуйте ще раз.')
    } finally {
      setPending(false)
    }
  }

  function switchMode() {
    setCaptchaToken(null)
    setRegistering(current => !current)
    setPassword('')
    setConfirmation('')
    setError('')
  }

  return (
    <main className="auth-page">
      <div className="auth-content">
        <p className="auth-brand">QA Tool</p>
        <h1>{registering ? 'Реєстрація' : 'Вхід до облікового запису'}</h1>
        <form onSubmit={submit} className="auth-form">
          <fieldset disabled={pending}>
            {registering && (
              <div className="auth-field">
                <label htmlFor="auth-name">Ім’я</label>
                <Input id="auth-name" autoComplete="name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} />
              </div>
            )}
            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <Input id="auth-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
            </div>
            <div className="auth-field">
              <label htmlFor="auth-password">Пароль</label>
              <PasswordInput key={registering ? 'register-password' : 'login-password'} id="auth-password"  autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 8 : undefined} value={password} onChange={event => setPassword(event.target.value)} aria-describedby={registering ? 'password-hint' : undefined} />
              {registering && <p id="password-hint" className="auth-hint">Щонайменше 8 символів.</p>}
              {!registering && <Button type="button" variant="link" className="auth-forgot" disabled={pending} onClick={onForgotPassword}>Забули пароль?</Button>}
            </div>
            {registering && (
              <div className="auth-field">
                <label htmlFor="auth-confirmation">Повторіть пароль</label>
                <PasswordInput id="auth-confirmation"  autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} />
              </div>
            )}
            {registering && <TurnstileWidget ref={captcha} onTokenChange={setCaptchaToken} />}
            {error && <p role="alert" className="auth-error">{error}</p>}
            <Button type="submit" disabled={pending || (registering && !captchaToken)} className="auth-submit">{pending ? 'Зачекайте…' : registering ? 'Зареєструватися' : 'Увійти'}</Button>
          </fieldset>
        </form>
        <Button variant="link" onClick={switchMode} disabled={pending} className="auth-switch">
          {registering ? 'Уже є обліковий запис? Увійти' : 'Створити обліковий запис'}
        </Button>
      </div>
    </main>
  )
}
