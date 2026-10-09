import { api, isLocalMode } from './api'
import { uid } from './id'

// Data access for the job tracker. Uses the API in server/ in production, otherwise a
// localStorage-backed store with the same API (demo mode), mirroring store.js for resumes.

const remote = {
  list: () => api('/jobs'),
  create: (values) => api('/jobs', { method: 'POST', body: values }),
  update: (id, patch) => api(`/jobs/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  remove: (id) => api(`/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

const LOCAL_KEY = 'resumebanao:jobs'

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) ?? []
  } catch {
    return []
  }
}

function writeLocal(rows) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
}

const local = {
  async list() {
    return readLocal()
  },
  async create(values) {
    const now = new Date().toISOString()
    const row = { id: uid(), created_at: now, updated_at: now, ...values }
    writeLocal([...readLocal(), row])
    return row
  },
  async update(id, patch) {
    const rows = readLocal()
    const index = rows.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Job not found')
    rows[index] = { ...rows[index], ...patch, updated_at: new Date().toISOString() }
    writeLocal(rows)
    return rows[index]
  },
  async remove(id) {
    writeLocal(readLocal().filter((r) => r.id !== id))
  },
}

const backend = isLocalMode ? local : remote

export const listJobs = () => backend.list()
export const createJob = (values) => backend.create(values)
export const updateJob = (id, patch) => backend.update(id, patch)
export const deleteJob = (id) => backend.remove(id)
