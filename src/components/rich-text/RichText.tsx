import { richTextHtml } from '@/lib/richText'
import './richText.css'

export function RichText({ value, className = '' }: { value: string; className?: string }) {
  return <div className={`qa-rich-content ${className}`} dangerouslySetInnerHTML={{ __html: richTextHtml(value) }} />
}
