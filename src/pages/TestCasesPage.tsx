import { richTextPlain } from '@/lib/richText'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { DictionaryContext, type DictionaryKind } from '@/components/audit/dictionaryContext'
import { TestCaseTable, type CaseFilters, type CaseSort } from '@/components/test-cases/TestCaseTable'
import { TestCasePanel } from '@/components/test-cases/TestCasePanel'
import { priorities, statuses } from '@/components/test-cases/testCaseOptions'
import { Button } from '@/components/ui/button'
import { ImportExportActions } from '@/components/import-export/ImportExportActions'
import { exportRows, validateTestCases } from '@/lib/importExport'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { RequirementWithTestCases as Requirement, TestCase, TestCasesProjectState } from '@/types'

type Props = { onRequirementsChange?: (testCaseId: string, ids: string[]) => void; areaInUse?: (id: string) => boolean; requirements: Requirement[]; projectId: string; data: TestCasesProjectState; onChange: Dispatch<SetStateAction<TestCasesProjectState>>; onAreaSave?: (name: string, id?: string) => Promise<string>; onAreaRemove?: (id: string) => Promise<string>; onTypeSave?: (name: string, id?: string) => Promise<string>; onTypeRemove?: (id: string) => Promise<string> }
export function TestCasesPage({ onRequirementsChange, areaInUse, projectId, data, onChange, requirements, onAreaSave, onAreaRemove, onTypeSave, onTypeRemove }: Props) {
  const [filters, setFilters] = useState<CaseFilters>({ search: '', areaId: '', typeId: '', priority: '', status: '' })
  const [sort, setSort] = useState<CaseSort>({ key: 'code', direction: 'asc' })
  const [selectedId, setSelectedId] = useState('')
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')
  const [draft, setDraft] = useState<TestCase | null>(null)
  const [deleting, setDeleting] = useState<TestCase | null>(null)
  const [error, setError] = useState('')
  const items = data.items.filter(item => item.projectId === projectId)
  const areas = data.areas.filter(value => value.projectId === projectId)
  const types = data.types.filter(value => value.projectId === projectId)
  const selected = items.find(item => item.id === selectedId)
  const active = mode === 'view' ? selected : draft

  function open(item: TestCase, edit = false) {
    setSelectedId(item.id); setMode(edit ? 'edit' : 'view'); setDraft(edit ? structuredClone(item) : null); setError('')
  }
  function close() { setSelectedId(''); setDraft(null); setMode('view'); setError('') }
  function add() {
    const number = Math.max(0, ...items.map(item => /^TC-\d+$/i.test(item.code) ? Number(item.code.slice(3)) : 0)) + 1
    const now = new Date().toISOString()
    setDraft({ id: crypto.randomUUID(), projectId, code: `TC-${String(number).padStart(3, '0')}`, title: '', priority: 'medium', status: 'draft', preconditions: [], steps: [], postconditions: [], notes: '', createdAt: now, updatedAt: now })
    setMode('create'); setSelectedId(''); setError('')
  }
  function save() {
    if (!draft) return
    if (draft.areaId && !areas.some(area => area.id === draft.areaId)) { setError('Виберіть Area поточного проєкту.'); return }
    if (draft.typeId && !types.some(type => type.id === draft.typeId)) { setError('Виберіть Type поточного проєкту.'); return }
    const code = draft.code.trim()
    if (!code || !draft.title.trim()) { setError('Enter a code and title.'); return }
    if (items.some(item => item.id !== draft.id && item.code.toLowerCase() === code.toLowerCase())) { setError('This code already exists in this project.'); return }
    if (draft.steps.some(step => !richTextPlain(step.action).trim() || !richTextPlain(step.expectedResult).trim())) { setError('Complete Action and Expected for each step.'); return }
    const saved: TestCase = {
      ...draft, projectId, code, title: draft.title.trim(),
      preconditions: draft.preconditions.map(value => value.trim()).filter(Boolean),
      postconditions: draft.postconditions?.map(value => value.trim()).filter(Boolean),
      steps: [...draft.steps].sort((a, b) => a.sortOrder - b.sortOrder).map((step, sortOrder) => ({ ...step, action: step.action.trim(), expectedResult: step.expectedResult.trim(), sortOrder })),
      updatedAt: new Date().toISOString(),
    }
    onChange(current => ({ ...current, items: mode === 'create' ? [...current.items, saved] : current.items.map(item => item.id === saved.id ? saved : item) }))
    setSelectedId(saved.id); setDraft(null); setMode('view'); setError('')
  }
  function remove() {
    if (!deleting) return
    onChange(current => ({ ...current, items: current.items.filter(item => item.id !== deleting.id) }))
    if (selectedId === deleting.id) close()
    setDeleting(null)
  }
  const dictionary = {
    area: areas, type: types,
    async save(kind: DictionaryKind, name: string, id?: string) {
      const remote = kind === 'area' ? onAreaSave : onTypeSave
      if (remote) return remote(name, id)
      const key = kind === 'area' ? 'areas' : 'types'
      const value = { id: id ?? crypto.randomUUID(), projectId, name }
      onChange(current => ({ ...current, [key]: id ? current[key].map(entry => entry.id === id && entry.projectId === projectId ? value : entry) : [...current[key], value] }))
      return value.id
    },
    async remove(kind: DictionaryKind, id: string) {
      const field = kind === 'area' ? 'areaId' : 'typeId'
      if ([...items, ...(draft ? [draft] : [])].some(item => item[field] === id)) return 'This value is used by a test case. Choose another value before deleting it.'
      if (kind === 'area' && areaInUse?.(id)) return 'Area використовується в іншому розділі проєкту.'
      const remote = kind === 'area' ? onAreaRemove : onTypeRemove
      if (remote) return remote(id)
      const key = kind === 'area' ? 'areas' : 'types'
      onChange(current => ({ ...current, [key]: current[key].filter(value => value.id !== id || value.projectId !== projectId) }))
      setFilters(current => current[field] === id ? { ...current, [field]: '' } : current)
      return ''
    },
  }
  const search = filters.search.trim().toLowerCase()
  const visible = items.filter(item => (
    (!search || item.code.toLowerCase().includes(search) || item.id.toLowerCase().includes(search) || item.title.toLowerCase().includes(search)) &&
    (!filters.areaId || item.areaId === filters.areaId) && (!filters.typeId || item.typeId === filters.typeId) &&
    (!filters.priority || item.priority === filters.priority) && (!filters.status || item.status === filters.status)
  )).sort((a, b) => {
    const value = (item: TestCase): string | number => {
      switch (sort.key) {
        case 'areaId': return areas.find(entry => entry.id === item.areaId)?.name ?? ''
        case 'typeId': return types.find(entry => entry.id === item.typeId)?.name ?? ''
        case 'priority': return priorities.findIndex(entry => entry.value === item.priority)
        case 'status': return statuses.findIndex(entry => entry.value === item.status)
        default: return item[sort.key]
      }
    }
    const left = value(a), right = value(b)
    return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true })) * (sort.direction === 'asc' ? 1 : -1)
  })

  return <DictionaryContext.Provider value={dictionary}><main className="smoke-app tc-page">
    <header className="page-heading"><h1>Test Cases</h1></header>
    <div className={`tc-layout ${active ? 'tc-with-panel' : ''}`}>
      <TestCaseTable items={visible} areas={areas} types={types} selectedId={selectedId} filters={filters} sort={sort} onFilters={setFilters} onSort={setSort} onOpen={item => open(item)} onEdit={item => open(item, true)} onDelete={setDeleting} onAdd={add}
        importExportActions={<ImportExportActions kind="testCases" validate={(rows, mapping) => validateTestCases(rows, mapping, { projectId, areas, types, existing: items })} onImport={imported => onChange(current => ({ ...current, items: [...current.items, ...imported] }))} exportRows={exportRows('testCases', { testCases: items, areas, types })} />} />
      {active && <TestCasePanel allRequirements={requirements} onRequirementsChange={onRequirementsChange ? ids => onRequirementsChange(active.id, ids) : undefined} requirements={requirements.filter(item => item.projectId === projectId && item.testCaseIds.includes(active.id))} key={active.id} item={active} mode={mode} error={error} onChange={item => { setDraft(item); setError('') }} onSave={save} onEdit={() => { if (selected) open(selected, true) }} onCancel={() => { if (selected) open(selected); else close() }} onClose={close} />}
    </div>
    <Dialog open={Boolean(deleting)} onOpenChange={value => { if (!value) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.code}?</DialogTitle><DialogDescription>This test case will be removed from the current project.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={remove}>Delete test case</Button></DialogFooter></DialogContent></Dialog>
  </main></DictionaryContext.Provider>
}
