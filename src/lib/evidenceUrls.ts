// Only URLs created here are owned by the mock UI. Server URLs are never revoked.
export function createEvidenceUrls() {
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
export type EvidenceUrls = ReturnType<typeof createEvidenceUrls>
