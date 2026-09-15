import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'

export function ColumnFilter({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm" className={value ? 'text-primary' : undefined}>{label}<SlidersHorizontal /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start"><DropdownMenuItem onSelect={() => onChange('')}>All</DropdownMenuItem>
      {options.map(option => <DropdownMenuCheckboxItem key={option.value} checked={value === option.value} onCheckedChange={() => onChange(value === option.value ? '' : option.value)}>{option.label}</DropdownMenuCheckboxItem>)}
    </DropdownMenuContent></DropdownMenu>
}
