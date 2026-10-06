// Demo mode keeps everything in this browser (see store.js). It is on for local `npm run dev`
// via .env, and off in production builds, which talk to the server in server/.
export const isLocalMode = import.meta.env.VITE_DEMO_MODE === 'true'

export async function api(path, { method = 'GET', body } = {}) {
  const write = method !== 'GET'
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    // The server only accepts JSON on writes (CSRF protection), so always send it.
    headers: write ? { 'Content-Type': 'application/json' } : undefined,
    body: write ? JSON.stringify(body ?? {}) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const error = new Error(data?.error ?? `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return data
}
