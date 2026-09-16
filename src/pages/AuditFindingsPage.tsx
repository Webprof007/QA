import type { EvidenceDraft } from '@/types'
import { DictionaryContext, type DictionaryKind } from '@/components/audit/dictionaryContext'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AuditList, type AuditFilters, type AuditSortKey } from '@/components/audit/AuditList'
import { AuditWorkspacePanel } from '@/components/audit/AuditWorkspacePanel'
import type { AuditDictionaryValue, ProjectArea, AuditFinding } from '@/types'
import '../App.css'
import './AuditPage.css'

export type AuditFindingsProps = { initialFindingId?: string; typeInUse?: (id: string) => boolean; auditId: string; readOnly: boolean; areaInUse?: (id: string) => boolean; onSaveItem?: (item: AuditFinding, attachments: EvidenceDraft[], creating: boolean) => string | null; auditAreas: ProjectArea[]; auditTypes: AuditDictionaryValue[]; onAreasChange: Dispatch<SetStateAction<ProjectArea[]>>; onTypesChange: Dispatch<SetStateAction<AuditDictionaryValue[]>>; onAreaSave?: (name: string, id?: string) => Promise<string>; onAreaRemove?: (id: string) => Promise<string>; projectId: string; items: AuditFinding[]; onDeleteItem: (id: string) => string | null }
const emptyFilters: AuditFilters = { search: '', area: '', type: '', severity: '', status: '', from: '', to: '' }

