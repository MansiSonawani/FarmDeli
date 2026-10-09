import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from '@hono/node-server/serve-static'
import { runAi as defaultRunAi } from './ai.js'
import {
  DUMMY_HASH,
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE,
  SESSION_DAYS,
  hashPassword,
  hashToken,
  isValidEmail,
  newSessionToken,
  normalizeEmail,
  verifyPassword,
} from './auth.js'
import { ImportError, MAX_BYTES, MAX_IMPORTS_PER_DAY } from './import/errors.js'
import { importResume } from './import/index.js'
import { inspectUpload } from './import/limits.js'
import { createRateLimiter } from './rate-limit.js'

const COLUMNS = 'id, title, data, style, is_public, slug, created_at, updated_at'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_RE = /^[a-z0-9-]{1,80}$/
const MAX_PASSWORD_LENGTH = 200

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function readJson(c) {
  const body = await c.req.json().catch(() => null)
  if (!isObject(body)) throw new HttpError(400, 'Invalid JSON body')
  return body
}

function clientIp(c) {
  return c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'local'
}

// Validates the editable resume fields. Unknown fields are ignored; `user_id` can never be set.
function resumeFields(body) {
  const fields = {}
  if ('title' in body) {
    if (typeof body.title !== 'string' || body.title.length > 200) throw new HttpError(400, 'Invalid title')
    fields.title = body.title
  }
  for (const key of ['data', 'style']) {
    if (key in body) {
      if (!isObject(body[key])) throw new HttpError(400, `Invalid ${key}`)
      fields[key] = JSON.stringify(body[key])
    }
  }
  if ('is_public' in body) {
    if (typeof body.is_public !== 'boolean') throw new HttpError(400, 'Invalid is_public')
    fields.is_public = body.is_public
  }
  if ('slug' in body) {
    if (body.slug !== null && (typeof body.slug !== 'string' || !SLUG_RE.test(body.slug))) {
      throw new HttpError(400, 'Invalid share link')
    }
    fields.slug = body.slug
  }
  return fields
}

// ---- Job tracker fields ----

// applied_on is returned as text so it stays a plain YYYY-MM-DD date (no time zone shift).
const JOB_COLUMNS = `id, role, company, url, location, work_mode, stage, position, applied_on::text as applied_on,
  salary_min, salary_max, salary_expected, source, referrer, resume_id, resume_snapshot, description, notes,
  next_step, next_step_at, starred, events, contacts, created_at, updated_at`
