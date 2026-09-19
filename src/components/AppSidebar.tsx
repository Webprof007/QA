import { ChevronDown, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { useState } from 'react'
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
import { navigationLabels } from '@/components/navigationLabels'

type Props = {
  projects: Project[]
  project: Project | undefined
  page: Page
  onProjectChange: (id: string) => void
  onAddProject: () => void
  onNavigate: (page: Page) => void
}

export function AppSidebar({
  projects,
  project,
  page,
  onProjectChange,
  onAddProject,
  onNavigate,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  function navigationItem(item: Page) {
    const { label, sublabel } = navigationLabels[item]
    return (
      <Button
        key={item}
        variant="ghost"
        className="sidebar-link"
        aria-label={`${label} / ${sublabel}`}
        aria-current={page === item ? 'page' : undefined}
        onClick={() => onNavigate(item)}
      >
        <span className="sidebar-item-labels">
          <span className="sidebar-item-label">{label}</span>
          <span className="sidebar-item-sublabel" lang="uk">{sublabel}</span>
        </span>
      </Button>
    )
  }

  return (
    <div className={`app-sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar-brand"><span>QA Tool</span><Button variant="ghost" size="icon" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button></div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="sidebar-project">
            <span className="sidebar-project-name">Project: {project?.name ?? 'Немає проєктів'}</span>
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
        </DropdownMenuContent>
      </DropdownMenu>

      <nav aria-label="Розділи застосунку" className="sidebar-navigation">
        <div className="sidebar-group">
          <p className="sidebar-group-label">PLANNING</p>
          {navigationItem('Requirements')}
          {navigationItem('Test Plan')}
          {navigationItem('Coverage')}
        </div>
        <div className="sidebar-group">
          <p className="sidebar-group-label">TEST DESIGN</p>
          {navigationItem('Test Cases')}
          {navigationItem('Test Suites')}
          {navigationItem('Checklists')}
          {navigationItem('Smoke')}
        </div>
        <div className="sidebar-group">
          <p className="sidebar-group-label">EXECUTION</p>
          {navigationItem('Test Runs')}
          {navigationItem('Defects')}
        </div>
        <div className="sidebar-group">
          <p className="sidebar-group-label">ANALYSIS</p>
          {navigationItem('Audit')}
        </div>
        <div className="sidebar-group">
          <p className="sidebar-group-label">PROJECT</p>
          {navigationItem('Settings')}
        </div>
      </nav>

    </div>
  )
}
