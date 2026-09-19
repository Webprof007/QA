const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://api.smart-it.site').replace(/\/$/, '')

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string>
  constructor(message: string, status = 0, errors?: Record<string, string>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export async function apiRequest<T>(path: string, options: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError('Не вдалося з’єднатися із сервером. Спробуйте ще раз.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data || data.success !== true) {
    throw new ApiError(typeof data?.message === 'string' ? data.message : 'Не вдалося виконати запит. Спробуйте ще раз.', response.status, data?.errors && typeof data.errors === 'object' ? data.errors : undefined)
  }
  return data as T
}

/** Multipart requests deliberately do not set Content-Type: the browser adds the boundary. */
export async function apiFormRequest<T>(path: string, form: FormData, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), { method: 'POST', credentials: 'include', cache: 'no-store', body: form, signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Не вдалося з’єднатися із сервером. Спробуйте ще раз.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data || data.success !== true) {
    throw new ApiError(typeof data?.message === 'string' ? data.message : 'Не вдалося виконати запит. Спробуйте ще раз.', response.status, data?.errors && typeof data.errors === 'object' ? data.errors : undefined)
  }
  return data as T
}

export const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Не вдалося виконати запит. Спробуйте ще раз.'

export function forgotPassword(input: { email: string; captchaToken: string }) {
  return apiRequest<{ success: true; message: string }>('/auth/forgot-password.php', { method: 'POST', body: input })
}

export function resetPassword(input: { token: string; password: string }) {
  return apiRequest<{ success: true; message: string }>('/auth/reset-password.php', { method: 'POST', body: input })
}
