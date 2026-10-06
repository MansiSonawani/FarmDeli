import { supabase, isLocalMode } from './supabase'
import { uid, slugify, randomSuffix } from './id'
import { emptyResume } from './defaults'
import { templateStyle } from './templates'

// Data access for resumes. Uses Supabase when it is configured, otherwise a
// localStorage-backed store with the same API so the app works without a backend.

const COLUMNS = 'id, title, data, style, is_public, slug, created_at, updated_at'

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

const remote = {
  async list() {
    return unwrap(await supabase.from('resumes').select(COLUMNS).order('updated_at', { ascending: false }))
  },
  async get(id) {
    return unwrap(await supabase.from('resumes').select(COLUMNS).eq('id', id).single())
  },
  async create(values) {
    return unwrap(await supabase.from('resumes').insert(values).select(COLUMNS).single())
  },
  async update(id, patch) {
    return unwrap(await supabase.from('resumes').update(patch).eq('id', id).select(COLUMNS).single())
  },
  async remove(id) {
    unwrap(await supabase.from('resumes').delete().eq('id', id))
  },
  async getPublic(slug) {
    return unwrap(await supabase.from('resumes').select(COLUMNS).eq('slug', slug).eq('is_public', true).maybeSingle())
  },
}

const LOCAL_KEY = 'cv-builder:resumes'

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
    return readLocal().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },
  async get(id) {
    const row = readLocal().find((r) => r.id === id)
    if (!row) throw new Error('Resume not found')
    return row
  },
  async create(values) {
    const now = new Date().toISOString()
    const row = { id: uid(), is_public: false, slug: null, created_at: now, updated_at: now, ...values }
    writeLocal([...readLocal(), row])
    return row
  },
  async update(id, patch) {
    const rows = readLocal()
    const index = rows.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Resume not found')
    rows[index] = { ...rows[index], ...patch, updated_at: new Date().toISOString() }
    writeLocal(rows)
    return rows[index]
  },
  async remove(id) {
    writeLocal(readLocal().filter((r) => r.id !== id))
  },
  async getPublic(slug) {
    return readLocal().find((r) => r.slug === slug && r.is_public) ?? null
  },
}

const backend = isLocalMode ? local : remote

export const listResumes = () => backend.list()
export const getResume = (id) => backend.get(id)
export const updateResume = (id, patch) => backend.update(id, patch)
export const deleteResume = (id) => backend.remove(id)
export const getPublicResume = (slug) => backend.getPublic(slug)

export function createResume({ title = 'Untitled resume', data, style, email } = {}) {
  return backend.create({
    title,
    data: data ?? emptyResume(email),
    style: style ?? templateStyle('classic'),
  })
}

export async function duplicateResume(resume) {
  return backend.create({
    title: `${resume.title} (copy)`,
    data: structuredClone(resume.data),
    style: structuredClone(resume.style),
  })
}

export async function setSharing(resume, isPublic) {
  const slug =
    resume.slug ?? `${slugify(resume.data?.personal?.fullName || resume.title) || 'resume'}-${randomSuffix()}`
  return backend.update(resume.id, { is_public: isPublic, slug })
}
