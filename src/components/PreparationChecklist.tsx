import { useState } from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { PreparationItem } from '@/types'

type Props = {
  projectId: string
  smokeSuiteId: string
  items: PreparationItem[]
  onChange: (items: PreparationItem[]) => void
}

export function PreparationChecklist({ projectId, smokeSuiteId, items, onChange }: Props) {
  const [editor, setEditor] = useState<{
    id: string | null
    text: string
  } | null>(null)
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor?.text.trim()) return
    if (editor.id) {
      onChange(
        items.map((item) =>
          item.id === editor.id ? { ...item, text: editor.text.trim() } : item,
        ),
      )
    } else {
      onChange([
        ...items,
        {
          id: crypto.randomUUID(),
          projectId,
          smokeSuiteId,
          text: editor.text.trim(),
          checked: false,
          sortOrder: Math.max(-1, ...items.map((item) => item.sortOrder)) + 1,
        },
      ])
    }
    setEditor(null)
  }
  return (
    <section className="preparation" aria-labelledby="preparation-title">
      <div className="section-heading">
        <h2 id="preparation-title">Що потрібно перед початком</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditor({ id: null, text: '' })}
        >
          <Plus />
          Додати пункт
        </Button>
      </div>
      {items.length === 0 && !editor && (
        <p className="muted empty-preparation">
          Поки немає пунктів підготовки. Додайте необхідні умови перед
          перевіркою.
        </p>
      )}
      <ul className="preparation-list">
        {[...items]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => (
            <li key={item.id} className="preparation-row">
              <Checkbox
                id={`prep-${item.id}`}
                checked={item.checked}
                onCheckedChange={(checked) =>
                  onChange(
                    items.map((current) =>
                      current.id === item.id
                        ? { ...current, checked: checked === true }
                        : current,
                    ),
                  )
                }
              />
              <label
                htmlFor={`prep-${item.id}`}
                className={item.checked ? 'checked-label' : ''}
              >
                {item.text}
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Дії: ${item.text}`}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => setEditor({ id: item.id, text: item.text })}
                  >
                    Змінити
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      onChange(
                        items.filter((current) => current.id !== item.id),
                      )
                      if (editor?.id === item.id) setEditor(null)
                    }}
                  >
                    Видалити
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
      </ul>
      {editor && (
        <form onSubmit={save} className="preparation-editor">
          <Input
            autoFocus
            aria-label="Текст пункту підготовки"
            placeholder="Що потрібно підготувати?"
            value={editor.text}
            onChange={(event) =>
              setEditor({ ...editor, text: event.target.value })
            }
            required
          />
          <Button type="submit" size="sm" disabled={!editor.text.trim()}>
            Зберегти
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditor(null)}
          >
            Скасувати
          </Button>
        </form>
      )}
    </section>
  )
}
