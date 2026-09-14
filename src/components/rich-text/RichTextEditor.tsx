import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Bold, List, ListOrdered, Heading2, Heading3, RemoveFormatting } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { richTextHtml, sanitizeRichHtml, serializeRichText, textColors, normalizedTextColor } from '@/lib/richText'
import './richText.css'

type Props = {
  id?: string
  value: string
  onValueChange: (value: string) => void
  rows?: number
  placeholder?: string
  'aria-label'?: string
}
export function RichTextEditor({ id, value, onValueChange, rows = 3, placeholder, 'aria-label': label }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, blockquote: false, code: false, codeBlock: false, horizontalRule: false, italic: false, strike: false, underline: false, link: false }),
      TextStyle, Color,
    ],
    content: richTextHtml(value),
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { id: id ?? '', role: 'textbox', 'aria-multiline': 'true', ...(label ? { 'aria-label': label } : { 'aria-labelledby': `${id}-label` }), 'data-placeholder': placeholder ?? '', class: 'qa-rich-content', style: `min-height: ${Math.max(rows, 2) * 24}px` },
      transformPastedHTML: sanitizeRichHtml,
    },
    onUpdate: ({ editor }) => onValueChange(serializeRichText(editor.getHTML())),
  })
  useEffect(() => {
    if (serializeRichText(editor.getHTML()) !== value) editor.commands.setContent(richTextHtml(value), { emitUpdate: false })
  }, [editor, value])
  const action = (label: string, active: boolean, run: () => void, icon: React.ReactNode) =>
    <Button type="button" variant="ghost" size="icon" aria-label={label} aria-pressed={active} title={label} onMouseDown={event => event.preventDefault()} onClick={run}>{icon}</Button>
  return <div className="qa-rich-editor" data-empty={editor.isEmpty}>
    <div className="qa-rich-toolbar" role="toolbar" aria-label="Text formatting">
      {action('Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold />)}
      {action('Heading 2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 />)}
      {action('Heading 3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 />)}
      {action('Bullet list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List />)}
      {action('Numbered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered />)}
      <select aria-label="Text color" value={textColors.find(color => normalizedTextColor(color.value) === normalizedTextColor(editor.getAttributes('textStyle').color ?? ''))?.value ?? ''} onChange={event => { const chain = editor.chain().focus(); if (event.target.value) chain.setColor(event.target.value).run(); else chain.unsetColor().run() }}>
        {textColors.map(color => <option key={color.name} value={color.value}>{color.name}</option>)}
      </select>
      {action('Clear formatting', false, () => editor.chain().focus().clearNodes().unsetAllMarks().run(), <RemoveFormatting />)}
    </div>
    <EditorContent editor={editor} />
  </div>
}
