import { Plus } from 'lucide-react'
import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { TestItem } from './TestItem'
import type { SmokeTestCase } from '@/types'

type Props = {
  tests: SmokeTestCase[]
  selectedId: string
  panelOpen: boolean
  onSelect: (id: string) => void
  onOpenPanel: () => void
  onAdd: () => void
  onEdit: (test: SmokeTestCase) => void
  onDelete: (test: SmokeTestCase) => void
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
        <h2 id="tests-title">Smoke-тести</h2>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus />
          Додати тест
        </Button>
      </div>
      <div className="test-columns column-headings" aria-hidden="true">
        <span>ID</span>
        <span>Перевірка</span>
        <span>Профіль</span>
        <span>Орієнтир</span>
        <span />
      </div>
      {tests.length === 0 ? (
        <p className="empty-state muted">
          Тестів поки немає. Додайте перший тест.
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
