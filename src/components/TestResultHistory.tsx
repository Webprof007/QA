import { Button } from '@/components/ui/button'
import type { TestResult } from '@/types'

type Props = {
  results: TestResult[]
  editingId?: string
  onEdit: (result: TestResult) => void
}
const statusLabels = { pass: 'Pass', fail: 'Fail', blocked: 'Blocked' }

export function TestResultHistory({ results, editingId, onEdit }: Props) {
  return (
    <section className="result-history" aria-labelledby="history-title">
      <h3 id="history-title">История результатов</h3>
      {!results.length && (
        <p className="muted">Сохранённых результатов пока нет.</p>
      )}
      <ul>
        {[...results]
          .reverse()
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((result) => (
            <li
              key={result.id}
              className="history-entry"
              data-editing={editingId === result.id}
            >
              <div className="history-heading">
                <time dateTime={result.date}>
                  {result.date.split('-').reverse().join('.')}
                </time>
                <span
                  className={`result-status status-${result.status ?? 'empty'}`}
                >
                  {result.status ? statusLabels[result.status] : 'Без статуса'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(result)}
                  aria-label={`Изменить результат за ${result.date}`}
                >
                  Изменить
                </Button>
              </div>
              <p className="muted">
                {result.completed ? 'Проверено' : 'Не проверено'}
              </p>
              {result.comment && (
                <p className="history-comment">{result.comment}</p>
              )}
              {/^https?:\/\//i.test(result.taskUrl) && (
                <a
                  href={result.taskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="task-link"
                >
                  {result.taskUrl}
                </a>
              )}
            </li>
          ))}
      </ul>
    </section>
  )
}
