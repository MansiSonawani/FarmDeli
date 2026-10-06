// Prints how accurately the import reads each fixture (see server/import/score.js).
//
//   node scripts/score-import.mjs            a table of scores per fixture
//   node scripts/score-import.mjs --verbose  also every mismatch
//   node scripts/score-import.mjs --verbose person-b   only fixtures whose name contains "person-b"
//
// Set IMPORT_EXTRACTOR to score a different extractor, for example IMPORT_EXTRACTOR=ai.

import { readFileSync } from 'node:fs'
import { importResume } from '../server/import/index.js'
import { sniffKind } from '../server/import/limits.js'
import { scoreImport } from '../server/import/score.js'

const dir = new URL('../server/import/__fixtures__/', import.meta.url)
const read = (name) => readFileSync(new URL(name, dir))
const args = process.argv.slice(2)
const verbose = args.includes('--verbose')
const filter = args.find((a) => !a.startsWith('--'))

const rows = []
for (const { file, expected, dateFormat } of JSON.parse(read('manifest.json'))) {
  if (filter && !file.includes(filter)) continue
  const buffer = read(file)
  const { data, warnings } = await importResume(buffer, { kind: sniffKind(buffer) })
  const result = scoreImport(data, JSON.parse(read(expected)), { dateFormat })
  rows.push({
    file,
    correct: `${result.matched}/${result.total}`,
    score: `${(result.score * 100).toFixed(1)}%`,
    warnings: warnings.map((w) => w.code).join(' '),
  })
  if (verbose && result.failures.length) console.log(`\n${file}\n  ${result.failures.join('\n  ')}`)
}
console.table(rows)
const average = rows.reduce((sum, r) => sum + parseFloat(r.score), 0) / Math.max(1, rows.length)
console.log(`average: ${average.toFixed(1)}%`)
