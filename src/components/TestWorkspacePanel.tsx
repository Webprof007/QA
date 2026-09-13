import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TestResultForm } from './TestResultForm'
import { TestResultHistory } from './TestResultHistory'
import type { ResultDraft, TestCase, TestResult } from '@/types'

type Props = {
  test: TestCase
  draft: ResultDraft
  notice: string
  onChange: (draft: ResultDraft) => void
  onSave: () => void
  onClose: () => void
  onNew: () => void
  onEditResult: (result: TestResult) => void
}
export function TestWorkspacePanel({
  test,
  draft,
  notice,
  onChange,
  onSave,
  onClose,
  onNew,
  onEditResult,
}: Props) {
  return (
    <aside className="workspace-panel" aria-labelledby="workspace-title">
      <div className="panel-heading">
        <div>
          <p className="test-id">{test.id}</p>
          <h2 id="workspace-title">{test.title}</h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Закрыть рабочую панель"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <div className="section-heading form-heading">
        <h3>{draft.id ? 'Редактирование результата' : 'Новая проверка'}</h3>
        {draft.id && (
          <Button size="sm" variant="ghost" onClick={onNew}>
            <Plus />
            Новый результат
          </Button>
        )}
      </div>
      <TestResultForm draft={draft} onChange={onChange} onSave={onSave} />
      <p className="save-notice" role="status">
        {notice}
      </p>
      <TestResultHistory
        results={test.results}
        editingId={draft.id}
        onEdit={onEditResult}
      />
    </aside>
  )
}
