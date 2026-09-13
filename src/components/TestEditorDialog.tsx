import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { TestCase } from '@/types'

type Props = {
  test: TestCase | null
  tests: TestCase[]
  onSave: (test: TestCase) => void
  onClose: () => void
}

export function TestEditorDialog({ test, tests, onSave, onClose }: Props) {
  const [id, setId] = useState(test?.id ?? '')
  const [title, setTitle] = useState(test?.title ?? '')
  const [profile, setProfile] = useState(test?.profile ?? 'Core')
  const [minutes, setMinutes] = useState(String(test?.estimatedMinutes ?? 1))
  const [steps, setSteps] = useState(test?.steps.join('\n') ?? '')
  const [expectedResults, setExpectedResults] = useState(
    test?.expectedResults.join('\n') ?? '',
  )
  const [error, setError] = useState('')
  const lines = (text: string) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id.trim() || !title.trim() || !profile.trim()) {
      setError('Заполните ID, название и профиль.')
      return
    }
    if (
      tests.some(
        (current) =>
          current.id.toLowerCase() === id.trim().toLowerCase() &&
          current.id !== test?.id,
      )
    ) {
      setError('Тест с таким ID уже существует.')
      return
    }
    if (!Number.isInteger(Number(minutes)) || Number(minutes) < 1) {
      setError('Укажите целое число минут от 1.')
      return
    }
    onSave({
      id: id.trim(),
      title: title.trim(),
      profile: profile.trim(),
      estimatedMinutes: Number(minutes),
      steps: lines(steps),
      expectedResults: lines(expectedResults),
      results: test?.results ?? [],
    })
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="editor-dialog">
        <DialogHeader>
          <DialogTitle>{test ? 'Изменить тест' : 'Добавить тест'}</DialogTitle>
          <DialogDescription>
            Каждый шаг и ожидаемый результат укажите с новой строки.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="test-editor-form">
          <div className="field">
            <label htmlFor="test-id">ID</label>
            <Input
              id="test-id"
              value={id}
              required
              onChange={(event) => setId(event.target.value)}
              placeholder="SMK-…-001"
            />
          </div>
          <div className="field">
            <label htmlFor="test-title">Проверка</label>
            <Input
              id="test-title"
              value={title}
              required
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="editor-columns">
            <div className="field">
              <label htmlFor="test-profile">Профиль</label>
              <Input
                id="test-profile"
                value={profile}
                required
                onChange={(event) => setProfile(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="test-minutes">Ориентир, мин</label>
              <Input
                id="test-minutes"
                type="number"
                min="1"
                step="1"
                value={minutes}
                required
                onChange={(event) => setMinutes(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="test-steps">Что проверить</label>
            <Textarea
              id="test-steps"
              rows={3}
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="test-expected">Ожидаемый результат</label>
            <Textarea
              id="test-expected"
              rows={3}
              value={expectedResults}
              onChange={(event) => setExpectedResults(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">Сохранить тест</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
