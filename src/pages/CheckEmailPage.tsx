import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import type { useAuth } from '@/hooks/useAuth'
import './AuthPage.css'

export function CheckEmailPage({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function run(action: 'resend' | 'check' | 'logout') {
    if (pending) return
    setPending(action); setError(''); setMessage('')
    try {
      if (action === 'resend') setMessage(await auth.resendVerification())
      else if (action === 'logout') await auth.logout()
      else {
        const user = await auth.refreshUser()
        if (user && !user.emailVerified) setMessage('Email is not confirmed yet.')
      }
    } catch (error) { setError(errorMessage(error)) }
    finally { setPending('') }
  }
  return <main className="auth-page"><div className="auth-content">
    <p className="auth-brand">QA Tool</p><h1>Check your email</h1>
    <div className="auth-field">
      <p>Confirm your email to continue:</p><p style={{ overflowWrap: 'anywhere' }}>{auth.user?.email}</p>
      <Button disabled={!!pending} onClick={() => void run('resend')}>{pending === 'resend' ? 'Sending…' : 'Resend email'}</Button>
      <p>Already confirmed?</p>
      <Button variant="outline" disabled={!!pending} onClick={() => void run('check')}>{pending === 'check' ? 'Checking…' : 'Check again'}</Button>
      {message && <p role="status">{message}</p>}{error && <p role="alert" className="auth-error">{error}</p>}
      <Button variant="link" disabled={!!pending} onClick={() => void run('logout')}>{pending === 'logout' ? 'Зачекайте…' : 'Logout'}</Button>
    </div>
  </div></main>
}
