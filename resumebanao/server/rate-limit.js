// Fixed-window counter kept in memory. Good enough for a single server instance.
export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map()

  return function allow(key) {
    const now = Date.now()
    const entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
      }
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }
    entry.count += 1
    return entry.count <= limit
  }
}
