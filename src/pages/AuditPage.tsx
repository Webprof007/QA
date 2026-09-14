import type { AuditEvidenceUrls } from '@/lib/auditEvidenceUrls'
import { DictionaryContext, type DictionaryKind } from '@/components/audit/dictionaryContext'
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AuditList, type AuditFilters, type AuditSortKey } from '@/components/audit/AuditList'
import { AuditWorkspacePanel } from '@/components/audit/AuditWorkspacePanel'
import type { AuditDictionaryValue, AuditItem } from '@/types'
import '../App.css'
import './AuditPage.css'

type Props = { evidenceUrls: AuditEvidenceUrls; auditAreas: AuditDictionaryValue[]; auditTypes: AuditDictionaryValue[]; onAreasChange: Dispatch<SetStateAction<AuditDictionaryValue[]>>; onTypesChange: Dispatch<SetStateAction<AuditDictionaryValue[]>>; projectId: string; items: AuditItem[]; onChange: Dispatch<SetStateAction<AuditItem[]>> }
const emptyFilters: AuditFilters = { search: '', area: '', type: '', severity: '', status: '', from: '', to: '' }

export function AuditPage({ evidenceUrls, projectId, items, onChange, auditAreas, auditTypes, onAreasChange, onTypesChange }: Props) {
  const [filters, setFilters] = useState(emptyFilters)
  const [sort, setSort] = useState<{ key: AuditSortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' })
  const [selectedId, setSelectedId] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, AuditItem>>({})
  const [newItem, setNewItem] = useState<AuditItem | null>(null)
  useEffect(() => evidenceUrls.retain([...Object.values(drafts), ...(newItem ? [newItem] : [])].flatMap(item => item.evidence.map(file => file.url))), [drafts, newItem, evidenceUrls])
  const [deleting, setDeleting] = useState<AuditItem | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const filteredItems = items.filter(item => {
    const search = filters.search.trim().toLowerCase()
    return (!search || item.id.toLowerCase().includes(search) || item.title.toLowerCase().includes(search)) && (!filters.area || item.area === filters.area) && (!filters.type || item.type === filters.type) && (!filters.severity || item.severity === filters.severity) && (!filters.status || item.status === filters.status) && (!filters.from || item.discoveredAt >= filters.from) && (!filters.to || item.discoveredAt <= filters.to)
  }).sort((a, b) => {
    const sortValue = (item: AuditItem) => {
      if (sort.key === 'date') return item.discoveredAt
      if (sort.key === 'area' || sort.key === 'type') {
        const values = sort.key === 'area' ? auditAreas : auditTypes
        return values.find(value => value.projectId === projectId && value.id === item[sort.key as 'area' | 'type'])?.name ?? ''
      }
      return item[sort.key]
    }
    const valueA = sortValue(a)
    const valueB = sortValue(b)
    return String(valueA).localeCompare(String(valueB)) * (sort.direction === 'asc' ? 1 : -1)
  })
  const selected = newItem ?? items.find(item => item.id === selectedId)
  const activeItem = selected ? (drafts[selected.id] ?? selected) : undefined
  const hasFilters = Object.values(filters).some(Boolean)

  function selectItem(id: string) { setNewItem(null); setSelectedId(id); setPanelOpen(Boolean(id)); setNotice(''); setError('') }
  function toggleSort(key: AuditSortKey) { setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' })) }
  function addItem() {
    const number = Math.max(0, ...items.map(item => Number(item.id.replace(/^AUD-/, '')) || 0)) + 1
    const today = new Date(); const discoveredAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setNewItem({ id: `AUD-${String(number).padStart(3, '0')}`, projectId, title: '', area: '', type: '', severity: 'medium', status: 'open', discoveredAt, location: '', description: '', expected: '', actual: '', evidence: [], comment: '', taskUrl: '' })
    setSelectedId(''); setPanelOpen(true); setNotice(''); setError('')
  }
  function updateActive(item: AuditItem) { if (newItem) setNewItem(item); else setDrafts(current => ({ ...current, [item.id]: item })); setError(''); setNotice('') }
  function saveActive() {
    if (!activeItem) return
    if (!activeItem.title.trim()) { setError('Введіть назву зауваження.'); return }
    const saved = { ...activeItem, projectId, title: activeItem.title.trim(), area: activeItem.area.trim(), taskUrl: activeItem.taskUrl.trim() }
    onChange(current => newItem ? [...current, saved] : current.map(item => item.id === saved.id ? saved : item))
    setDrafts(current => { const next = { ...current }; delete next[saved.id]; return next })
    setNewItem(null); setSelectedId(saved.id); setNotice('Зміни збережено.'); setError('')
  }
  function deleteItem() { if (!deleting) return; onChange(current => current.filter(item => item.id !== deleting.id)); setDrafts(current => { const next = { ...current }; delete next[deleting.id]; return next }); if (selectedId === deleting.id) { setSelectedId(''); setPanelOpen(false) }; setDeleting(null) }

  const dictionaries = {
    area: auditAreas.filter(value => value.projectId === projectId),
    type: auditTypes.filter(value => value.projectId === projectId),
    save(kind: DictionaryKind, name: string, id?: string) {
      const value = { id: id ?? crypto.randomUUID(), projectId, name }
      const update = kind === 'area' ? onAreasChange : onTypesChange
      update(current => id ? current.map(entry => entry.projectId === projectId && entry.id === id ? value : entry) : [...current, value])
      return value.id
    },
    remove(kind: DictionaryKind, id: string) {
      if ([...items, ...Object.values(drafts), ...(newItem ? [newItem] : [])].some(item => item[kind] === id)) return 'Значення використовується в зауваженнях Audit. Спочатку виберіть інше значення в цих зауваженнях.'
      const update = kind === 'area' ? onAreasChange : onTypesChange
      update(current => current.filter(entry => entry.projectId !== projectId || entry.id !== id))
      setFilters(current => current[kind] === id ? { ...current, [kind]: '' } : current)
      return ''
    },
  }

  return <DictionaryContext.Provider value={dictionaries}><main className="smoke-app audit-page">
    <header className="page-heading audit-page-heading"><h1>Audit</h1><Button variant="outline" size="sm" onClick={addItem}><Plus />Додати зауваження</Button></header>
    <div className={`audit-layout ${panelOpen && activeItem ? 'audit-with-panel' : ''}`}>
      <AuditList items={filteredItems} selectedId={selectedId} filtered={hasFilters} filters={filters} sort={sort} onFiltersChange={setFilters} onSort={toggleSort} onDateSort={direction => setSort({ key: 'date', direction })} onSelect={selectItem} onEdit={item => { setNewItem(null); setSelectedId(item.id); setPanelOpen(true) }} onDelete={setDeleting} />
      {panelOpen && activeItem && <AuditWorkspacePanel createEvidenceUrl={evidenceUrls.create} item={activeItem} creating={Boolean(newItem)} notice={notice} error={error} onChange={updateActive} onSave={saveActive} onClose={() => { setPanelOpen(false); setNewItem(null) }} />}
    </div>
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Видалити зауваження {deleting?.id}?</DialogTitle><DialogDescription>Зауваження буде видалено з Audit поточного проєкту.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Скасувати</Button><Button variant="destructive" onClick={deleteItem}>Видалити зауваження</Button></DialogFooter></DialogContent></Dialog>
  </main></DictionaryContext.Provider>
}