export function AuditFindingsPage({ initialFindingId, typeInUse, auditId, readOnly, areaInUse, onSaveItem, projectId, items, onDeleteItem, auditAreas, auditTypes, onAreasChange, onTypesChange, onAreaSave, onAreaRemove }: AuditFindingsProps) {
  const [filters, setFilters] = useState(emptyFilters)
  const [sort, setSort] = useState<{ key: AuditSortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' })
  const [selectedId, setSelectedId] = useState(initialFindingId ?? '')
  const [panelOpen, setPanelOpen] = useState(Boolean(initialFindingId))
  const [drafts, setDrafts] = useState<Record<string, AuditFinding>>({})
  const [newItem, setNewItem] = useState<AuditFinding | null>(null)
  const [deleting, setDeleting] = useState<AuditFinding | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const projectItems = items.filter(item => item.projectId === projectId && item.auditId === auditId)
  const filteredItems = projectItems.filter(item => {
    const search = filters.search.trim().toLowerCase()
    return (!search || item.code.toLowerCase().includes(search) || item.title.toLowerCase().includes(search)) && (!filters.area || item.areaId === filters.area) && (!filters.type || item.type === filters.type) && (!filters.severity || item.severity === filters.severity) && (!filters.status || item.status === filters.status) && (!filters.from || item.discoveredAt >= filters.from) && (!filters.to || item.discoveredAt <= filters.to)
  }).sort((a, b) => {
    const sortValue = (item: AuditFinding) => {
      if (sort.key === 'id') return item.code
      if (sort.key === 'date') return item.discoveredAt
      if (sort.key === 'area' || sort.key === 'type') {
        const values = sort.key === 'area' ? auditAreas : auditTypes
        return values.find(value => value.projectId === projectId && value.id === item[sort.key === 'area' ? 'areaId' : 'type'])?.name ?? ''
      }
      return item[sort.key]
    }
    const valueA = sortValue(a)
    const valueB = sortValue(b)
    return String(valueA).localeCompare(String(valueB)) * (sort.direction === 'asc' ? 1 : -1)
  })
  const selected = newItem ?? projectItems.find(item => item.id === selectedId)
  const activeItem = selected ? (drafts[selected.id] ?? selected) : undefined
  const hasFilters = Object.values(filters).some(Boolean)

  function selectItem(id: string) { setNewItem(null); setSelectedId(id); setPanelOpen(Boolean(id)); setNotice(''); setError('') }
  function toggleSort(key: AuditSortKey) { setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' })) }
  function addItem() {
    if (readOnly) return
    const number = Math.max(0, ...items.filter(item => item.projectId === projectId).map(item => Number(item.code.replace(/^AUD-/, '')) || 0)) + 1
    const today = new Date(); const discoveredAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setNewItem({ id: crypto.randomUUID(), auditId, createdAt: '', updatedAt: '', code: `AUD-${String(number).padStart(3, '0')}`, projectId, title: '', areaId: '', type: '', severity: 'medium', status: 'open', discoveredAt, location: '', description: '', expected: '', actual: '', comment: '', taskUrl: '' })
    setSelectedId(''); setPanelOpen(true); setNotice(''); setError('')
  }
  function updateActive(item: AuditFinding) { if (newItem) setNewItem(item); else setDrafts(current => ({ ...current, [item.id]: item })); setError(''); setNotice('') }
  function saveActive(attachments: EvidenceDraft[]) {
    if (!activeItem || readOnly) return
    if (!activeItem.title.trim()) { setError('Введіть назву зауваження.'); return }
    if (activeItem.areaId && !auditAreas.some(area => area.id === activeItem.areaId && area.projectId === projectId)) { setError('Виберіть Area поточного проєкту.'); return }
    if (activeItem.type && !auditTypes.some(type => type.id === activeItem.type && type.projectId === projectId)) { setError('Виберіть Type поточного проєкту.'); return }
    const saved = { ...activeItem, projectId, title: activeItem.title.trim(), areaId: activeItem.areaId.trim(), taskUrl: activeItem.taskUrl.trim() }
    const evidenceError = onSaveItem?.(saved, attachments, Boolean(newItem))
    if (evidenceError) { setError(evidenceError); return }
    setDrafts(current => { const next = { ...current }; delete next[saved.id]; return next })
    setNewItem(null); setSelectedId(saved.id); setNotice('Зміни збережено.'); setError('')
  }
  function deleteItem() {
    if (!deleting || readOnly) return
    const failure = onDeleteItem(deleting.id)
    if (failure) { setError(failure); return }
    setDrafts(current => { const next = { ...current }; delete next[deleting.id]; return next })
    if (selectedId === deleting.id) { setSelectedId(''); setPanelOpen(false) }
    setDeleting(null)
  }

  const dictionaries = {
    area: auditAreas.filter(value => value.projectId === projectId),
    type: auditTypes.filter(value => value.projectId === projectId),
    async save(kind: DictionaryKind, name: string, id?: string) {
      if (readOnly) throw new Error('Audit завершений.')
      if (kind === 'area' && onAreaSave) return onAreaSave(name, id)
      const value = { id: id ?? crypto.randomUUID(), projectId, name }
      const update = kind === 'area' ? onAreasChange : onTypesChange
      update(current => id ? current.map(entry => entry.projectId === projectId && entry.id === id ? value : entry) : [...current, value])
      return value.id
    },
    async remove(kind: DictionaryKind, id: string) {
      if (readOnly) return 'Audit завершений.'
      if ([...items.filter(item => item.projectId === projectId), ...Object.values(drafts), ...(newItem ? [newItem] : [])].some(item => item[kind === 'area' ? 'areaId' : 'type'] === id)) return 'Значення використовується в зауваженнях Audit. Спочатку виберіть інше значення в цих зауваженнях.'
      if (kind === 'type' && typeInUse?.(id)) return 'Type використовується в Audit.'
      if (kind === 'area' && areaInUse?.(id)) return 'Area використовується в іншому розділі проєкту.'
      if (kind === 'area' && onAreaRemove) return onAreaRemove(id)
      const update = kind === 'area' ? onAreasChange : onTypesChange
      update(current => current.filter(entry => entry.projectId !== projectId || entry.id !== id))
      setFilters(current => current[kind] === id ? { ...current, [kind]: '' } : current)
      return ''
    },
  }

  return <DictionaryContext.Provider value={dictionaries}><section className="audit-page">
    <h2>Findings / Зауваження</h2>
    <div className={`audit-layout ${panelOpen && activeItem ? 'audit-with-panel' : ''}`}>
      <AuditList readOnly={readOnly} onAdd={readOnly ? undefined : addItem} items={filteredItems} selectedId={selectedId} filtered={hasFilters} filters={filters} sort={sort} onFiltersChange={setFilters} onSort={toggleSort} onDateSort={direction => setSort({ key: 'date', direction })} onSelect={selectItem} onEdit={item => { setNewItem(null); setSelectedId(item.id); setPanelOpen(true) }} onDelete={setDeleting} />
      {panelOpen && activeItem && <AuditWorkspacePanel followupDisabled={!!drafts[activeItem.id]} key={activeItem.id + String(readOnly)} readOnly={readOnly} item={activeItem} creating={Boolean(newItem)} notice={notice} error={error} onChange={updateActive} onSave={saveActive} onClose={() => { setPanelOpen(false); setNewItem(null) }} />}
    </div>
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Видалити зауваження {deleting?.code}?</DialogTitle><DialogDescription>Зауваження буде видалено з Audit поточного проєкту.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Скасувати</Button><Button variant="destructive" onClick={deleteItem}>Видалити зауваження</Button></DialogFooter></DialogContent></Dialog>
  </section></DictionaryContext.Provider>
}
