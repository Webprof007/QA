import { act, fireEvent } from '@testing-library/react'
import type { Editor } from '@tiptap/core'
import { richTextHtml } from '@/lib/richText'

// Exercise real Tiptap transactions; jsdom does not implement browser text editing.
export function setFieldValue(element: HTMLElement, value: string) {
  const editor = (element as HTMLElement & { editor?: Editor }).editor
  if (editor) act(() => { editor.commands.setContent(richTextHtml(value)) })
  else fireEvent.change(element, { target: { value } })
}
export function fieldValue(element: HTMLElement) {
  const editor = (element as HTMLElement & { editor?: Editor }).editor
  return editor ? editor.getText({ blockSeparator: '\n' }) : (element as HTMLInputElement).value
}
