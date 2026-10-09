// Demo mode keeps everything in this browser (see store.js). It is on for local `npm run dev`
// via .env, and off in production builds, which talk to the server in server/.
export const isLocalMode = import.meta.env.VITE_DEMO_MODE === 'true'

async function send(path, init) {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', ...init })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const error = new Error(data?.error ?? `Request failed (${res.status})`)
    error.status = res.status
    error.code = data?.code
    throw error
  }
  return data
}

export function api(path, { method = 'GET', body } = {}) {
  const write = method !== 'GET'
  return send(path, {
    method,
    // The server only accepts JSON on writes (CSRF protection), so always send it.
    headers: write ? { 'Content-Type': 'application/json' } : undefined,
    body: write ? JSON.stringify(body ?? {}) : undefined,
  })
}

// Sends one file as multipart form data. Uploads cannot be JSON, so the server requires this custom
// header instead, which other websites cannot add to a request they send on a visitor's behalf.
export function apiUpload(path, file) {
  const body = new FormData()
  body.append('file', file)
  return send(path, { method: 'POST', headers: { 'X-Requested-With': 'resumebanao' }, body })
}
