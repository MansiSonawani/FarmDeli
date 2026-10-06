import { readFile } from 'node:fs/promises'

const SCHEMA = new URL('./schema.sql', import.meta.url)

// Both clients expose `query(text, params) -> { rows }`; `exec` runs a multi-statement script.
export async function connect(databaseUrl = process.env.DATABASE_URL) {
  if (databaseUrl) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 })
    return {
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
      close: () => pool.end(),
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set. On Railway, add a Postgres service and reference its DATABASE_URL.')
  }

  // Local development and tests: in-process Postgres, no install needed. Data lives in memory.
  const { PGlite } = await import('@electric-sql/pglite')
  const lite = await PGlite.create()
  return {
    query: (text, params) => lite.query(text, params),
    exec: (sql) => lite.exec(sql),
    close: () => lite.close(),
  }
}

export async function migrate(db) {
  await db.exec(await readFile(SCHEMA, 'utf8'))
}
