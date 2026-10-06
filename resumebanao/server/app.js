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

export function createApp({ db, anthropicApiKey, staticRoot, runAi = defaultRunAi }) {
  const app = new Hono()
  const api = new Hono()
  const authLimiter = createRateLimiter({ limit: 20, windowMs: 15 * 60_000 })
  const aiLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 60_000 })

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
  api.use('*', async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      if (!c.req.header('content-type')?.startsWith('application/json')) {
        return c.json({ error: 'Expected application/json' }, 415)
      }
    }
    await next()
  })
  api.use('*', bodyLimit({ maxSize: 2 * 1024 * 1024, onError: (c) => c.json({ error: 'Request too large' }, 413) }))

  api.onError((error, c) => {
    if (error instanceof HttpError) return c.json({ error: error.message }, error.status)
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

  // ---- Public share links ----

  api.get('/public/:slug', async (c) => {
    const slug = c.req.param('slug')
    if (!SLUG_RE.test(slug)) throw new HttpError(404, 'Resume not found')
    const { rows } = await db.query(`select ${COLUMNS} from resumes where slug = $1 and is_public = true`, [slug])
    if (!rows[0]) throw new HttpError(404, 'Resume not found')
    return c.json(rows[0])
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
