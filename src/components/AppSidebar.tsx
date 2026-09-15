import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Page, Project } from '@/types'

type Props = {
  projects: Project[]
  project: Project | undefined
  page: Page
  onProjectChange: (id: string) => void
  onAddProject: () => void
  onDeleteProject: () => void
  onNavigate: (page: Page) => void
}

export function AppSidebar({
  projects,
  project,
  page,
  onProjectChange,
  onAddProject,
  onDeleteProject,
  onNavigate,
}: Props) {
  function navigationItem(item: Page) {
    return (
      <Button
        key={item}
        variant="ghost"
        className="sidebar-link"
        aria-current={page === item ? 'page' : undefined}
        onClick={() => onNavigate(item)}
      >
        {item}
      </Button>
    )
  }

  return (
    <div className="app-sidebar">
      <div className="sidebar-brand">QA Tool</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="sidebar-project">
            <span>Project: {project?.name ?? 'Немає проєктів'}</span>
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={project?.id ?? ''} onValueChange={onProjectChange}>
            {projects.map(item => (
              <DropdownMenuRadioItem key={item.id} value={item.id}>
                {item.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {projects.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={onAddProject}>
            <Plus />Додати проєкт
          </DropdownMenuItem>
          {project && (
            <DropdownMenuItem variant="destructive" onSelect={onDeleteProject}>
              <Trash2 />Видалити поточний проєкт
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <nav aria-label="Розділи застосунку" className="sidebar-navigation">
        <div className="sidebar-group">
          {navigationItem('Requirements')}
          {navigationItem('Test Plan')}
        </div>
        <div className="sidebar-group">
          <p className="sidebar-group-label">TESTING</p>
          {navigationItem('Test Cases')}
          {navigationItem('Coverage')}
          {navigationItem('Test Runs')}
          {navigationItem('Defects')}
          {navigationItem('Checklists')}
          {navigationItem('Smoke')}
        </div>
        <div className="sidebar-group">
          <p className="sidebar-group-label">ANALYSIS</p>
          {navigationItem('Audit')}
        </div>
      </nav>

    </div>
  )
}
