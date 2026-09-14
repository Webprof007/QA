import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/rich-text/RichTextEditor'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ResultDraft } from '@/types'

type Props = {
  draft: ResultDraft
  onChange: (draft: ResultDraft) => void
  onSave: () => void
}

export function TestResultForm({ draft, onChange, onSave }: Props) {
  return (
    <form
      className="result-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <div className="result-top-row">
        <div className="field">
          <label id="result-date-label" htmlFor="result-date">Дата</label>
          <Input
            id="result-date"
            type="date"
            required
            value={draft.date}
            onChange={(event) =>
              onChange({ ...draft, date: event.target.value })
            }
          />
        </div>
        <div className="checkbox-field">
          <Checkbox
            id="result-completed"
            checked={draft.completed}
            onCheckedChange={(checked) =>
              onChange({ ...draft, completed: checked === true })
            }
          />
          <label id="result-completed-label" htmlFor="result-completed">Перевірено</label>
        </div>
      </div>
      <fieldset className="field">
        <legend>Результат</legend>
        <RadioGroup
          aria-label="Результат перевірки"
          value={draft.status ?? ''}
          onValueChange={(value) =>
            onChange({ ...draft, status: value as ResultDraft['status'] })
          }
          className="status-options"
        >
          {(['pass', 'fail', 'blocked'] as const).map((status) => (
            <label
              key={status}
              className={`status-option status-${status}`}
              data-selected={draft.status === status}
              htmlFor={`status-${status}`}
            >
              <RadioGroupItem id={`status-${status}`} value={status} />
              {status === 'pass'
                ? 'Pass'
                : status === 'fail'
                  ? 'Fail'
                  : 'Blocked'}
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      <div className="field">
        <label id="result-comment-label" htmlFor="result-comment">Коментар</label>
        <RichTextEditor
          id="result-comment"
          rows={4}
          placeholder="Нотатки щодо перевірки"
          value={draft.comment}
          onValueChange={value =>
            onChange({ ...draft, comment: value })
          }
        />
      </div>
      <div className="field">
        <label id="result-task-label" htmlFor="result-task">
          Посилання на задачу <span className="optional">· необов’язково</span>
        </label>
        <Input
          id="result-task"
          type="url"
          pattern="https?://.*"
          title="Введіть посилання, що починається з http:// або https://"
          placeholder="https://…"
          value={draft.taskUrl}
          onChange={(event) =>
            onChange({ ...draft, taskUrl: event.target.value })
          }
        />
      </div>
      <Button type="submit">
        {draft.id ? 'Зберегти зміни' : 'Зберегти результат'}
      </Button>
    </form>
  )
}
