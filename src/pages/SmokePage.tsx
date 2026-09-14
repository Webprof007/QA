import { useState, type Dispatch, type SetStateAction } from 'react'
import { PreparationChecklist } from '@/components/PreparationChecklist'
import { TestList } from '@/components/TestList'
import { TestWorkspacePanel } from '@/components/TestWorkspacePanel'
import { TestEditorDialog } from '@/components/TestEditorDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { PreparationItem, ResultDraft, SmokeSuite, SmokeSuiteState, SmokeTestCase } from '@/types'
import '../App.css'

function newDraft(projectId: string): ResultDraft {
  const today = new Date()
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return { projectId, date, completed: false, status: null, comment: '', taskUrl: '' }
}

type Props = {
  projectId: string
  suite: SmokeSuite
  data: SmokeSuiteState
  onChange: Dispatch<SetStateAction<SmokeSuiteState>>
}

export function SmokePage({ projectId, suite, data, onChange }: Props) {
  const { preparation, tests, drafts } = data
  function setPreparation(items: PreparationItem[]) {
    onChange(current => ({ ...current, preparation: items }))
  }
  function setTests(action: SetStateAction<SmokeTestCase[]>) {
    onChange(current => ({
      ...current,
      tests: typeof action === 'function' ? action(current.tests) : action,
    }))
  }
  function setDrafts(action: SetStateAction<Record<string, ResultDraft>>) {
    onChange(current => ({
      ...current,
      drafts: typeof action === 'function' ? action(current.drafts) : action,
    }))
  }
  const [selectedId, setSelectedId] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editor, setEditor] = useState<{ test: SmokeTestCase | null } | null>(null)
  const [deleting, setDeleting] = useState<SmokeTestCase | null>(null)
  const [notice, setNotice] = useState('')
  const selected = tests.find((test) => test.id === selectedId)

  function selectTest(id: string) {
    setSelectedId(id)
    setPanelOpen(Boolean(id))
    setNotice('')
    if (id && !drafts[id])
      setDrafts((current) => ({ ...current, [id]: newDraft(projectId) }))
  }
  function changeDraft(draft: ResultDraft) {
    setDrafts((current) => ({ ...current, [selectedId]: draft }))
    setNotice('')
  }
  function saveResult() {
    const draft = drafts[selectedId]
    if (!selected || !draft?.date) return
    const result = { ...draft, id: draft.id ?? crypto.randomUUID() }
    setTests((current) =>
      current.map((test) =>
        test.id !== selectedId
          ? test
          : {
              ...test,
              results: draft.id
                ? test.results.map((saved) =>
                    saved.id === draft.id ? result : saved,
                  )
                : [...test.results, result],
            },
      ),
    )
    setDrafts((current) => ({ ...current, [selectedId]: result }))
    setNotice('Результат збережено.')
  }
  function saveTest(test: SmokeTestCase) {
    const previousId = editor?.test?.id
    setTests((current) =>
      previousId
        ? current.map((item) => (item.id === previousId ? test : item))
        : [...current, test],
    )
    if (previousId && previousId !== test.id) {
      setDrafts((current) => {
        const next = { ...current }
        if (next[previousId]) {
          next[test.id] = next[previousId]
          delete next[previousId]
        }
        return next
      })
      if (selectedId === previousId) setSelectedId(test.id)
    }
    setEditor(null)
  }
  function deleteTest() {
    if (!deleting) return
    setTests((current) => current.filter((test) => test.id !== deleting.id))
    setDrafts((current) => {
      const next = { ...current }
      delete next[deleting.id]
      return next
    })
    if (selectedId === deleting.id) {
      setSelectedId('')
      setPanelOpen(false)
      setNotice('')
    }
    setDeleting(null)
  }
  return (
    <main className="smoke-app">
      <header className="page-heading smoke-suite-heading">
        <h1>{suite.name}</h1>
      </header>
      <PreparationChecklist projectId={projectId} smokeSuiteId={suite.id} items={preparation} onChange={setPreparation} />
      <div
        className={`smoke-layout ${panelOpen && selected ? 'with-panel' : ''}`}
      >
        <TestList
          tests={tests}
          selectedId={selectedId}
          panelOpen={panelOpen}
          onSelect={selectTest}
          onOpenPanel={() => setPanelOpen(true)}
          onAdd={() => setEditor({ test: null })}
          onEdit={(test) => setEditor({ test })}
          onDelete={setDeleting}
        />
        {panelOpen && selected && drafts[selectedId] && (
          <TestWorkspacePanel
            test={selected}
            draft={drafts[selectedId]}
            notice={notice}
            onChange={changeDraft}
            onSave={saveResult}
            onClose={() => setPanelOpen(false)}
            onNew={() => changeDraft(newDraft(projectId))}
            onEditResult={(result) => changeDraft({ ...result })}
          />
        )}
      </div>
      {editor && (
        <TestEditorDialog
          projectId={projectId}
          smokeSuiteId={suite.id}
          test={editor.test}
          tests={tests}
          onSave={saveTest}
          onClose={() => setEditor(null)}
        />
      )}
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити тест {deleting?.id}?</DialogTitle>
            <DialogDescription>
              Тест і його історію результатів буде видалено з поточного списку.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Скасувати
            </Button>
            <Button variant="destructive" onClick={deleteTest}>
              Видалити тест
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
