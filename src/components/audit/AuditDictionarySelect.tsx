import { useContext, useState } from 'react'
import { DictionaryContext, type DictionaryKind } from './dictionaryContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function AuditDictionarySelect({ kind, value, onChange, id }: { kind: DictionaryKind; value: string; onChange: (value: string) => void; id: string }) {
  const dictionary = useContext(DictionaryContext)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | undefined>()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const label = kind === 'area' ? 'Area' : 'Type'
  const values = dictionary[kind]
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <Popover open={open} onOpenChange={next => { setOpen(next); setError(''); setEditing(undefined); setName('') }}>
      <PopoverTrigger asChild><Button id={id} variant="outline" role="combobox" aria-expanded={open} className="audit-dictionary-trigger">{values.find(option => option.id === value)?.name || 'Виберіть…'}</Button></PopoverTrigger>
      <PopoverContent className="audit-dictionary-popover">
        <Button variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false) }}>Не вказано</Button>
        <div className="audit-dictionary-values">{values.map(option => <div key={option.id} className="audit-dictionary-row">
          <Button variant="ghost" size="sm" onClick={() => { onChange(option.id); setOpen(false) }}>{option.name}</Button>
          <Button variant="ghost" size="sm" aria-label={`Перейменувати ${label} ${option.name}`} onClick={() => { setEditing(option.id); setName(option.name); setError('') }}>✎</Button>
          <Button variant="ghost" size="sm" disabled={pending} aria-label={`Видалити ${label} ${option.name}`} onClick={async () => { setPending(true); try { const message = await dictionary.remove(kind, option.id); setError(message); if (!message && editing === option.id) { setEditing(undefined); setName('') } } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося видалити значення.') } finally { setPending(false) } }}>×</Button>
        </div>)}</div>
        <label htmlFor={`${id}-name`}>{editing ? 'Нова назва' : `Додати ${label}`}</label>
        <Input id={`${id}-name`} value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault() }} />
        <Button size="sm" disabled={pending} onClick={async () => {
          if (!name.trim()) { setError('Введіть назву.'); return }
          if (values.some(option => option.id !== editing && option.name.toLowerCase() === name.trim().toLowerCase())) { setError('Таке значення вже існує.'); return }
          setPending(true)
          try {
          const savedId = await dictionary.save(kind, name.trim(), editing)
          if (!editing) onChange(savedId)
          setEditing(undefined); setName(''); setError('')
          } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти значення.') }
          finally { setPending(false) }
        }}>{editing ? 'Зберегти назву' : `Додати ${label}`}</Button>
        {error && <p role="alert" className="form-error">{error}</p>}
      </PopoverContent>
    </Popover>
  </div>
}
