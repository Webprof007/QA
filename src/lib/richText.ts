import DOMPurify from 'dompurify'

const marker = '<!--qa-rich-text-->'
export const textColors = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#b42318' },
  { name: 'Blue', value: '#175cd3' },
  { name: 'Green', value: '#067647' },
  { name: 'Purple', value: '#6938ef' },
]
export function normalizedTextColor(value: string): string {
  const element = document.createElement('span')
  element.style.color = value
  return element.style.color
}
const allowedColors = new Set(textColors.filter(color => color.value).map(color => normalizedTextColor(color.value)))
export function sanitizeRichHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'span', 'h2', 'h3', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['style', 'start'],
  })
  const root = document.createElement('div')
  root.innerHTML = clean
  for (const element of root.querySelectorAll<HTMLElement>('[style]')) {
    const color = element.style.color
    element.removeAttribute('style')
    if (allowedColors.has(color)) element.style.color = color
  }
  return root.innerHTML
}
function escape(text: string) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
export function richTextHtml(value: string): string {
  if (value.startsWith(marker)) return sanitizeRichHtml(value.slice(marker.length))
  return value.split('\n').map(line => `<p>${escape(line)}</p>`).join('')
}
export function richTextPlain(value: string): string {
  if (!value.startsWith(marker)) return value
  const root = document.createElement('div')
  root.innerHTML = richTextHtml(value)
  for (const br of root.querySelectorAll('br')) br.replaceWith('\n')
  return root.textContent ?? ''
}
export function serializeRichText(html: string): string {
  const clean = sanitizeRichHtml(html)
  const root = document.createElement('div')
  root.innerHTML = clean
  if (!root.textContent?.trim()) return ''
  // Keep ordinary text compatible with the existing mock data.
  if (!root.querySelector('strong,b,span[style],h2,h3,ul,ol')) {
    for (const br of root.querySelectorAll('br')) br.replaceWith('\n')
    return Array.from(root.childNodes).map(node => node.textContent ?? '').join('\n')
  }
  return marker + clean
}
export function joinRichTextBlocks(values: string[]): string {
  if (values.every(value => !value.startsWith(marker))) return values.join('\n')
  return marker + values.map(richTextHtml).join('')
}
export function splitRichTextBlocks(value: string): string[] {
  if (!value.startsWith(marker)) return value.split('\n').map(line => line.trim()).filter(Boolean)
  const root = document.createElement('div')
  root.innerHTML = richTextHtml(value)
  return Array.from(root.children).map(node => serializeRichText(node.outerHTML)).filter(Boolean)
}
