import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function PasswordInput({ className = '', ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return <div className="relative">
    <Input {...props} type={visible ? 'text' : 'password'} className={`pr-10 ${className}`} />
    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 size-8" disabled={props.disabled} aria-label={visible ? 'Приховати пароль' : 'Показати пароль'} aria-pressed={visible} aria-controls={props.id} onClick={() => setVisible(current => !current)}>
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  </div>
}
