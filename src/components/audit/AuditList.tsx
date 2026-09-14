import { useContext } from 'react'
import { DictionaryContext } from './dictionaryContext'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowDown, ArrowUp, MoreHorizontal, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { auditSeverities, auditStatuses } from '@/data/auditMockData'
import type { AuditItem, AuditStatus, AuditType, Severity } from '@/types'

export type AuditSortKey = 'id' | 'area' | 'type' | 'severity' | 'status' | 'date'
export type AuditFilters = { search: string; area: string; type: AuditType | ''; severity: Severity | ''; status: AuditStatus | ''; from: string; to: string }

type Props = {
  items: AuditItem[]; selectedId: string; filtered: boolean; filters: AuditFilters; sort: { key: AuditSortKey; direction: 'asc' | 'desc' }
  onFiltersChange: (filters: AuditFilters) => void; onSort: (key: AuditSortKey) => void; onSelect: (id: string) => void
  onDateSort: (direction: 'asc' | 'desc') => void; onEdit: (item: AuditItem) => void; onDelete: (item: AuditItem) => void
}

const labels = { severity: auditSeverities, status: auditStatuses }

export function AuditList({ items, selectedId, filtered, filters, sort, onFiltersChange, onSort, onSelect, onEdit, onDelete, onDateSort }: Props) {
  const dictionary = useContext(DictionaryContext)
  const options = (kind: 'area' | 'type') => dictionary[kind].map(value => ({ value: value.id, label: value.name }))
  const patch = (value: Partial<AuditFilters>) => onFiltersChange({ ...filters, ...value })
  const clear = () => onFiltersChange({ search: '', area: '', type: '', severity: '', status: '', from: '', to: '' })
  const sortIcon = (key: AuditSortKey) => sort.key === key ? (sort.direction === 'asc' ? <ArrowUp /> : <ArrowDown />) : null
  const optionMenu = (label: string, key: 'area' | 'type' | 'severity' | 'status', options: { value: string; label: string }[]) => (
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="audit-header-button">{label}<SlidersHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem onSelect={() => patch({ [key]: '' })}>Усі</DropdownMenuItem><DropdownMenuSeparator />{options.map(option => <DropdownMenuCheckboxItem key={option.value} checked={filters[key] === option.value} onCheckedChange={() => patch({ [key]: filters[key] === option.value ? '' : option.value })}>{option.label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
  )
  return <section className="audit-list" aria-label="Зауваження Audit">
    <div className="audit-toolbar"><div className="audit-global-search"><Search /><Input aria-label="Пошук за ID або назвою" placeholder="Пошук за ID або назвою..." value={filters.search} onChange={event => patch({ search: event.target.value })} /></div>{filtered && <Button variant="ghost" size="sm" onClick={clear}>Очистити фільтри</Button>}<span className="muted audit-count">{items.length} зауважень</span></div>
      <div className="audit-list-scroll" tabIndex={0} aria-label="Таблиця зауважень"><div className="audit-table">
        <div className="audit-column-headings">
          <div className="audit-header-cell"><Button variant="ghost" size="sm" className="audit-header-button" onClick={() => onSort('id')}>ID{sortIcon('id')}</Button></div>
          <div className="audit-header-cell"><span>Зауваження</span></div>
          <div className="audit-header-cell">{optionMenu('Area', 'area', options('area'))}<Button className="audit-sort-only" variant="ghost" size="icon" aria-label="Сортувати Area" onClick={() => onSort('area')}>{sortIcon('area')}</Button></div>
          <div className="audit-header-cell">{optionMenu('Type', 'type', options('type'))}<Button className="audit-sort-only" variant="ghost" size="icon" aria-label="Сортувати Type" onClick={() => onSort('type')}>{sortIcon('type')}</Button></div>
          <div className="audit-header-cell">{optionMenu('Severity', 'severity', labels.severity)}<Button className="audit-sort-only" variant="ghost" size="icon" aria-label="Сортувати Severity" onClick={() => onSort('severity')}>{sortIcon('severity')}</Button></div>
          <div className="audit-header-cell">{optionMenu('Status', 'status', labels.status)}<Button className="audit-sort-only" variant="ghost" size="icon" aria-label="Сортувати Status" onClick={() => onSort('status')}>{sortIcon('status')}</Button></div>
          <div className="audit-header-cell"><Popover><PopoverTrigger asChild><Button variant="ghost" size="sm" className="audit-header-button">Date<SlidersHorizontal /></Button></PopoverTrigger><PopoverContent className="audit-date-popover">
            <p>Сортування</p>
            <RadioGroup aria-label="Сортування дати" value={sort.key === 'date' ? sort.direction : ''} onValueChange={value => onDateSort(value as 'asc' | 'desc')}>
              <label><RadioGroupItem value="desc" />Спочатку нові</label>
              <label><RadioGroupItem value="asc" />Спочатку старі</label>
            </RadioGroup>
            <p>Період</p>
            <label className="audit-date-field" htmlFor="audit-from">Від<Input id="audit-from" type="date" value={filters.from} onChange={event => patch({ from: event.target.value })} /></label>
            <label className="audit-date-field" htmlFor="audit-to">До<Input id="audit-to" type="date" value={filters.to} onChange={event => patch({ to: event.target.value })} /></label>
            <Button variant="outline" size="sm" onClick={() => { patch({ from: '', to: '' }); onDateSort('desc') }}>Скинути</Button>
          </PopoverContent></Popover></div>
          <div className="audit-header-cell">Task</div><span />
        </div>
        {items.map(item => <div key={item.id} className={`audit-row audit-compact-row ${item.id === selectedId ? 'audit-selected' : ''}`} onClick={() => onSelect(item.id)} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onSelect(item.id) }}>
          <span className="test-id">{item.id}</span><span className="audit-title">{item.title}</span><span>{dictionary.area.find(value => value.id === item.area)?.name || '—'}</span><span>{options('type').find(option => option.value === item.type)?.label || '—'}</span><span className={`audit-severity-${item.severity}`}>{labels.severity.find(option => option.value === item.severity)?.label}</span><span>{labels.status.find(option => option.value === item.status)?.label}</span><time dateTime={item.discoveredAt}>{item.discoveredAt.split('-').reverse().join('.')}</time>{/^(https?):\/\//i.test(item.taskUrl) ? <a className="audit-task" href={item.taskUrl} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}>↗</a> : <span className="muted">—</span>}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Дії із зауваженням ${item.id}`} onClick={event => event.stopPropagation()}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onEdit(item)}>Змінити</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}>Видалити</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>)}
      </div></div>
    {!items.length && <p className="empty-state muted">{filtered ? 'Немає зауважень із вибраними фільтрами.' : 'Зауважень поки немає. Додайте перше зауваження.'}</p>}
  </section>
}
