import { useEffect, useState } from 'react'
import { apiRequest, ApiError, errorMessage } from '@/lib/api'
import type { LoginInput, RegisterInput } from '@/pages/AuthPage'

export type AuthUser = {
  id: number
  name: string
  email: string
  emailVerified: boolean
  createdAt?: string
}
type UserResponse = { success: true; user: AuthUser; verificationEmailSent?: boolean }

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [initialError, setInitialError] = useState('')

  async function refreshUser(signal?: AbortSignal) {
    try {
      const result = await apiRequest<UserResponse>('/auth/me.php', { signal })
      if (!signal?.aborted) setUser(result.user)
      return result.user
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (!signal?.aborted) setUser(null)
        return null
      }
      throw error
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void apiRequest<UserResponse>('/auth/me.php', { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setUser(result.user)
    }).catch(error => {
      if (!controller.signal.aborted && !(error instanceof ApiError && error.status === 401)) setInitialError(errorMessage(error))
    }).finally(() => {
      if (controller.signal.aborted) return
      const url = new URL(window.location.href)
      if (url.searchParams.get('emailVerified') === '1') {
        url.searchParams.delete('emailVerified')
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
      }
      setIsAuthLoading(false)
    })
    return () => controller.abort()
  }, [])

  async function retry() {
    setIsAuthLoading(true)
    setInitialError('')
    try { await refreshUser() } catch (error) { setInitialError(errorMessage(error)) }
    finally { setIsAuthLoading(false) }
  }

  async function authenticate(endpoint: string, input: LoginInput | RegisterInput) {
    try {
      const body = endpoint === 'register' ? input : { email: input.email, password: input.password, captchaToken: input.captchaToken }
      const result = await apiRequest<UserResponse>(`/auth/${endpoint}.php`, { method: 'POST', body })
      setUser(result.user)
      return null
    } catch (error) { return errorMessage(error) }
  }

  async function logout() {
    await apiRequest('/auth/logout.php', { method: 'POST' })
    setUser(null)
  }

  async function resendVerification() {
    const result = await apiRequest<{ success: true; message?: string; emailVerified?: boolean }>('/auth/resend-verification.php', { method: 'POST' })
    if (result.emailVerified === true) await refreshUser()
    return result.message ?? (result.emailVerified ? '' : 'Verification email sent.')
  }

  const status = isAuthLoading ? 'loading' : !user ? 'unauthenticated' : user.emailVerified === true ? 'authenticated_verified' : 'authenticated_unverified'
  return { user, status, isAuthLoading, initialError, retry, login: (input: LoginInput) => input.captchaToken?.trim() ? authenticate('login', input) : Promise.resolve('Bot verification failed. Please try again.'), register: (input: RegisterInput) => input.captchaToken?.trim() ? authenticate('register', input) : Promise.resolve('Bot verification failed. Please try again.'), logout, refreshUser, resendVerification }
}
