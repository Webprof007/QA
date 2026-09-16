import type { Audit, AuditCheck, AuditDictionaryValue, AuditFinding, AuditState, ProjectArea } from '@/types'
const now = () => new Date().toISOString()
export function editableAudit(state: AuditState, projectId: string, auditId: string) {
  const audit = state.audits.find(item => item.id === auditId && item.projectId === projectId)
  if (!audit || audit.status === 'Completed') throw new Error('Audit недоступний або вже завершений.')
  return audit
}
export function auditCode(items: { code: string; projectId: string }[], projectId: string, prefix: string) {
  return prefix + String(Math.max(0, ...items.filter(item => item.projectId === projectId).map(item => Number(item.code.slice(prefix.length)) || 0)) + 1).padStart(3, '0')
}
export function saveAudit(state: AuditState, projectId: string, draft: Audit, types: AuditDictionaryValue[], userId?: number): AuditState {
  if (draft.projectId !== projectId || !draft.title.trim()) throw new Error('Вкажіть назву Audit поточного проєкту.')
  if (draft.typeId && !types.some(item => item.id === draft.typeId && item.projectId === projectId)) throw new Error('Оберіть тип поточного проєкту.')
  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) throw new Error('Дата завершення раніше початку.')
  const existing = state.audits.find(item => item.id === draft.id)
  if (existing) editableAudit(state, projectId, draft.id)
  const saved: Audit = {
    id: existing?.id ?? crypto.randomUUID(), code: existing?.code ?? auditCode(state.audits, projectId, 'AUDIT-'), projectId,
    title: draft.title.trim(), typeId: draft.typeId, objective: draft.objective, scope: draft.scope,
    notes: draft.notes, limitations: draft.limitations, startDate: draft.startDate, endDate: draft.endDate,
    status: existing?.status ?? 'Draft', startedAt: existing?.startedAt,
    createdAt: existing?.createdAt ?? now(), updatedAt: now(), createdByUserId: existing ? existing.createdByUserId : userId,
  }
  return { ...state, audits: existing ? state.audits.map(item => item.id === existing.id ? saved : item) : [...state.audits, saved] }
}
export function transitionAudit(state: AuditState, projectId: string, id: string, action: 'start' | 'complete', areas: ProjectArea[], types: AuditDictionaryValue[]): AuditState {
  const audit = editableAudit(state, projectId, id), time = now()
  if (action === 'start' && audit.status !== 'Draft' || action === 'complete' && audit.status !== 'In Progress') throw new Error('Некоректний перехід статусу Audit.')
  return {
    ...state,
    audits: state.audits.map(item => item.id === id && item.projectId === projectId ? { ...item, status: action === 'start' ? 'In Progress' : 'Completed', updatedAt: time, ...(action === 'start' ? { startedAt: time } : { completedAt: time, typeNameSnapshot: types.find(type => type.projectId === projectId && type.id === item.typeId)?.name ?? '' }) } : item),
    findings: action === 'complete' ? state.findings.map(item => item.projectId === projectId && item.auditId === id ? { ...item, areaNameSnapshot: areas.find(area => area.projectId === projectId && area.id === item.areaId)?.name ?? '', typeNameSnapshot: types.find(type => type.projectId === projectId && type.id === item.type)?.name ?? '' } : item) : state.findings,
  }
}
export function saveAuditCheck(state: AuditState, projectId: string, auditId: string, draft: AuditCheck): AuditState {
  editableAudit(state, projectId, auditId)
  const existing = state.checks.find(item => item.id === draft.id)
  if (draft.projectId !== projectId || draft.auditId !== auditId || existing && (existing.projectId !== projectId || existing.auditId !== auditId)) throw new Error('Перевірка належить іншому Audit.')
  if (!draft.criterion.trim() || !['Not Checked', 'Pass', 'Fail', 'N/A'].includes(draft.result)) throw new Error('Вкажіть критерій та результат.')
  const saved = { ...draft, criterion: draft.criterion.trim() }
  return { ...state, checks: existing ? state.checks.map(item => item.id === existing.id ? saved : item) : [...state.checks, saved] }
}
export function saveAuditFinding(state: AuditState, projectId: string, auditId: string, draft: AuditFinding, areas: ProjectArea[], types: AuditDictionaryValue[], userId?: number): AuditState {
  editableAudit(state, projectId, auditId)
  const existing = state.findings.find(item => item.id === draft.id)
  if (draft.projectId !== projectId || draft.auditId !== auditId || existing && (existing.projectId !== projectId || existing.auditId !== auditId)) throw new Error('Зауваження належить іншому Audit.')
  if (!draft.title.trim()) throw new Error('Введіть назву зауваження.')
  if (draft.areaId && !areas.some(item => item.projectId === projectId && item.id === draft.areaId) || draft.type && !types.some(item => item.projectId === projectId && item.id === draft.type)) throw new Error('Оберіть Area/Type поточного проєкту.')
  if (!['critical', 'high', 'medium', 'low'].includes(draft.severity) || !['open', 'in-progress', 'fixed', 'verified', 'wont-fix'].includes(draft.status)) throw new Error('Некоректний статус або критичність.')
  const saved: AuditFinding = { ...draft, id: existing?.id ?? draft.id, projectId, auditId, code: existing?.code ?? auditCode(state.findings, projectId, 'AUD-'), title: draft.title.trim(), createdAt: existing?.createdAt ?? now(), updatedAt: now(), createdByUserId: existing ? existing.createdByUserId : userId, areaNameSnapshot: undefined, typeNameSnapshot: undefined }
  return { ...state, findings: existing ? state.findings.map(item => item.id === existing.id ? saved : item) : [...state.findings, saved] }
}
export function removeAuditFinding(state: AuditState, projectId: string, auditId: string, id: string): AuditState {
  editableAudit(state, projectId, auditId)
  if (!state.findings.some(item => item.projectId === projectId && item.auditId === auditId && item.id === id)) throw new Error('Зауваження недоступне.')
  return { ...state, findings: state.findings.filter(item => !(item.projectId === projectId && item.auditId === auditId && item.id === id)) }
}
