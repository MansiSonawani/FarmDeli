import rules from './rules/index.js'

// Registry of extractors. To add one (for example the premium AI extractor), implement the
// Extractor contract in ../types.js, register it here, and select it with IMPORT_EXTRACTOR.
const EXTRACTORS = new Map([[rules.name, rules]])

export const DEFAULT_EXTRACTOR = rules.name

export function registerExtractor(extractor) {
  EXTRACTORS.set(extractor.name, extractor)
}

// "rules" -> { default: 'rules' }; "free:rules,premium:ai" -> { free: 'rules', premium: 'ai' }.
export function parseExtractorConfig(value) {
  const map = {}
  for (const part of String(value ?? '').split(',')) {
    const entry = part.trim()
    if (!entry) continue
    const [tier, name] = entry.includes(':') ? entry.split(':').map((s) => s.trim()) : ['default', entry]
    if (tier && name) map[tier] = name
  }
  return map
}

// Which extractor a user gets: their plan's entry, else the plain default, else the free tier's.
// Plans do not exist yet, so everyone is on 'free' until `user.plan` is added with the premium tier.
export function extractorNameFor(user, config = process.env.IMPORT_EXTRACTOR) {
  const map = parseExtractorConfig(config)
  return map[user?.plan ?? 'free'] ?? map.default ?? map.free ?? DEFAULT_EXTRACTOR
}

// Runs the configured extractor. If it is unknown or throws, the default extractor runs instead and
// the result carries an EXTRACTOR_FALLBACK warning; if the default itself throws, that error propagates.
/** @returns {Promise<import('../types.js').ImportResult>} */
export async function runExtractor(doc, { user, config } = {}) {
  const name = extractorNameFor(user, config)
  const chosen = EXTRACTORS.get(name)

  if (chosen) {
    try {
      return await chosen.extract(doc, { user })
    } catch (error) {
      if (name === DEFAULT_EXTRACTOR) throw error
      console.error(`Import extractor "${name}" failed; using "${DEFAULT_EXTRACTOR}" instead:`, error.message)
    }
  } else {
    console.error(`Unknown import extractor "${name}"; using "${DEFAULT_EXTRACTOR}" instead.`)
  }

  const result = await EXTRACTORS.get(DEFAULT_EXTRACTOR).extract(doc, { user })
  result.warnings.push({
    code: 'EXTRACTOR_FALLBACK',
    message: 'The advanced import was unavailable, so a simpler method was used. Please review the details carefully.',
  })
  return result
}