const JOB_STAGES = ['wishlist', 'applied', 'interviewing', 'offer', 'rejected']
const WORK_MODES = ['onsite', 'hybrid', 'remote']
const JOB_SOURCES = ['', 'referral', 'linkedin', 'naukri', 'website', 'campus', 'recruiter', 'other']
const JOB_JSON_FIELDS = new Set(['resume_snapshot', 'events', 'contacts'])
const JOB_TEXT_LIMITS = {
  url: 2000,
  location: 200,
  referrer: 200,
  next_step: 300,
  description: 50_000,
  notes: 50_000,
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_LIST_ITEMS = 500

// Validates the editable job fields. Unknown fields are ignored; `user_id` can never be set.
function jobFields(body, { creating = false } = {}) {
  const fields = {}
  for (const key of ['role', 'company']) {
    if (key in body || creating) {
      const value = typeof body[key] === 'string' ? body[key].trim() : ''
      if (!value || value.length > 200) throw new HttpError(400, `Add the ${key === 'role' ? 'role' : 'company'}.`)
      fields[key] = value
    }
  }
  for (const [key, max] of Object.entries(JOB_TEXT_LIMITS)) {
    if (key in body) {
      if (body[key] !== null && (typeof body[key] !== 'string' || body[key].length > max)) {
        throw new HttpError(400, `Invalid ${key}`)
      }
      fields[key] = body[key]
    }
  }
  const oneOf = (key, allowed, nullable) => {
    if (!(key in body)) return
    if (!(allowed.includes(body[key]) || (nullable && body[key] === null))) throw new HttpError(400, `Invalid ${key}`)
    fields[key] = body[key]
  }
  oneOf('stage', JOB_STAGES, false)
  oneOf('work_mode', WORK_MODES, true)
  oneOf('source', JOB_SOURCES, true)
  for (const key of ['position', 'salary_min', 'salary_max', 'salary_expected']) {
    if (key in body) {
      const nullable = key !== 'position'
      const ok = (nullable && body[key] === null) || (typeof body[key] === 'number' && Number.isFinite(body[key]))
      if (!ok || (key !== 'position' && body[key] !== null && (body[key] < 0 || body[key] > 100_000))) {
        throw new HttpError(400, `Invalid ${key}`)
      }
      fields[key] = body[key]
    }
  }
  if ('applied_on' in body) {
    const v = body.applied_on
    if (v !== null && (typeof v !== 'string' || !DATE_RE.test(v) || Number.isNaN(Date.parse(v)))) {
      throw new HttpError(400, 'Invalid applied_on')
    }
    fields.applied_on = v
  }
  if ('next_step_at' in body) {
    const v = body.next_step_at
    if (v !== null && (typeof v !== 'string' || Number.isNaN(Date.parse(v))))
      throw new HttpError(400, 'Invalid next_step_at')
    fields.next_step_at = v
  }
  if ('starred' in body) {
    if (typeof body.starred !== 'boolean') throw new HttpError(400, 'Invalid starred')
    fields.starred = body.starred
  }
  if ('resume_id' in body) {
    if (body.resume_id !== null && (typeof body.resume_id !== 'string' || !UUID_RE.test(body.resume_id))) {
      throw new HttpError(400, 'Invalid resume_id')
    }
    fields.resume_id = body.resume_id
  }
  if ('resume_snapshot' in body) {
    if (body.resume_snapshot !== null && !isObject(body.resume_snapshot))
      throw new HttpError(400, 'Invalid resume_snapshot')
    fields.resume_snapshot = body.resume_snapshot === null ? null : JSON.stringify(body.resume_snapshot)
  }
  for (const key of ['events', 'contacts']) {
    if (key in body) {
      const list = body[key]
      if (!Array.isArray(list) || list.length > MAX_LIST_ITEMS || !list.every(isObject)) {
        throw new HttpError(400, `Invalid ${key}`)
      }
      fields[key] = JSON.stringify(list)
    }
  }
  return fields
}

const jobPlaceholder = (key, index) => `$${index}${JOB_JSON_FIELDS.has(key) ? '::jsonb' : ''}`

export function createApp({ db, anthropicApiKey, staticRoot, runAi = defaultRunAi }) {
  const app = new Hono()
  const api = new Hono()
  const authLimiter = createRateLimiter({ limit: 20, windowMs: 15 * 60_000 })
  const aiLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 60_000 })
  const importLimiter = createRateLimiter({ limit: MAX_IMPORTS_PER_DAY, windowMs: 24 * 60 * 60_000 })

  app.use(
    '*',
    secureHeaders({
      xFrameOptions: 'DENY',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
    }),
  )

  async function currentUser(c) {
    const token = getCookie(c, SESSION_COOKIE)
    if (!token) return null
    const { rows } = await db.query(
      `select u.id, u.email from sessions s join users u on u.id = s.user_id
       where s.id = $1 and s.expires_at > now()`,
      [hashToken(token)],
    )
    return rows[0] ?? null
  }

  async function startSession(c, userId) {
    const token = newSessionToken()
    await db.query(
      `insert into sessions (id, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3))`,
      [hashToken(token), userId, SESSION_DAYS],
    )
    const https = c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:'
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: https,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    })
  }

  const requireUser = async (c, next) => {
    const user = await currentUser(c)
    if (!user) return c.json({ error: 'Please sign in again.' }, 401)
    c.set('user', user)
    await next()
  }

  const limitBy = (limiter, keyOf) => async (c, next) => {
    if (!limiter(keyOf(c))) return c.json({ error: 'Too many attempts. Please wait a few minutes.' }, 429)
    await next()
  }

  // Cross-site forms cannot send JSON, so requiring it on writes blocks CSRF on top of SameSite cookies.
  // The resume upload is multipart, which a cross-site form *can* send, so that route instead requires a
  // custom header: browsers only let a page add one to a cross-origin request after a CORS preflight,
  // and this server never approves one.
  const isUpload = (c) => c.req.path === '/api/import'
  api.use('*', async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      if (isUpload(c)) {
        if (c.req.header('x-requested-with') !== 'resumebanao') return c.json({ error: 'Forbidden' }, 403)
        if (!c.req.header('content-type')?.startsWith('multipart/form-data')) {
          return c.json({ error: 'Expected multipart/form-data' }, 415)
        }
      } else if (!c.req.header('content-type')?.startsWith('application/json')) {
        return c.json({ error: 'Expected application/json' }, 415)
      }
    }
    await next()
  })
  const jsonLimit = bodyLimit({ maxSize: 2 * 1024 * 1024, onError: (c) => c.json({ error: 'Request too large' }, 413) })
  // A little headroom over the file limit for the multipart envelope; the file itself is checked exactly.
  const uploadLimit = bodyLimit({
    maxSize: MAX_BYTES + 64 * 1024,
    onError: (c) => c.json({ error: 'That file is over 5 MB.', code: 'FILE_TOO_LARGE' }, 413),
  })
  api.use('*', (c, next) => (isUpload(c) ? uploadLimit(c, next) : jsonLimit(c, next)))

  api.onError((error, c) => {
    if (error instanceof HttpError) return c.json({ error: error.message }, error.status)
    if (error instanceof ImportError) return c.json({ error: error.message, code: error.code }, error.status)
    console.error(error)
    return c.json({ error: 'Something went wrong. Please try again.' }, 500)
  })

  api.get('/health', async (c) => {
    await db.query('select 1')
    return c.json({ ok: true })
  })

  // ---- Auth ----

  api.get('/auth/me', async (c) => c.json({ user: await currentUser(c) }))

  api.post('/auth/signup', limitBy(authLimiter, clientIp), async (c) => {
    const body = await readJson(c)
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''
    if (!isValidEmail(email)) throw new HttpError(400, 'Enter a valid email address.')
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      throw new HttpError(400, `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`)
    }
    const { rows } = await db.query(
      `insert into users (email, password_hash) values ($1, $2) on conflict (email) do nothing returning id, email`,
      [email, await hashPassword(password)],
    )
    if (!rows[0]) throw new HttpError(409, 'An account with this email already exists. Sign in instead.')
    await startSession(c, rows[0].id)
    return c.json({ user: rows[0] }, 201)
  })

  api.post('/auth/signin', limitBy(authLimiter, clientIp), async (c) => {
    const body = await readJson(c)
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password.slice(0, MAX_PASSWORD_LENGTH) : ''
    const { rows } = await db.query('select id, email, password_hash from users where email = $1', [email])
    const user = rows[0]
    const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH)
    if (!user || !ok) throw new HttpError(401, 'Wrong email or password.')
    await db.query('delete from sessions where expires_at < now()')
    await startSession(c, user.id)
    return c.json({ user: { id: user.id, email: user.email } })
  })

  api.post('/auth/signout', async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) await db.query('delete from sessions where id = $1', [hashToken(token)])
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.json({ ok: true })
  })

  // ---- Resumes (owner only) ----

  const ownResume = async (c) => {
    const id = c.req.param('id')
    if (!UUID_RE.test(id)) throw new HttpError(404, 'Resume not found')
    return id
  }

  api.get('/resumes', requireUser, async (c) => {
    const { rows } = await db.query(`select ${COLUMNS} from resumes where user_id = $1 order by updated_at desc`, [
      c.get('user').id,
    ])
    return c.json(rows)
  })

  api.get('/resumes/:id', requireUser, async (c) => {
    const { rows } = await db.query(`select ${COLUMNS} from resumes where id = $1 and user_id = $2`, [
      await ownResume(c),
      c.get('user').id,
    ])
    if (!rows[0]) throw new HttpError(404, 'Resume not found')
    return c.json(rows[0])
  })

  api.post('/resumes', requireUser, async (c) => {
    const fields = resumeFields(await readJson(c))
    const { rows } = await db.query(
      `insert into resumes (user_id, title, data, style)
       values ($1, coalesce($2, 'Untitled resume'), coalesce($3::jsonb, '{}'::jsonb), coalesce($4::jsonb, '{}'::jsonb))
       returning ${COLUMNS}`,
      [c.get('user').id, fields.title ?? null, fields.data ?? null, fields.style ?? null],
    )
    return c.json(rows[0], 201)
  })

  api.patch('/resumes/:id', requireUser, async (c) => {
    const id = await ownResume(c)
    const fields = resumeFields(await readJson(c))
    const keys = Object.keys(fields)
    const assignments = keys.map((key, i) => `${key} = $${i + 3}${key === 'data' || key === 'style' ? '::jsonb' : ''}`)
    try {
      const { rows } = await db.query(
        `update resumes set ${[...assignments, 'updated_at = now()'].join(', ')}
         where id = $1 and user_id = $2 returning ${COLUMNS}`,
        [id, c.get('user').id, ...keys.map((key) => fields[key])],
      )
      if (!rows[0]) throw new HttpError(404, 'Resume not found')
      return c.json(rows[0])
    } catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'That share link is already taken. Please try again.')
      throw error
    }
  })

  api.delete('/resumes/:id', requireUser, async (c) => {
    await db.query('delete from resumes where id = $1 and user_id = $2', [await ownResume(c), c.get('user').id])
    return c.json({ ok: true })
  })

  // ---- Jobs (owner only) ----

  const ownJob = (c) => {
    const id = c.req.param('id')
    if (!UUID_RE.test(id)) throw new HttpError(404, 'Job not found')
    return id
  }

  // A job can only point at one of the same user's resumes.
  const checkResume = async (fields, userId) => {
    if (!fields.resume_id) return
    const { rows } = await db.query('select 1 from resumes where id = $1 and user_id = $2', [fields.resume_id, userId])
    if (!rows[0]) throw new HttpError(400, 'Resume not found')
  }

  api.get('/jobs', requireUser, async (c) => {
    const { rows } = await db.query(
      `select ${JOB_COLUMNS} from jobs where user_id = $1 order by stage, position, created_at`,
      [c.get('user').id],
    )
    return c.json(rows)
  })

  api.post('/jobs', requireUser, async (c) => {
    const userId = c.get('user').id
    const fields = jobFields(await readJson(c), { creating: true })
    await checkResume(fields, userId)
    const keys = Object.keys(fields)
    const { rows } = await db.query(
      `insert into jobs (user_id, ${keys.join(', ')})
       values ($1, ${keys.map((key, i) => jobPlaceholder(key, i + 2)).join(', ')})
       returning ${JOB_COLUMNS}`,
      [userId, ...keys.map((key) => fields[key])],
    )
    return c.json(rows[0], 201)
  })

  api.patch('/jobs/:id', requireUser, async (c) => {
    const id = ownJob(c)
    const userId = c.get('user').id
    const fields = jobFields(await readJson(c))
    await checkResume(fields, userId)
    const keys = Object.keys(fields)
    const assignments = keys.map((key, i) => `${key} = ${jobPlaceholder(key, i + 3)}`)
    const { rows } = await db.query(
      `update jobs set ${[...assignments, 'updated_at = now()'].join(', ')}
       where id = $1 and user_id = $2 returning ${JOB_COLUMNS}`,
      [id, userId, ...keys.map((key) => fields[key])],
    )
    if (!rows[0]) throw new HttpError(404, 'Job not found')
    return c.json(rows[0])
  })

  api.delete('/jobs/:id', requireUser, async (c) => {
    await db.query('delete from jobs where id = $1 and user_id = $2', [ownJob(c), c.get('user').id])
    return c.json({ ok: true })
  })

  // ---- Public share links ----

  api.get('/public/:slug', async (c) => {
    const slug = c.req.param('slug')
    if (!SLUG_RE.test(slug)) throw new HttpError(404, 'Resume not found')
    const { rows } = await db.query(`select ${COLUMNS} from resumes where slug = $1 and is_public = true`, [slug])
    if (!rows[0]) throw new HttpError(404, 'Resume not found')
    return c.json(rows[0])
  })

  // ---- Resume import: reads an uploaded PDF/DOCX and returns resume data; the client saves it ----

  api.post('/import', requireUser, async (c) => {
    const form = await c.req.parseBody()
    const file = form.file
    if (!(file instanceof File)) throw new ImportError(400, 'NO_FILE', 'Choose a PDF or Word file to import.')

    // Wrong-type and oversized files are rejected before they count against the daily limit.
    const buffer = Buffer.from(await file.arrayBuffer())
    const kind = inspectUpload(buffer)
    if (!importLimiter(c.get('user').id)) {
      throw new ImportError(
        429,
        'RATE_LIMITED',
        `You can import ${MAX_IMPORTS_PER_DAY} resumes a day. Try again tomorrow.`,
      )
    }

    return c.json(await importResume(buffer, { kind, user: c.get('user') }))
  })

  // ---- AI writing help (signed-in users only, so strangers cannot spend the API credits) ----

  api.post(
    '/ai',
    requireUser,
    limitBy(aiLimiter, (c) => c.get('user').id),
    async (c) => {
      const body = await readJson(c)
      const { status, body: result } = await runAi({
        apiKey: anthropicApiKey,
        mode: body.mode,
        text: body.text,
        context: body.context,
      })
      return c.json(result, status)
    },
  )

  api.notFound((c) => c.json({ error: 'Not found' }, 404))

  app.route('/api', api)
  app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))

  if (staticRoot) {
    // Vite fingerprints asset filenames, so they can be cached forever; HTML must always be revalidated.
    const cacheHeaders = (path, c) => {
      const fingerprinted = /[\\/]assets[\\/]/.test(path)
      c.header('Cache-Control', fingerprinted ? 'public, max-age=31536000, immutable' : 'no-cache')
    }
    app.use('*', serveStatic({ root: staticRoot, onFound: cacheHeaders }))
    // Single-page app: React Router handles every other path (/app, /r/<slug>, ...).
    app.get('*', serveStatic({ root: staticRoot, path: 'index.html', onFound: cacheHeaders }))
  }

  return app
}
