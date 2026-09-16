import { AddEntityButton } from '@/components/AddEntityButton'
import { MoreHorizontal, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import type { RequirementWithTestCases as Requirement, RequirementsViewState as RequirementsProjectState } from '@/types'
import { coverageLabel, requirementStatuses } from './requirementOptions'
import type { ReactNode } from 'react'

export type RequirementFilters = { search: string; areaId: string; status: string; coverage: string }
type Props = {
  items: Requirement[]; areas: RequirementsProjectState['areas']; selectedId?: string
  filters: RequirementFilters; onFilters: (filters: RequirementFilters) => void
  onOpen: (item: Requirement) => void; onEdit: (item: Requirement) => void
  onDelete: (item: Requirement) => void; onAdd: () => void; importExportActions?: ReactNode
}
export function RequirementTable({ items, areas, selectedId, filters, onFilters, onOpen, onEdit, onDelete, onAdd, importExportActions }: Props) {
  const filtered = Object.values(filters).some(Boolean)
  const header = (key: 'areaId' | 'status' | 'coverage', label: string, options: { value: string; label: string }[]) => <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">{label}<SlidersHorizontal /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem onSelect={() => onFilters({ ...filters, [key]: '' })}>All</DropdownMenuItem>
      {options.map(option => <DropdownMenuCheckboxItem key={option.value} checked={filters[key] === option.value} onCheckedChange={() => onFilters({ ...filters, [key]: filters[key] === option.value ? '' : option.value })}>{option.label}</DropdownMenuCheckboxItem>)}
    </DropdownMenuContent>
  </DropdownMenu>
  return <section className="tc-list" aria-label="Requirements list">
    <div className="tc-toolbar">
      <AddEntityButton entity="requirement" onClick={onAdd} />
      <Input aria-label="Search by ID or title" placeholder="Search by ID or title..." value={filters.search} onChange={event => onFilters({ ...filters, search: event.target.value })} />
      {filtered && <Button variant="ghost" size="sm" onClick={() => onFilters({ search: '', areaId: '', status: '', coverage: '' })}>Clear filters</Button>}
      {importExportActions}
    </div>
    <table className="tc-table req-table">
      <colgroup><col className="req-code-column" /><col /><col className="req-meta-column" /><col className="req-meta-column" /><col className="req-meta-column" /><col className="tc-actions-column" /></colgroup>
      <thead><tr><th>ID/code</th><th>Title</th><th>{header('areaId', 'Area', areas.map(area => ({ value: area.id, label: area.name })))}</th><th>{header('status', 'Status', requirementStatuses)}</th><th>{header('coverage', 'Coverage', [{ value: 'covered', label: 'Covered' }, { value: 'not-covered', label: 'Not covered' }])}</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id} className={selectedId === item.id ? 'tc-selected' : ''} onClick={() => onOpen(item)}>
        <td><button type="button" className="tc-open" aria-label={`Open ${item.code}`} onClick={event => { event.stopPropagation(); onOpen(item) }}>{item.code}</button></td>
        <td>{item.title}</td><td>{areas.find(area => area.id === item.areaId)?.name || '—'}</td><td>{requirementStatuses.find(status => status.value === item.status)?.label}</td><td>{coverageLabel(item.testCaseIds.length)}</td>
        <td onClick={event => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions ${item.code}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onEdit(item)}>Edit</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
      </tr>)}</tbody>
    </table>
    {!items.length && <p className="empty-state muted">{filtered ? 'No matching requirements.' : 'No requirements yet.'}</p>}
  </section>
}
