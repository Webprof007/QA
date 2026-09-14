import { Popover as Primitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from 'cn'

export const Popover = Primitive.Root
export const PopoverTrigger = Primitive.Trigger
export function PopoverContent({ className, align = 'start', sideOffset = 4, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Content align={align} sideOffset={sideOffset} className={cn('z-50 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none', className)} {...props} /></Primitive.Portal>
}
