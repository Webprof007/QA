import { MoreHorizontal, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { SmokeSuiteState } from '@/types'

type Props = { suites: SmokeSuiteState[]; onAdd: () => void; onOpen: (id: string) => void; onEdit: (suite: SmokeSuiteState) => void; onDelete: (suite: SmokeSuiteState) => void }
export function SmokeSuitesPage({ suites, onAdd, onOpen, onEdit, onDelete }: Props) {
  return <main className="smoke-app smoke-suites-page"><header className="page-heading suite-list-heading"><h1>Smoke</h1><Button variant="outline" size="sm" onClick={onAdd}><Plus />Додати Smoke</Button></header>
    {!suites.length ? <p className="muted">Smoke suites поки немає. Створіть перший набір.</p> : <div className="suite-table"><div className="suite-row suite-header"><span>Назва</span><span>Тестів</span><span>Останній запуск</span><span /></div>{suites.map(state => { const lastRun = state.tests.flatMap(test => test.results).map(result => result.date).sort().at(-1); return <div key={state.suite.id} className="suite-row suite-data" onClick={() => onOpen(state.suite.id)} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onOpen(state.suite.id) }}><span className="suite-name">{state.suite.name}</span><span>{state.tests.length}</span><span>{lastRun ? lastRun.split('-').reverse().join('.') : '—'}</span><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Дії зі Smoke ${state.suite.name}`} onClick={event => event.stopPropagation()}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onEdit(state)}>Перейменувати</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => onDelete(state)}>Видалити</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div> })}</div>}
  </main>
}
