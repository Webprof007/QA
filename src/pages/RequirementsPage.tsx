import { useState, type Dispatch, type SetStateAction } from 'react'
import { DictionaryContext, type DictionaryKind } from '@/components/audit/dictionaryContext'
import { RequirementTable, type RequirementFilters } from '@/components/requirements/RequirementTable'
import { RequirementPanel } from '@/components/requirements/RequirementPanel'
import { Button } from '@/components/ui/button'
import { ImportExportActions } from '@/components/import-export/ImportExportActions'
import { exportRows, validateRequirements } from '@/lib/importExport'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { RequirementWithTestCases as Requirement, RequirementsViewState as RequirementsProjectState, TestCase } from '@/types'
import './RequirementsPage.css'

type Props = { types?: import('@/types').TestCaseDictionaryValue[]; areaInUse?: (id: string) => boolean; projectId: string; data: RequirementsProjectState; testCases: TestCase[]; onChange: Dispatch<SetStateAction<RequirementsProjectState>>; onSaveItem?: (item: Requirement, creating: boolean) => Promise<Requirement>; onDeleteItem?: (id: string) => Promise<void>; onImportItems?: (items: Requirement[]) => Promise<void>; onTestCasesChange?: (requirementId: string, ids: string[]) => Promise<void>; onAreaSave?: (name: string, id?: string) => Promise<string>; onAreaRemove?: (id: string) => Promise<string> }
export function RequirementsPage({ types = [], areaInUse, projectId, data, testCases, onChange, onSaveItem, onDeleteItem, onImportItems, onTestCasesChange, onAreaSave, onAreaRemove }: Props) {
  const [filters, setFilters] = useState<RequirementFilters>({ search: '', areaId: '', status: '', coverage: '' })
  const [selectedId, setSelectedId] = useState('')
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')
  const [draft, setDraft] = useState<Requirement | null>(null)
  const [deleting, setDeleting] = useState<Requirement | null>(null)
  const [error, setError] = useState('')
  const items = data.items.filter(item => item.projectId === projectId)
  const areas = data.areas.filter(area => area.projectId === projectId)
  const available = testCases.filter(test => test.projectId === projectId)
  const selected = items.find(item => item.id === selectedId)
  const active = mode === 'view' ? selected : draft

  function open(item: Requirement, editing = false) {
    setSelectedId(item.id); setMode(editing ? 'edit' : 'view'); setDraft(editing ? structuredClone(item) : null); setError('')
  }
  function close() { setSelectedId(''); setMode('view'); setDraft(null); setError('') }
  function add() {
    const number = Math.max(0, ...items.map(item => /^REQ-\d+$/i.test(item.code) ? Number(item.code.slice(4)) : 0)) + 1
    const now = new Date().toISOString()
    setDraft({ id: crypto.randomUUID(), projectId, code: `REQ-${String(number).padStart(3, '0')}`, title: '', description: '', status: 'draft', source: '', notes: '', testCaseIds: [], createdAt: now, updatedAt: now })
    setSelectedId(''); setMode('create'); setError('')
  }
  async function save() {
    if (!draft) return
    if (draft.areaId && !areas.some(area => area.id === draft.areaId)) { setError('Виберіть Area поточного проєкту.'); return }
    const code = draft.code.trim()
    if (!code || !draft.title.trim()) { setError('Enter a code and title.'); return }
    if (items.some(item => item.id !== draft.id && item.code.toLowerCase() === code.toLowerCase())) { setError('This code already exists in this project.'); return }
    const validIds = new Set(available.map(test => test.id))
    if (draft.testCaseIds.some(id => !validIds.has(id))) { setError('Link only test cases that exist in the current project.'); return }
    const input = { ...draft, projectId, code, title: draft.title.trim(), testCaseIds: [...new Set(draft.testCaseIds)], updatedAt: new Date().toISOString() }
    try {
      const saved = onSaveItem ? await onSaveItem(input, mode === 'create') : input
      if (onTestCasesChange) await onTestCasesChange(saved.id, input.testCaseIds)
      onChange(current => ({ ...current, items: mode === 'create' ? [...current.items.filter(item => item.id !== saved.id), saved] : current.items.map(item => item.id === saved.id ? saved : item) }))
      setSelectedId(saved.id); setMode('view'); setDraft(null); setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти Requirement.') }
  }
  async function remove() {
    if (!deleting) return
    try { await onDeleteItem?.(deleting.id); onChange(current => ({ ...current, items: current.items.filter(item => item.id !== deleting.id) })); if (selectedId === deleting.id) close(); setDeleting(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося видалити Requirement.') }
  }
  const dictionary = {
    area: areas, type: types.filter(item => item.projectId === projectId),
    async save(kind: DictionaryKind, name: string, id?: string) {
      if (kind !== 'area') return ''
      if (onAreaSave) return onAreaSave(name, id)
      const value = { id: id ?? crypto.randomUUID(), projectId, name }
      onChange(current => ({ ...current, areas: id ? current.areas.map(area => area.id === id && area.projectId === projectId ? value : area) : [...current.areas, value] }))
      return value.id
    },
    async remove(kind: DictionaryKind, id: string) {
      if (kind !== 'area') return ''
      if ([...items, ...(draft ? [draft] : [])].some(item => item.areaId === id)) return 'This Area is used by a requirement. Choose another Area before deleting it.'
      if (areaInUse?.(id)) return 'Area використовується в іншому розділі проєкту.'
      if (onAreaRemove) return onAreaRemove(id)
      onChange(current => ({ ...current, areas: current.areas.filter(area => area.id !== id || area.projectId !== projectId) }))
      setFilters(current => current.areaId === id ? { ...current, areaId: '' } : current)
      return ''
    },
  }
  const search = filters.search.trim().toLowerCase()
  const visible = items.filter(item =>
    (!search || item.code.toLowerCase().includes(search) || item.id.toLowerCase().includes(search) || item.title.toLowerCase().includes(search)) &&
    (!filters.areaId || item.areaId === filters.areaId) && (!filters.status || item.status === filters.status) &&
    (!filters.coverage || (filters.coverage === 'covered' ? item.testCaseIds.length > 0 : item.testCaseIds.length === 0)),
  )

  return <DictionaryContext.Provider value={dictionary}><main className="smoke-app req-page">
    <header className="page-heading"><h1>Requirements</h1></header>
    <div className={`tc-layout ${active ? 'tc-with-panel' : ''}`}>
      <RequirementTable items={visible} areas={areas} selectedId={selectedId} filters={filters} onFilters={setFilters} onOpen={item => open(item)} onEdit={item => open(item, true)} onDelete={setDeleting} onAdd={add}
        importExportActions={<ImportExportActions kind="requirements" validate={(rows, mapping) => validateRequirements(rows, mapping, { projectId, areas, existing: items })} onImport={async imported => { const values = imported.map(item => ({ ...item, testCaseIds: [] })); if (onImportItems) await onImportItems(values); else onChange(current => ({ ...current, items: [...current.items, ...values] })) }} exportRows={exportRows('requirements', { requirements: items, areas })} />} />
      {active && <RequirementPanel onLinkTestCases={testCaseIds => { if (onTestCasesChange) void onTestCasesChange(active.id, testCaseIds).catch(reason => setError(reason instanceof Error ? reason.message : 'Не вдалося змінити зв’язки.')); else onChange(current => ({ ...current, items: current.items.map(item => item.id === active.id ? { ...item, testCaseIds } : item) })) }} key={active.id + mode} item={active} testCases={available} mode={mode} error={error} onChange={item => { setDraft(item); setError('') }} onSave={save} onEdit={() => { if (selected) open(selected, true) }} onCancel={() => { if (selected) open(selected); else close() }} onClose={close} />}
    </div>
    <Dialog open={Boolean(deleting)} onOpenChange={value => { if (!value) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.code}?</DialogTitle><DialogDescription>This removes the requirement and its links. Test cases will be kept.</DialogDescription></DialogHeader>{error && <p role="alert" className="form-error">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={() => void remove()}>Delete requirement</Button></DialogFooter></DialogContent></Dialog>
  </main></DictionaryContext.Provider>
}
