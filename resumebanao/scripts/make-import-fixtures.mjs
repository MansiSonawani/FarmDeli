// Generates the resume import test fixtures in server/import/__fixtures__/.
//
//   VITE_DEMO_MODE=false npm run build && node scripts/make-import-fixtures.mjs
//
// - template-<id>.pdf: the example resume printed to PDF with each of the six templates, using the app's
//   own print path (the public resume page) in headless Edge or Chrome. sample.expected.json is the answer.
// - person-<x>.docx: hand-built Word resumes in different styles, each with its own expected.json.
// - scanned.pdf: a PDF that is only a picture (no text layer).
// All people are made up. Never add real resumes as fixtures.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deflateSync, crc32 } from 'node:zlib'
import { serve } from '@hono/node-server'
import { createApp } from '../server/app.js'
import { connect, migrate } from '../server/db.js'
import { sampleResume } from '../src/lib/defaults.js'
import { TEMPLATES, templateStyle } from '../src/lib/templates.js'
import { buildDocxFixtures } from './docx-fixtures.mjs'

const fileUrl = (path) => pathToFileURL(path).href
const root = fileURLToPath(new URL('..', import.meta.url))
const out = join(root, 'server/import/__fixtures__')
mkdirSync(out, { recursive: true })

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]
const browser = BROWSERS.find(existsSync)
if (!browser) throw new Error('Install Edge or Chrome to print the PDF fixtures.')
if (!existsSync(join(root, 'dist/index.html'))) throw new Error('Run `VITE_DEMO_MODE=false npm run build` first.')

// Prints pages with a headless browser driven over the DevTools protocol, so we can wait until the
// page has really rendered (the public resume page loads its data after the load event).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const DEBUG_PORT = 9333

async function startBrowser() {
  const profile = mkdtempSync(join(tmpdir(), 'rb-fixture-'))
  const child = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) break
    } catch {
      await sleep(200)
    }
  }

  // `ready` is a JavaScript expression that becomes true once the page is fully rendered.
  async function printToPdf(url, file, ready) {
    const target = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' })).json()
    const ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = reject
    })
    let nextId = 0
    const pending = new Map()
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      const waiting = pending.get(message.id)
      if (!waiting) return
      pending.delete(message.id)
      if (message.error) waiting.reject(new Error(message.error.message))
      else waiting.resolve(message.result)
    }
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++nextId
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      })

    await send('Page.navigate', { url })
    let ok = false
    for (let i = 0; i < 150 && !ok; i++) {
      await sleep(200)
      const { result } = await send('Runtime.evaluate', { expression: ready, returnByValue: true })
      ok = result.value === true
    }
    if (!ok) throw new Error(`Timed out waiting for ${url}`)
    await sleep(1500) // let pagination and web fonts settle
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true })
    writeFileSync(file, Buffer.from(pdf.data, 'base64'))
    ws.close()
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${target.id}`)
  }

  return {
    printToPdf,
    async close() {
      const exited = new Promise((resolve) => child.once('exit', resolve))
      child.kill()
      await exited
      try {
        rmSync(profile, { recursive: true, force: true, maxRetries: 5 })
      } catch {
        // The browser may still hold a file for a moment; a leftover temp folder is harmless.
      }
    },
  }
}

// A tiny PNG encoder (grey rows), so the "scanned" fixture needs no image library.
function png(width, height, pixel) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    return Buffer.concat([len, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 0, 0, 0, 0], 8) // 8-bit grey
  const rows = Buffer.alloc((width + 1) * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rows[y * (width + 1) + 1 + x] = pixel(x, y)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const pdfBrowser = await startBrowser()
const db = await connect('')
await migrate(db)
const app = createApp({ db, staticRoot: relative(process.cwd(), join(root, 'dist')) })
const { server, port } = await new Promise((resolve) => {
  const s = serve({ fetch: app.fetch, port: 0 }, (info) => resolve({ server: s, port: info.port }))
})
const base = `http://localhost:${port}`

try {
  const signup = await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fixtures@example.test', password: 'fixture-password-1' }),
  })
  const cookie = signup.headers.get('set-cookie').split(';')[0]
  const api = async (path, method, body) => {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status}`)
    return res.json()
  }

  // ---- template PDFs ----
  const manifest = []
  for (const { id } of TEMPLATES) {
    const style = templateStyle(id)
    const resume = await api('/resumes', 'POST', { title: id, data: sampleResume(), style })
    await api(`/resumes/${resume.id}`, 'PATCH', { is_public: true, slug: `fixture-${id}` })
    const file = `template-${id}.pdf`
    await pdfBrowser.printToPdf(
      `${base}/r/fixture-${id}`,
      join(out, file),
      "document.querySelectorAll('.cv-print-root .cv-page').length > 0",
    )
    manifest.push({ file, expected: 'sample.expected.json', dateFormat: style.dateFormat })
    console.log('wrote', file)
  }

  // ---- scanned PDF: one page that is a picture of text-like rows ----
  const picture = png(600, 800, (x, y) => (y % 40 < 8 && x > 40 && x < 560 ? 40 : 255)).toString('base64')
  const html = `<!doctype html><style>@page{size:A4;margin:0}body{margin:0}img{width:210mm;height:297mm;display:block}</style><img src="data:image/png;base64,${picture}">`
  writeFileSync(join(out, 'scanned.html'), html)
  await pdfBrowser.printToPdf(
    fileUrl(join(out, 'scanned.html')),
    join(out, 'scanned.pdf'),
    'document.images[0]?.complete === true',
  )
  rmSync(join(out, 'scanned.html'))
  console.log('wrote scanned.pdf')

  // ---- too long: five pages of text, over the four-page limit ----
  const pages = Array.from(
    { length: 5 },
    (_, i) =>
      `<section style="break-after:page"><h1>Page ${i + 1}</h1><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></section>`,
  )
  writeFileSync(join(out, 'too-long.html'), `<!doctype html><style>@page{size:A4}</style>${pages.join('')}`)
  await pdfBrowser.printToPdf(
    fileUrl(join(out, 'too-long.html')),
    join(out, 'too-long.pdf'),
    "document.querySelectorAll('section').length === 5",
  )
  rmSync(join(out, 'too-long.html'))
  console.log('wrote too-long.pdf')

  // ---- DOCX fixtures ----
  for (const { file, expected, dateFormat } of await buildDocxFixtures(out)) {
    manifest.push({ file, expected, dateFormat })
    console.log('wrote', file)
  }

  // ---- expected answers ----
  const strip = (data) => ({
    personal: { ...data.personal, photo: undefined },
    sections: data.sections.map(({ id, visible, column, ...rest }) => ({
      ...rest,
      items: (rest.items ?? []).map(({ id: _id, ...item }) => item),
    })),
  })
  writeFileSync(join(out, 'sample.expected.json'), JSON.stringify(strip(sampleResume()), null, 2) + '\n')
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
} finally {
  await pdfBrowser.close()
  server.close()
  await db.close()
}
