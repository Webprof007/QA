import { MoreHorizontal } from 'lucide-react'
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { TestCase } from '@/types'

type Props = {
  test: TestCase
  selected: boolean
  panelOpen: boolean
  onOpenPanel: () => void
  onEdit: () => void
  onDelete: () => void
}

export function TestItem({
  test,
  selected,
  panelOpen,
  onOpenPanel,
  onEdit,
  onDelete,
}: Props) {
  return (
    <AccordionItem
      value={test.id}
      className={selected ? 'test-item selected' : 'test-item'}
    >
      <div className="test-row">
        <AccordionTrigger
          className="test-trigger hover:no-underline"
          aria-label={`${test.id} ${test.title}, ${test.profile}, ${test.estimatedMinutes} хв`}
        >
          <span className="test-summary">
            <span className="test-id">{test.id}</span>
            <span className="test-title">{test.title}</span>
            <span className="test-profile">{test.profile}</span>
            <span className="test-time">{test.estimatedMinutes} хв</span>
          </span>
        </AccordionTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Действия с тестом ${test.id}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Изменить</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AccordionContent className="test-details">
        <h3>Что проверить</h3>
        {test.steps.length ? (
          <ol>
            {test.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">Описание теста пока не добавлено.</p>
        )}
        <h3>Ожидаемый результат</h3>
        {test.expectedResults.length ? (
          <ol>
            {test.expectedResults.map((result, index) => (
              <li key={index}>{result}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">Описание теста пока не добавлено.</p>
        )}
        {!panelOpen && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onOpenPanel}
          >
            Результаты
          </Button>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
