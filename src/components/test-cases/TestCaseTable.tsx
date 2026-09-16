import { AddEntityButton } from '@/components/AddEntityButton'
import { ArrowDown, ArrowUp, SlidersHorizontal, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import type { TestCase, TestCaseDictionaryValue } from '@/types'
import { priorities, statuses } from './testCaseOptions'
import type { ReactNode } from 'react'

export type CaseFilters = { search: string; areaId: string; typeId: string; priority: string; status: string }
export type CaseSort = { key: 'code' | 'title' | 'areaId' | 'typeId' | 'priority' | 'status'; direction: 'asc' | 'desc' }
type Props = {
  items: TestCase[]; areas: TestCaseDictionaryValue[]; types: TestCaseDictionaryValue[]
  selectedId?: string; filters: CaseFilters; sort: CaseSort
  onFilters: (filters: CaseFilters) => void; onSort: (sort: CaseSort) => void
  onOpen: (item: TestCase) => void; onEdit: (item: TestCase) => void; onDelete: (item: TestCase) => void
  onAdd: () => void; importExportActions?: ReactNode
}
export function TestCaseTable({ items, areas, types, selectedId, filters, sort, onFilters, onSort, onOpen, onEdit, onDelete, onAdd, importExportActions }: Props) {
  const filtered = Object.values(filters).some(Boolean)
  const options = {
    areaId: areas.map(value => ({ value: value.id, label: value.name })),
    typeId: types.map(value => ({ value: value.id, label: value.name })),
    priority: priorities, status: statuses,
  }
  const sortButton = (key: CaseSort['key'], label: string) => <Button variant="ghost" size="sm" onClick={() => onSort({ key, direction: sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc' })}>{label}{sort.key === key && (sort.direction === 'asc' ? <ArrowUp /> : <ArrowDown />)}</Button>
  const header = (key: keyof typeof options, label: string) => <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">{label}<SlidersHorizontal /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem onSelect={() => onSort({ key, direction: 'asc' })}>Sort ascending</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSort({ key, direction: 'desc' })}>Sort descending</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => onFilters({ ...filters, [key]: '' })}>All</DropdownMenuItem>
      {options[key].map(option => <DropdownMenuCheckboxItem key={option.value} checked={filters[key] === option.value} onCheckedChange={() => onFilters({ ...filters, [key]: filters[key] === option.value ? '' : option.value })}>{option.label}</DropdownMenuCheckboxItem>)}
    </DropdownMenuContent>
  </DropdownMenu>
  return <section className="tc-list" aria-label="Test cases">
    <div className="tc-toolbar">
      <AddEntityButton entity="test case" onClick={onAdd} />
      <Input aria-label="Search by ID or title" placeholder="Search by ID or title..." value={filters.search} onChange={event => onFilters({ ...filters, search: event.target.value })} />
      {filtered && <Button variant="ghost" size="sm" onClick={() => onFilters({ search: '', areaId: '', typeId: '', priority: '', status: '' })}>Clear filters</Button>}
      {importExportActions}
    </div>
    <table className="tc-table">
      <colgroup><col className="tc-code-column" /><col /><col className="tc-meta-column" /><col className="tc-meta-column" /><col className="tc-meta-column" /><col className="tc-meta-column" /><col className="tc-actions-column" /></colgroup>
      <thead><tr><th>{sortButton('code', 'ID')}</th><th>{sortButton('title', 'Title')}</th><th>{header('areaId', 'Area')}</th><th>{header('priority', 'Priority')}</th><th>{header('typeId', 'Type')}</th><th>{header('status', 'Status')}</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id} className={selectedId === item.id ? 'tc-selected' : ''} onClick={() => onOpen(item)}>
        <td><button type="button" className="tc-open" aria-label={`Open ${item.code}`} onClick={event => { event.stopPropagation(); onOpen(item) }}>{item.code}</button></td>
        <td>{item.title}</td><td>{areas.find(area => area.id === item.areaId)?.name || '—'}</td><td>{priorities.find(option => option.value === item.priority)?.label}</td><td>{types.find(type => type.id === item.typeId)?.name || '—'}</td><td>{statuses.find(option => option.value === item.status)?.label}</td>
        <td onClick={event => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions ${item.code}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onEdit(item)}>Edit</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
      </tr>)}</tbody>
    </table>
    {!items.length && <p className="empty-state muted">{filtered ? 'No matching test cases.' : 'No test cases yet.'}</p>}
  </section>
}
