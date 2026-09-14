// @vitest-environment jsdom
import { useState } from 'react'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Editor } from '@tiptap/core'
import { RichTextEditor } from './RichTextEditor'
import { RichText } from './RichText'
import { richTextHtml, richTextPlain, serializeRichText, splitRichTextBlocks, joinRichTextBlocks } from '@/lib/richText'
import { setFieldValue } from '@/test/fields'

// jsdom has no text layout; ProseMirror uses Range geometry while focusing.
const originalRects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects')
const originalRect = Object.getOwnPropertyDescriptor(Range.prototype, 'getBoundingClientRect')
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] })
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() })
afterEach(cleanup)
afterAll(() => {
  if (originalRects) Object.defineProperty(Range.prototype, 'getClientRects', originalRects)
  else Reflect.deleteProperty(Range.prototype, 'getClientRects')
  if (originalRect) Object.defineProperty(Range.prototype, 'getBoundingClientRect', originalRect)
  else Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect')
})
function Example() {
  const [value, setValue] = useState('Existing plain text')
  const [editing, setEditing] = useState(true)
  return <><button onClick={() => setEditing(!editing)}>Toggle view</button>{editing
    ? <RichTextEditor aria-label="Description" value={value} onValueChange={setValue} />
    : <RichText value={value} />}</>
}
describe('Minimal rich text', () => {
  it('supports bold, color, headings and lists, preserving them after reopening', async () => {
    render(<Example />)
    const textbox = screen.getByRole('textbox', { name: 'Description' })
    setFieldValue(textbox, 'Important finding')
    const editor = (textbox as HTMLElement & { editor: Editor }).editor
    act(() => { editor.commands.selectAll() })
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Text color' }), { target: { value: '#b42318' } })
    fireEvent.click(screen.getByRole('button', { name: 'Heading 2' }))
    expect(textbox.querySelector('h2 strong')).toBeTruthy()
    expect(textbox.querySelector<HTMLElement>('span')?.style.color).toBe('rgb(180, 35, 24)')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle view' }))
    expect(screen.getByText('Important finding').closest('h2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle view' }))
    const reopened = screen.getByRole('textbox', { name: 'Description' })
    expect(reopened.querySelector('h2 strong')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Bullet list' }))
    expect(reopened.querySelector('ul li')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Numbered list' }))
    expect(reopened.querySelector('ol li')).toBeTruthy()
    // Flush focus work before unmounting.
    await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)) })
  })
  it('handles plain text, multiline content and existing Smoke arrays without losing formatting', () => {
    expect(richTextHtml('<script>literal text</script>')).toContain('&lt;script&gt;')
    expect(serializeRichText('<p>First<br>Second</p><p>Third</p>')).toBe('First\nSecond\nThird')
    const formatted = serializeRichText('<h2>Title</h2><ul><li><p><strong>Action</strong></p></li></ul>')
    const values = splitRichTextBlocks(formatted)
    expect(values).toHaveLength(2)
    expect(richTextHtml(joinRichTextBlocks(values))).toContain('<strong>Action</strong>')
    expect(richTextPlain(formatted)).toContain('Action')
    expect(serializeRichText('<p><br></p>')).toBe('')
  })
  it('removes unsafe pasted content and retains only supported formatting and colors', () => {
    const value = serializeRichText('<p onclick="alert(1)"><strong>Safe</strong><span style="color:#b42318;background-image:url(https://example.com/track)">Red</span><img src=x onerror=alert(1)><script>alert(1)</script><a href="javascript:alert(1)">Link text</a></p>')
    const html = richTextHtml(value)
    expect(html).toContain('<strong>Safe</strong>')
    expect(html).toContain('color: rgb(180, 35, 24)')
    expect(html).not.toMatch(/onclick|onerror|script|href|<img|background|url\(/)
  })
})
