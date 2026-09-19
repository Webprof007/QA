const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_IMAGE_EDGE = 2560

function isPng(bytes: Uint8Array) { return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 }
function isJpeg(bytes: Uint8Array) { return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }

async function detectedImageMime(file: File) {
  if (file.type === 'image/png' || file.type === 'image/jpeg') return file.type
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (isPng(bytes)) return 'image/png'
  if (isJpeg(bytes)) return 'image/jpeg'
  return ''
}

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не вдалося обробити зображення. Виберіть PNG або JPEG файл.')) }
    image.src = url
  })
}

function canvasBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality?: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не вдалося стиснути зображення.')), type, quality))
}

/**
 * Keeps ordinary screenshots untouched. Oversized PNG/JPEG files are rendered
 * into a real image file; mime type comes from content, never filename alone.
 */
export async function prepareEvidenceImage(file: File): Promise<File> {
  const mime = await detectedImageMime(file)
  if (!mime) return file
  const normalized = file.type === mime ? file : new File([file], file.name, { type: mime, lastModified: file.lastModified })
  if (normalized.size <= MAX_IMAGE_BYTES) {
    // Dimensions are checked only when decoding is supported. A small screenshot stays byte-for-byte intact.
    try {
      const { width, height } = await imageDimensions(normalized)
      if (Math.max(width, height) <= MAX_IMAGE_EDGE) return normalized
    } catch {
      // A valid browser-selected PNG/JPEG should still reach the server unchanged.
      return normalized
    }
  }
  const { width, height } = await imageDimensions(normalized)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale))
  const url = URL.createObjectURL(normalized), image = new Image()
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Не вдалося обробити зображення.')); image.src = url })
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  } finally { URL.revokeObjectURL(url) }
  let output = await canvasBlob(canvas, mime, mime === 'image/jpeg' ? .92 : undefined)
  // Large PNG screenshots can remain heavy after resizing. JPEG is a deliberate, valid fallback.
  let outputMime: 'image/png' | 'image/jpeg' = mime
  if (output.size > MAX_IMAGE_BYTES) { output = await canvasBlob(canvas, 'image/jpeg', .92); outputMime = 'image/jpeg' }
  const name = outputMime === mime ? normalized.name : normalized.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([output], name, { type: outputMime, lastModified: normalized.lastModified })
}

export function imageFileFromClipboard(items: DataTransferItemList | DataTransferItem[] | null | undefined) {
  if (!items) return []
  return Array.from(items).flatMap(item => item.kind === 'file' && item.type.startsWith('image/') ? [item.getAsFile()].filter((file): file is File => !!file) : [])
}
