import { useId } from 'react'
import type { ProjectContext, ProjectSetupState } from '@/types'
export function ProjectContextFields({ projectId, setup, value, onChange }: { projectId: string; setup: ProjectSetupState; value: ProjectContext; onChange: (value: Pick<ProjectContext, 'environmentId' | 'buildId'>) => void }) {
  const prefix = useId()
  const environments = setup.environments.filter(item => item.projectId === projectId && item.isActive)
  const builds = setup.builds.filter(item => item.projectId === projectId)
  return <>
    <div className="field"><label htmlFor={`${prefix}-environment`}>Environment / Середовище</label><select className="audit-select" id={`${prefix}-environment`} value={value.environmentId ?? ''} onChange={event => onChange({ environmentId: event.target.value || undefined })}><option value="">—</option>
      {value.environmentId && !environments.some(item => item.id === value.environmentId) && <option value={value.environmentId} disabled>{value.environmentNameSnapshot || 'Unavailable Environment'} · історичне</option>}
      {environments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></div>
    <div className="field"><label htmlFor={`${prefix}-build`}>Build / Збірка</label><select className="audit-select" id={`${prefix}-build`} value={value.buildId ?? ''} onChange={event => onChange({ buildId: event.target.value || undefined })}><option value="">—</option>
      {value.buildId && !builds.some(item => item.id === value.buildId) && <option value={value.buildId} disabled>{value.buildVersionSnapshot || 'Unavailable Build'} · історичне</option>}
      {builds.map(item => { const release = setup.releases.find(release => release.projectId === projectId && release.id === item.releaseId); return <option key={item.id} value={item.id}>{item.version}{release ? ` — Release ${release.name}` : ''}</option> })}
    </select></div>
  </>
}
