import { Plus } from 'lucide-react'
import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { TestItem } from './TestItem'
import type { TestCase } from '@/types'

type Props = {
  tests: TestCase[]
  selectedId: string
  panelOpen: boolean
  onSelect: (id: string) => void
  onOpenPanel: () => void
  onAdd: () => void
  onEdit: (test: TestCase) => void
  onDelete: (test: TestCase) => void
}

export function TestList({
  tests,
  selectedId,
  panelOpen,
  onSelect,
  onOpenPanel,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  return (
    <section className="test-list" aria-labelledby="tests-title">
      <div className="section-heading tests-heading">
        <h2 id="tests-title">Smoke-тесты</h2>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus />
          Добавить тест
        </Button>
      </div>
      <div className="test-columns column-headings" aria-hidden="true">
        <span>ID</span>
        <span>Проверка</span>
        <span>Профиль</span>
        <span>Ориентир</span>
        <span />
      </div>
      {tests.length === 0 ? (
        <p className="empty-state muted">
          Тестов пока нет. Добавьте первый тест.
        </p>
      ) : (
        <Accordion
          type="single"
          collapsible
          value={selectedId}
          onValueChange={onSelect}
        >
          {tests.map((test) => (
            <TestItem
              key={test.id}
              test={test}
              selected={test.id === selectedId}
              panelOpen={panelOpen}
              onOpenPanel={onOpenPanel}
              onEdit={() => onEdit(test)}
              onDelete={() => onDelete(test)}
            />
          ))}
        </Accordion>
      )}
    </section>
  )
}
