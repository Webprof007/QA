import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { SmokeSuite } from '@/types'

type Props = { suite?: SmokeSuite; onSave: (name: string) => void; onClose: () => void }
export function SmokeSuiteDialog({ suite, onSave, onClose }: Props) {
  const [name, setName] = useState(suite?.name ?? '')
  const [error, setError] = useState('')
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent>
    <DialogHeader><DialogTitle>{suite ? 'Перейменувати Smoke' : 'Додати Smoke'}</DialogTitle><DialogDescription>Укажіть назву набору тестів.</DialogDescription></DialogHeader>
    <form className="test-editor-form" onSubmit={event => { event.preventDefault(); if (!name.trim()) { setError('Введіть назву.'); return } onSave(name.trim()) }}>
      <div className="field"><label htmlFor="smoke-suite-name">Назва</label><Input id="smoke-suite-name" value={name} onChange={event => { setName(event.target.value); setError('') }} autoFocus required />{error && <p className="form-error" role="alert">{error}</p>}</div>
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Скасувати</Button><Button type="submit">Зберегти</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>
}
