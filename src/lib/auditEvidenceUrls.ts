import type { AuditEvidence } from '@/types'

const formats: Record<string, AuditEvidence['type']> = {
  'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image',
  'video/mp4': 'video', 'video/webm': 'video', 'video/quicktime': 'video',
}
export function evidenceFileType(file: File): AuditEvidence['type'] | null {
  if (/\.mov$/i.test(file.name) || file.type === 'video/quicktime') {
    return document.createElement('video').canPlayType('video/quicktime') ? 'video' : null
  }
  if (file.type) return formats[file.type] ?? null
  if (/\.(png|jpe?g|webp)$/i.test(file.name)) return 'image'
  if (/\.(mp4|webm)$/i.test(file.name)) return 'video'
  return null
}

// Only URLs created here are owned by the mock UI. Server URLs are never revoked.
export function createAuditEvidenceUrls() {
  const owned = new Set<string>()
  const references = new Map<symbol, Set<string>>()
  const collect = () => queueMicrotask(() => {
    const retained = new Set([...references.values()].flatMap(urls => [...urls]))
    for (const url of owned) {
      if (!retained.has(url)) {
        URL.revokeObjectURL(url)
        owned.delete(url)
      }
    }
  })
  return {
    create(file: File) {
      const url = URL.createObjectURL(file)
      owned.add(url)
      return url
    },
    retain(urls: string[]) {
      const owner = Symbol()
      references.set(owner, new Set(urls))
      collect()
      return () => { references.delete(owner); collect() }
    },
  }
}
export type AuditEvidenceUrls = ReturnType<typeof createAuditEvidenceUrls>
