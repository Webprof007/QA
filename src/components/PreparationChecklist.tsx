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
  items: PreparationItem[]
  onChange: (items: PreparationItem[]) => void
}

export function PreparationChecklist({ items, onChange }: Props) {
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
        <h2 id="preparation-title">Что нужно перед началом</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditor({ id: null, text: '' })}
        >
          <Plus />
          Добавить пункт
        </Button>
      </div>
      {items.length === 0 && !editor && (
        <p className="muted empty-preparation">
          Пока нет пунктов подготовки. Добавьте необходимые условия перед
          проверкой.
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
                    aria-label={`Действия: ${item.text}`}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => setEditor({ id: item.id, text: item.text })}
                  >
                    Изменить
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
                    Удалить
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
            aria-label="Текст пункта подготовки"
            placeholder="Что нужно подготовить?"
            value={editor.text}
            onChange={(event) =>
              setEditor({ ...editor, text: event.target.value })
            }
            required
          />
          <Button type="submit" size="sm" disabled={!editor.text.trim()}>
            Сохранить
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditor(null)}
          >
            Отмена
          </Button>
        </form>
      )}
    </section>
  )
}
