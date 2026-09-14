import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { TestCase } from '@/types'

const pageSize = 8
type Props = {
  testCases: TestCase[]
  selectedIds: string[]
  onApply: (ids: string[]) => void
  onClose: () => void
}
export function TestCaseLinkPicker({ testCases, selectedIds, onApply, onClose }: Props) {
  const [selection, setSelection] = useState(() => new Set(selectedIds))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [page, setPage] = useState(0)
  const query = search.trim().toLowerCase()
  const filtered = testCases.filter(test =>
    (!query || test.code.toLowerCase().includes(query) || test.title.toLowerCase().includes(query)) &&
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
      <DialogHeader><DialogTitle>Link Test Cases</DialogTitle><DialogDescription>Select test cases from this project. Changes apply when you confirm.</DialogDescription></DialogHeader>
      <div className="req-picker-filters">
        <Input aria-label="Search test cases" placeholder="Search test cases..." value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
        <select aria-label="Test case status" className="audit-select" value={status} onChange={event => { setStatus(event.target.value); setPage(0) }}><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="deprecated">Deprecated</option></select>
        <label className="req-picker-selected"><Checkbox checked={selectedOnly} onCheckedChange={checked => { setSelectedOnly(checked === true); setPage(0) }} />Selected only</label>
      </div>
      <div className="req-picker-results">
        {filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(test => <label key={test.id} className="req-picker-row">
          <Checkbox aria-label={`${test.code} ${test.title}`} checked={selection.has(test.id)} onCheckedChange={checked => toggle(test.id, checked === true)} />
          <span><span className="test-id">{test.code}</span><span className="req-picker-title">{test.title}</span></span>
          <span className="muted">{test.status}</span>
        </label>)}
        {!filtered.length && <p className="muted">No matching test cases.</p>}
      </div>
      <div className="req-picker-pagination"><span>{filtered.length} results · {selection.size} selected</span><Button type="button" variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>{currentPage + 1} / {pageCount}</span><Button type="button" variant="ghost" size="sm" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button></div>
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="button" onClick={() => onApply(testCases.filter(test => selection.has(test.id)).map(test => test.id))}>Apply selection</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
