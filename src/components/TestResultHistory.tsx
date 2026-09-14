import { RichText } from '@/components/rich-text/RichText'
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
      <h3 id="history-title">Історія результатів</h3>
      {!results.length && (
        <p className="muted">Збережених результатів поки немає.</p>
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
                  {result.status ? statusLabels[result.status] : 'Без статусу'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(result)}
                  aria-label={`Змінити результат за ${result.date}`}
                >
                  Змінити
                </Button>
              </div>
              <p className="muted">
                {result.completed ? 'Перевірено' : 'Не перевірено'}
              </p>
              {result.comment && (
                <RichText className="history-comment" value={result.comment} />
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
