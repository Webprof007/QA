import { useContext, type ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { AccountBarSlotContext } from './accountBarContext'

export function AccountBackButton(props: Pick<ComponentProps<typeof Button>, 'children' | 'onClick' | 'disabled'>) {
  const slot = useContext(AccountBarSlotContext)
  return slot ? createPortal(<Button type="button" variant="ghost" size="sm" {...props} />, slot) : null
}
