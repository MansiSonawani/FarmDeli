import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

// Tests run through Vite, which resolves extension-less imports; the production server runs on plain
// Node, which does not. Files under src/ that the server imports must use explicit ".js" extensions.
describe('server imports of shared src files', () => {
  it('load under plain Node', () => {
    const script = `
      const { emptyResume } = await import('../../src/lib/defaults.js')
      process.stdout.write(JSON.stringify(Object.keys(emptyResume())))
    `
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: new URL('.', import.meta.url),
      encoding: 'utf8',
    })
    expect(JSON.parse(out)).toEqual(['personal', 'sections'])
  })
})
