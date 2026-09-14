import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { Button } from '@/components/ui/button'

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; size: 'flexible'; 'response-field': false; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: TurnstileApi } }
let loading: Promise<TurnstileApi> | undefined
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loading) return loading
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error('Turnstile unavailable')) }
    const timer = setTimeout(fail, 15000)
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => { if (!window.turnstile) return fail(); clearTimeout(timer); resolve(window.turnstile) }
    script.onerror = fail
    document.head.appendChild(script)
  })
  return loading
}

export type TurnstileHandle = { reset: () => void }
export function TurnstileWidget({ ref, onTokenChange }: { ref?: Ref<TurnstileHandle>; onTokenChange: (token: string | null) => void }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useImperativeHandle(ref, () => ({ reset() {
    onTokenChange(null)
    if (widget.current) widget.current.api.reset(widget.current.id)
  } }), [onTokenChange])
  useEffect(() => {
    if (!siteKey) return
    let disposed = false
    const fail = () => { if (!disposed) { onTokenChange(null); setError(true) } }
    void loadTurnstile().then(api => {
      if (disposed || !container.current) return
      const id = api.render(container.current, {
        sitekey: siteKey, size: 'flexible', 'response-field': false,
        callback: token => { if (!disposed) { setError(false); onTokenChange(token) } },
        'expired-callback': () => { if (!disposed) onTokenChange(null) },
        'error-callback': fail,
      })
      widget.current = { api, id }
    }).catch(fail)
    return () => {
      disposed = true
      if (widget.current) { widget.current.api.remove(widget.current.id); widget.current = null }
    }
  }, [siteKey, onTokenChange, attempt])
  if (!siteKey) return <p role="alert" className="auth-error">Registration unavailable: configure VITE_TURNSTILE_SITE_KEY.</p>
  return <div className="auth-field">
    <div ref={container} />
    {error && <><p role="alert" className="auth-error">Bot verification failed. Please try again.</p><Button type="button" variant="link" onClick={() => { setError(false); onTokenChange(null); setAttempt(value => value + 1) }}>Try again</Button></>}
  </div>
}
