// Production entry point: serves the built frontend (dist/) and the /api routes from one process.
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { connect, migrate } from './db.js'

const db = await connect()
await migrate(db)

// serveStatic resolves its root against the working directory, so point it at ../dist from there.
const staticRoot = relative(process.cwd(), fileURLToPath(new URL('../dist', import.meta.url))) || '.'
const app = createApp({ db, anthropicApiKey: process.env.ANTHROPIC_API_KEY, staticRoot })
const port = Number(process.env.PORT) || 3000

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`resumebanao listening on http://localhost:${info.port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => db.close().finally(() => process.exit(0)))
  })
}
