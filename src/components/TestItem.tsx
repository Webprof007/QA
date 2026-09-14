import { RichText } from '@/components/rich-text/RichText'
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
import type { SmokeTestCase } from '@/types'

type Props = {
  test: SmokeTestCase
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
              aria-label={`Дії з тестом ${test.id}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Змінити</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AccordionContent className="test-details">
        <h3>Що перевірити</h3>
        {test.steps.length ? (
          <ol>
            {test.steps.map((step, index) => (
              <li key={index}><RichText value={step} /></li>
            ))}
          </ol>
        ) : (
          <p className="muted">Опис тесту поки не додано.</p>
        )}
        <h3>Очікуваний результат</h3>
        {test.expectedResults.length ? (
          <ol>
            {test.expectedResults.map((result, index) => (
              <li key={index}><RichText value={result} /></li>
            ))}
          </ol>
        ) : (
          <p className="muted">Опис тесту поки не додано.</p>
        )}
        {!panelOpen && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onOpenPanel}
          >
            Результати
          </Button>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
