import { supabase, isLocalMode } from './supabase'
import { uid } from './id'

// Data access for the job tracker. Same API whether Supabase is configured or
// the app runs in demo mode (localStorage), mirroring store.js for resumes.

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

const remote = {
  async list() {
    return unwrap(await supabase.from('jobs').select('*').order('position', { ascending: true }))
  },
  async create(values) {
    return unwrap(await supabase.from('jobs').insert(values).select('*').single())
  },
  async update(id, patch) {
    return unwrap(await supabase.from('jobs').update(patch).eq('id', id).select('*').single())
  },
  async remove(id) {
    unwrap(await supabase.from('jobs').delete().eq('id', id))
  },
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
