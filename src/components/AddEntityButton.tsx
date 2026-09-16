import { Button } from '@/components/ui/button'

// Entry point for creating a QA record. Save/Run/Start/Retest are separate actions.
export function AddEntityButton({ entity, onClick }: { entity: string; onClick: () => void }) {
  return <Button type="button" variant="outline" size="sm" className="tc-add ml-auto" onClick={onClick}>+ Add {entity}</Button>
}
