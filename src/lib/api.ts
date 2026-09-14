const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://api.smart-it.site').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: options.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError('Не вдалося з’єднатися із сервером. Спробуйте ще раз.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data || data.success !== true) {
    throw new ApiError(typeof data?.message === 'string' ? data.message : 'Не вдалося виконати запит. Спробуйте ще раз.', response.status)
  }
  return data as T
}

export const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Не вдалося виконати запит. Спробуйте ще раз.'
