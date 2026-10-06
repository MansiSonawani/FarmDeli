import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { connect, migrate } from '../db.js'
import { MAX_BYTES } from './errors.js'

let db
let app

beforeAll(async () => {
  db = await connect('')
  await migrate(db)
  app = createApp({ db })
}, 60_000)

afterAll(() => db?.close())

const fixture = (name) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))
const PDF = () => fixture('template-classic.pdf')
const DOCX = () => fixture('person-a.docx')
// Right type, wrong contents: passes the type and size checks, which happen before the file is read.
const FAKE_PDF = (extra = '') => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from(extra)])

async function signUp(email) {
  const res = await app.request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'correct horse' }),
  })
  expect(res.status).toBe(201)
  return res.headers.get('set-cookie').split(';')[0]
}

// Uploads `content` as a file field named "file", like the browser does.
async function upload(content, { name = 'Jane_Doe-Resume.pdf', cookie, headers = {}, field = 'file' } = {}) {
  const form = new FormData()
  if (content !== null) form.append(field, new File([content], name))
  const res = await app.request('/api/import', {
    method: 'POST',
    body: form,
    headers: { 'X-Requested-With': 'resumebanao', ...(cookie ? { Cookie: cookie } : {}), ...headers },
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

describe('POST /api/import', () => {
  it('returns resume data for a PDF without saving anything', async () => {
    const cookie = await signUp('pdf@example.com')
    const { status, body } = await upload(PDF(), { cookie })
    expect(status).toBe(200)
    expect(body.extractor).toBe('rules')
    expect(body.data.personal.fullName).toBe('Maya Lindqvist')
    expect(Array.isArray(body.data.sections)).toBe(true)

    const list = await app.request('/api/resumes', { headers: { Cookie: cookie } })
    expect(await list.json()).toEqual([])
  })

  it('accepts DOCX files', async () => {
    const cookie = await signUp('docx@example.com')
    const { status, body } = await upload(DOCX(), { name: 'cv.docx', cookie })
    expect(status).toBe(200)
    expect(body.data.personal.fullName).toBe('Daniel Okafor')
  })

  it('requires a signed-in user', async () => {
    const { status } = await upload(PDF())
    expect(status).toBe(401)
  })

  it('requires the X-Requested-With header', async () => {
    const cookie = await signUp('csrf@example.com')
    const form = new FormData()
    form.append('file', new File([PDF()], 'a.pdf'))
    const missing = await app.request('/api/import', { method: 'POST', body: form, headers: { Cookie: cookie } })
    expect(missing.status).toBe(403)
    const wrong = await upload(PDF(), { cookie, headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    expect(wrong.status).toBe(403)
  })

  it('rejects bodies that are not multipart', async () => {
    const cookie = await signUp('json@example.com')
    const res = await app.request('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'resumebanao', Cookie: cookie },
      body: '{}',
    })
    expect(res.status).toBe(415)
  })

  it('rejects a request without a file', async () => {
    const cookie = await signUp('nofile@example.com')
    const { status, body } = await upload(null, { cookie })
    expect(status).toBe(400)
    expect(body.code).toBe('NO_FILE')
    // A plain text field named "file" is not an upload either.
    const form = new FormData()
    form.append('file', 'plain text')
    const res = await app.request('/api/import', {
      method: 'POST',
      body: form,
      headers: { 'X-Requested-With': 'resumebanao', Cookie: cookie },
    })
    expect(res.status).toBe(400)
  })

  it('checks the file contents, not its name', async () => {
    const cookie = await signUp('type@example.com')
    for (const [content, name] of [
      ['just some text', 'resume.pdf'],
      [Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]), 'resume.docx'], // a zip, but not a Word document
      ['', 'empty.pdf'],
    ]) {
      const { status, body } = await upload(content, { name, cookie })
      expect(status, name).toBe(400)
      expect(body.code).toBe('UNSUPPORTED_TYPE')
    }
  })

  it('rejects files over 5 MB', async () => {
    const cookie = await signUp('big@example.com')
    const slightlyOver = FAKE_PDF('x'.repeat(MAX_BYTES - 8)) // 5 MB + 1 byte, fits the envelope allowance
    const a = await upload(slightlyOver, { cookie })
    expect(a.status).toBe(413)
    expect(a.body.code).toBe('FILE_TOO_LARGE')
    const wayOver = FAKE_PDF('x'.repeat(MAX_BYTES + 200_000)) // stopped by the request size limit
    const b = await upload(wayOver, { cookie })
    expect(b.status).toBe(413)
    expect(b.body.code).toBe('FILE_TOO_LARGE')
  })

  it('limits each user to 5 imports a day, and rejected files do not count', async () => {
    const cookie = await signUp('limit@example.com')
    for (let i = 0; i < 6; i++) expect((await upload('not a resume', { cookie })).status).toBe(400)
    for (let i = 0; i < 5; i++) expect((await upload(PDF(), { cookie })).status).toBe(200)
    const sixth = await upload(PDF(), { cookie })
    expect(sixth.status).toBe(429)
    expect(sixth.body.code).toBe('RATE_LIMITED')

    const other = await signUp('limit-other@example.com')
    expect((await upload(PDF(), { cookie: other })).status).toBe(200)
  })

  it('reports unreadable, scanned and too-long files with a code the client can act on', async () => {
    const cookie = await signUp('unreadable@example.com')
    const broken = await upload(FAKE_PDF('not really a pdf'), { cookie })
    expect(broken.status).toBe(422)
    expect(broken.body.code).toBe('UNREADABLE')
    const scanned = await upload(fixture('scanned.pdf'), { cookie })
    expect(scanned.status).toBe(422)
    expect(scanned.body.code).toBe('SCANNED_PDF')
    const long = await upload(fixture('too-long.pdf'), { cookie })
    expect(long.status).toBe(422)
    expect(long.body.code).toBe('TOO_MANY_PAGES')
  })

  it('leaves the JSON-only rule in place for other routes', async () => {
    const cookie = await signUp('rule@example.com')
    const form = new FormData()
    form.append('title', 'x')
    const res = await app.request('/api/resumes', {
      method: 'POST',
      body: form,
      headers: { 'X-Requested-With': 'resumebanao', Cookie: cookie },
    })
    expect(res.status).toBe(415)
  })
})
