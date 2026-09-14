import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from '@/App'

export async function renderAuthenticatedApp() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, user: { id: 42, name: 'Alena Minina', email: 'alena@example.com', emailVerified: true } }), { status: 200 })))
  render(<App />)
  await screen.findByRole('navigation', { name: 'Розділи застосунку' })
}
