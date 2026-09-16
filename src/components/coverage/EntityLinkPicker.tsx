import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ColumnFilter } from '@/components/coverage/ColumnFilter'
export type LinkPickerItem = { id: string; code: string; title: string; status: string; area?: string; priority?: string; type?: string }

const pageSize = 8
type Props = {
  testCases: LinkPickerItem[]
  kind?: 'testCases' | 'requirements'
  selectedIds: string[]
  onApply: (ids: string[]) => void
  onClose: () => void
}
export function EntityLinkPicker({ testCases, selectedIds, onApply, onClose, kind = 'testCases' }: Props) {
  const isRequirements = kind === 'requirements'
  const [metadata, setMetadata] = useState({ area: '', priority: '', type: '' })
  const [selection, setSelection] = useState(() => new Set(selectedIds.filter(id => testCases.some(item => item.id === id))))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [page, setPage] = useState(0)
  const query = search.trim().toLowerCase()
  const filtered = testCases.filter(test =>
    (!query || test.code.toLowerCase().includes(query) || test.title.toLowerCase().includes(query)) &&
    Object.entries(metadata).every(([key, value]) => !value || test[key as keyof typeof metadata] === value) &&
    (!status || test.status === status) && (!selectedOnly || selection.has(test.id)),
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  function toggle(id: string, checked: boolean) {
    setSelection(current => {
      const next = new Set(current)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent className="req-picker">
      <DialogHeader><DialogTitle>{isRequirements ? 'Manage Requirements' : 'Link Test Cases'}</DialogTitle><DialogDescription>Виберіть записи поточного проєкту. Зміни застосуються після підтвердження.</DialogDescription></DialogHeader>
      <div className="req-picker-filters">
        <Input aria-label={isRequirements ? 'Search requirements' : 'Search test cases'} placeholder={isRequirements ? 'Search requirements...' : 'Search test cases...'} value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
        <label className="req-picker-selected"><Checkbox checked={selectedOnly} onCheckedChange={checked => { setSelectedOnly(checked === true); setPage(0) }} />Selected only</label>
      </div>
      {(search || status || selectedOnly || Object.values(metadata).some(Boolean)) && <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus(''); setSelectedOnly(false); setMetadata({ area: '', priority: '', type: '' }); setPage(0) }}>Clear filters</Button>}
      <div className="tc-panel-actions"><Button type="button" variant="outline" size="sm" onClick={() => setSelection(current => new Set([...current, ...filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(item => item.id)]))}>Select all visible</Button><Button type="button" variant="ghost" size="sm" onClick={() => setSelection(new Set())}>Clear selection</Button></div>
      <div className="req-picker-results">
        <table className="tc-table" aria-label="Link choices">
          <colgroup><col style={{ width: 28 }} /><col /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} />{!isRequirements && <col style={{ width: '15%' }} />}<col style={{ width: '15%' }} /></colgroup>
          <thead><tr><th><span className="sr-only">Select</span></th><th>ID / Title</th>
            {(['area', 'priority', 'type'] as const).filter(key => !isRequirements || key !== 'type').map(key => <th key={key}><ColumnFilter label={key === 'area' ? 'Area' : key === 'priority' ? 'Priority' : 'Type'} value={metadata[key]} options={[...new Set(testCases.map(item => item[key]).filter((value): value is string => Boolean(value)))].map(value => ({ value, label: value }))} onChange={value => { setMetadata(current => ({ ...current, [key]: value })); setPage(0) }} /></th>)}
            <th><ColumnFilter label="Status" value={status} options={[{ value: isRequirements ? 'approved' : 'active', label: isRequirements ? 'Approved / Затверджено' : 'Active' }, { value: 'draft', label: isRequirements ? 'Draft / Чернетка' : 'Draft' }, { value: 'deprecated', label: isRequirements ? 'Deprecated / Застаріле' : 'Deprecated' }]} onChange={value => { setStatus(value); setPage(0) }} /></th>
          </tr></thead>
          <tbody>{filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(test => <tr key={test.id} onClick={() => toggle(test.id, !selection.has(test.id))}>
            <td onClick={event => event.stopPropagation()}><Checkbox aria-label={`${test.code} ${test.title}`} checked={selection.has(test.id)} onCheckedChange={checked => toggle(test.id, checked === true)} /></td>
            <td><span className="test-id">{test.code}</span><span className="req-picker-title">{test.title}</span></td>
            <td>{test.area || '—'}</td><td>{test.priority || '—'}</td>{!isRequirements && <td>{test.type || '—'}</td>}<td>{test.status}</td>
          </tr>)}</tbody>
        </table>
        {!filtered.length && <p className="muted">{isRequirements ? 'No matching requirements.' : 'No matching test cases.'}</p>}
      </div>
      <div className="req-picker-pagination"><span>{filtered.length} results · {selection.size} selected</span><Button type="button" variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>{currentPage + 1} / {pageCount}</span><Button type="button" variant="ghost" size="sm" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button></div>
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="button" onClick={() => onApply(testCases.filter(test => selection.has(test.id)).map(test => test.id))}>Apply selection</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
