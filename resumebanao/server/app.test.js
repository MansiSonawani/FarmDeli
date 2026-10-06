import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { connect, migrate } from './db.js'

let db
let app

beforeAll(async () => {
  db = await connect('')
  await migrate(db)
  await migrate(db) // must be safe to run on every start
  app = createApp({
    db,
    anthropicApiKey: 'test',
    runAi: async ({ mode, text }) => ({ status: 200, body: { text: `${mode}:${text}` } }),
  })
}, 60_000)

afterAll(() => db?.close())

async function call(path, { method = 'GET', body, cookie, json = method !== 'GET' } = {}) {
  const headers = {}
  if (json) headers['Content-Type'] = 'application/json'
  if (cookie) headers.Cookie = cookie
  const res = await app.request(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? (json ? '{}' : undefined) : JSON.stringify(body),
  })
  const setCookie = res.headers.get('set-cookie')
  return { status: res.status, body: await res.json().catch(() => null), cookie: setCookie?.split(';')[0] }
}

async function signUp(email) {
  const res = await call('/auth/signup', { method: 'POST', body: { email, password: 'correct horse' } })
  expect(res.status).toBe(201)
  return res.cookie
}

describe('auth', () => {
  it('signs up, reports the session and signs out', async () => {
    const res = await call('/auth/signup', {
      method: 'POST',
      body: { email: ' Ada@Example.com ', password: 'longenough' },
    })
    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('ada@example.com')
    expect(res.cookie).toMatch(/^rb_session=/)

    expect((await call('/auth/me', { cookie: res.cookie })).body.user.email).toBe('ada@example.com')

    await call('/auth/signout', { method: 'POST', cookie: res.cookie })
    expect((await call('/auth/me', { cookie: res.cookie })).body.user).toBeNull()
  })

  it('rejects duplicate emails, short passwords and bad emails', async () => {
    await signUp('dup@example.com')
    expect(
      (await call('/auth/signup', { method: 'POST', body: { email: 'DUP@example.com', password: '12345678' } })).status,
    ).toBe(409)
    expect(
      (await call('/auth/signup', { method: 'POST', body: { email: 'x@example.com', password: 'short' } })).status,
    ).toBe(400)
    expect((await call('/auth/signup', { method: 'POST', body: { email: 'nope', password: '12345678' } })).status).toBe(
      400,
    )
  })

  it('signs in only with the right password', async () => {
    await signUp('grace@example.com')
    const wrong = await call('/auth/signin', {
      method: 'POST',
      body: { email: 'grace@example.com', password: 'wrong pass' },
    })
    expect(wrong.status).toBe(401)
    const unknown = await call('/auth/signin', { method: 'POST', body: { email: 'nobody@example.com', password: 'x' } })
    expect(unknown.status).toBe(401)
    const right = await call('/auth/signin', {
      method: 'POST',
      body: { email: 'GRACE@example.com', password: 'correct horse' },
    })
    expect(right.status).toBe(200)
    expect((await call('/resumes', { cookie: right.cookie })).status).toBe(200)
  })
})

describe('resumes', () => {
  it('requires a session', async () => {
    expect((await call('/resumes')).status).toBe(401)
    expect((await call('/resumes', { method: 'POST', body: { title: 'x' } })).status).toBe(401)
  })

  it('keeps each user to their own resumes', async () => {
    const alice = await signUp('alice@example.com')
    const bob = await signUp('bob@example.com')

    const created = await call('/resumes', {
      method: 'POST',
      cookie: alice,
      body: {
        title: 'Alice CV',
        data: { personal: { fullName: 'Alice' } },
        style: { template: 'classic' },
        user_id: 'x',
      },
    })
    expect(created.status).toBe(201)
    expect(created.body.data.personal.fullName).toBe('Alice')
    const id = created.body.id

    const updated = await call(`/resumes/${id}`, { method: 'PATCH', cookie: alice, body: { title: 'Renamed' } })
    expect(updated.body.title).toBe('Renamed')
    expect(updated.body.data.personal.fullName).toBe('Alice')

    expect((await call('/resumes', { cookie: alice })).body.map((r) => r.id)).toEqual([id])
    expect((await call('/resumes', { cookie: bob })).body).toEqual([])
    expect((await call(`/resumes/${id}`, { cookie: bob })).status).toBe(404)
    expect((await call(`/resumes/${id}`, { method: 'PATCH', cookie: bob, body: { title: 'hacked' } })).status).toBe(404)
    await call(`/resumes/${id}`, { method: 'DELETE', cookie: bob })
    expect((await call(`/resumes/${id}`, { cookie: alice })).body.title).toBe('Renamed')

    expect((await call(`/resumes/${id}`, { method: 'DELETE', cookie: alice })).status).toBe(200)
    expect((await call(`/resumes/${id}`, { cookie: alice })).status).toBe(404)
    expect((await call('/resumes/not-a-uuid', { cookie: alice })).status).toBe(404)
  })

  it('validates fields', async () => {
    const cookie = await signUp('validate@example.com')
    expect((await call('/resumes', { method: 'POST', cookie, body: { data: [] } })).status).toBe(400)
    expect((await call('/resumes', { method: 'POST', cookie, body: { title: 5 } })).status).toBe(400)
    const { body } = await call('/resumes', { method: 'POST', cookie, body: {} })
    expect(body.title).toBe('Untitled resume')
    expect((await call(`/resumes/${body.id}`, { method: 'PATCH', cookie, body: { slug: 'Bad Slug!' } })).status).toBe(
      400,
    )
  })
})

describe('public links', () => {
  it('serves published resumes to anyone and hides them from other dashboards', async () => {
    const owner = await signUp('owner@example.com')
    const other = await signUp('other@example.com')
    const { body: resume } = await call('/resumes', { method: 'POST', cookie: owner, body: { title: 'Public' } })

    expect((await call('/public/owner-abc12')).status).toBe(404)
    await call(`/resumes/${resume.id}`, {
      method: 'PATCH',
      cookie: owner,
      body: { is_public: true, slug: 'owner-abc12' },
    })

    const shared = await call('/public/owner-abc12')
    expect(shared.status).toBe(200)
    expect(shared.body.title).toBe('Public')
    expect(shared.body.user_id).toBeUndefined()
    expect((await call('/resumes', { cookie: other })).body).toEqual([])

    const { body: second } = await call('/resumes', { method: 'POST', cookie: other, body: {} })
    const clash = await call(`/resumes/${second.id}`, { method: 'PATCH', cookie: other, body: { slug: 'owner-abc12' } })
    expect(clash.status).toBe(409)

    await call(`/resumes/${resume.id}`, { method: 'PATCH', cookie: owner, body: { is_public: false } })
    expect((await call('/public/owner-abc12')).status).toBe(404)
  })
})

describe('security', () => {
  it('rejects writes that are not JSON', async () => {
    const res = await call('/auth/signout', { method: 'POST', json: false })
    expect(res.status).toBe(415)
  })

  it('only lets signed-in users use AI', async () => {
    expect((await call('/ai', { method: 'POST', body: { mode: 'improve', text: 'hi' } })).status).toBe(401)
    const cookie = await signUp('ai@example.com')
    const res = await call('/ai', { method: 'POST', cookie, body: { mode: 'improve', text: 'hi' } })
    expect(res.body.text).toBe('improve:hi')
  })

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await call('/nope')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })
})
