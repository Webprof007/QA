import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Project } from '@/types'

type Props = {
  projects: Project[]
  onSave: (name: string) => string | null | Promise<string | null>
  onClose: () => void
}

export function ProjectCreateDialog({ projects, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim().replace(/\s+/g, ' ')
    if (!normalizedName) {
      setError('Введіть назву проєкту.')
      return
    }
    if (projects.some(project => project.name.toLowerCase() === normalizedName.toLowerCase())) {
      setError('Проєкт із такою назвою вже існує.')
      return
    }
    setPending(true)
    const message = await onSave(normalizedName)
    if (message) setError(message)
    setPending(false)
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Додати проєкт</DialogTitle>
          <DialogDescription>
            Новий проєкт буде доступний усім поточним користувачам. Розділ Smoke буде порожнім.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="test-editor-form">
          <div className="field">
            <label htmlFor="project-name">Назва проєкту</label>
            <Input
              id="project-name"
              value={name}
              required
              maxLength={100}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'project-name-error' : undefined}
              onChange={event => { setName(event.target.value); setError('') }}
            />
            {error && <p id="project-name-error" role="alert" className="form-error">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Скасувати</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Створення…' : 'Створити проєкт'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
