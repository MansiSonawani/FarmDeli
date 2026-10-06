import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { importResume } from './index.js'
import { sniffKind } from './limits.js'
import { scoreImport } from './score.js'

// Runs the whole import on every fixture and scores it against the known answer. The scores are the measure
// of accuracy: they must not fall below the recorded baseline, and an AI extractor has to beat them to be
// worth switching to.
//
//   npx vitest run server/import/score          check against the baseline
//   UPDATE_BASELINE=1 npx vitest run server/import/score   record the current scores as the new baseline
//   REPORT=1 npx vitest run server/import/score            also print every mismatch

const dir = new URL('./__fixtures__/', import.meta.url)
const read = (name) => readFileSync(new URL(name, dir))
const manifest = JSON.parse(read('manifest.json'))
const baselineFile = new URL('baseline.json', dir)
const baseline = JSON.parse(readFileSync(baselineFile, 'utf8').trim() || '{}')

// A little slack so a harmless change does not fail the build, while real regressions still do.
const TOLERANCE = 0.01

const results = {}

describe('import accuracy on fixtures', () => {
  for (const { file, expected, dateFormat } of manifest) {
    it(file, async () => {
      const buffer = read(file)
      const { data } = await importResume(buffer, { kind: sniffKind(buffer) })
      const outcome = scoreImport(data, JSON.parse(read(expected)), { dateFormat })
      results[file] = outcome
      if (process.env.REPORT)
        console.log(`\n${file}: ${(outcome.score * 100).toFixed(1)}%\n  ${outcome.failures.join('\n  ')}`)
      expect(outcome.score).toBeGreaterThanOrEqual((baseline[file] ?? 0) - TOLERANCE)
    })
  }

  it('prints a summary and records the baseline when asked', () => {
    const rows = Object.entries(results).map(([file, r]) => ({
      file,
      correct: `${r.matched}/${r.total}`,
      score: `${(r.score * 100).toFixed(1)}%`,
    }))
    const average =
      Object.values(results).reduce((sum, r) => sum + r.score, 0) / Math.max(1, Object.keys(results).length)
    console.table(rows)
    console.log(`average: ${(average * 100).toFixed(1)}%`)
    if (process.env.UPDATE_BASELINE) {
      const next = Object.fromEntries(
        Object.entries(results).map(([file, r]) => [file, Math.floor(r.score * 1000) / 1000]),
      )
      writeFileSync(baselineFile, JSON.stringify(next, null, 2) + '\n')
    }
    expect(rows.length).toBe(manifest.length)
  })
})
