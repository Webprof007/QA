import { joinRichTextBlocks, splitRichTextBlocks } from '@/lib/richText'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/rich-text/RichTextEditor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { SmokeTestCase } from '@/types'

type Props = {
  projectId: string
  smokeSuiteId: string
  test: SmokeTestCase | null
  tests: SmokeTestCase[]
  onSave: (test: SmokeTestCase) => void
  onClose: () => void
}

export function TestEditorDialog({ projectId, smokeSuiteId, test, tests, onSave, onClose }: Props) {
  const [id, setId] = useState(test?.id ?? '')
  const [title, setTitle] = useState(test?.title ?? '')
  const [profile, setProfile] = useState(test?.profile ?? 'Core')
  const [minutes, setMinutes] = useState(String(test?.estimatedMinutes ?? 1))
  const [steps, setSteps] = useState(joinRichTextBlocks(test?.steps ?? []))
  const [expectedResults, setExpectedResults] = useState(
    joinRichTextBlocks(test?.expectedResults ?? []),
  )
  const [error, setError] = useState('')
  const lines = splitRichTextBlocks
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id.trim() || !title.trim() || !profile.trim()) {
      setError('Заповніть ID, назву та профіль.')
      return
    }
    if (
      tests.some(
        (current) =>
          current.id.toLowerCase() === id.trim().toLowerCase() &&
          current.id !== test?.id,
      )
    ) {
      setError('Тест із таким ID уже існує.')
      return
    }
    if (!Number.isInteger(Number(minutes)) || Number(minutes) < 1) {
      setError('Укажіть цілу кількість хвилин від 1.')
      return
    }
    onSave({
      id: id.trim(),
      projectId,
      smokeSuiteId,
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
          <DialogTitle>{test ? 'Змінити тест' : 'Додати тест'}</DialogTitle>
          <DialogDescription>
            Кожен крок і очікуваний результат укажіть із нового рядка.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="test-editor-form">
          <div className="field">
            <label id="test-id-label" htmlFor="test-id">ID</label>
            <Input
              id="test-id"
              value={id}
              required
              onChange={(event) => setId(event.target.value)}
              placeholder="SMK-…-001"
            />
          </div>
          <div className="field">
            <label id="test-title-label" htmlFor="test-title">Перевірка</label>
            <Input
              id="test-title"
              value={title}
              required
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="editor-columns">
            <div className="field">
              <label id="test-profile-label" htmlFor="test-profile">Профіль</label>
              <Input
                id="test-profile"
                value={profile}
                required
                onChange={(event) => setProfile(event.target.value)}
              />
            </div>
            <div className="field">
              <label id="test-minutes-label" htmlFor="test-minutes">Орієнтир, хв</label>
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
            <label id="test-steps-label" htmlFor="test-steps">Що перевірити</label>
            <RichTextEditor
              id="test-steps"
              rows={3}
              value={steps}
              onValueChange={value => setSteps(value)}
            />
          </div>
          <div className="field">
            <label id="test-expected-label" htmlFor="test-expected">Очікуваний результат</label>
            <RichTextEditor
              id="test-expected"
              rows={3}
              value={expectedResults}
              onValueChange={value => setExpectedResults(value)}
            />
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Скасувати
            </Button>
            <Button type="submit">Зберегти тест</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
