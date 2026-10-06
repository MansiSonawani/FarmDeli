import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractorNameFor, parseExtractorConfig, registerExtractor, runExtractor } from './index.js'

const doc = { kind: 'pdf', pageCount: 1, lines: [{ text: 'Ada Lovelace', page: 1, bold: false }], text: 'Ada Lovelace' }
const fake = (name, fullName) => ({
  name,
  extract: async () => ({ data: { personal: { fullName }, sections: [] }, warnings: [], extractor: name }),
})

afterEach(() => vi.restoreAllMocks())

describe('parseExtractorConfig', () => {
  it('reads a plain name, a tier map, and tolerates blanks', () => {
    expect(parseExtractorConfig('rules')).toEqual({ default: 'rules' })
    expect(parseExtractorConfig('free:rules, premium:ai')).toEqual({ free: 'rules', premium: 'ai' })
    expect(parseExtractorConfig('')).toEqual({})
    expect(parseExtractorConfig(undefined)).toEqual({})
    expect(parseExtractorConfig(' , free: ,:ai')).toEqual({})
  })
})

describe('extractorNameFor', () => {
  it('defaults to rules', () => {
    expect(extractorNameFor({ id: '1' }, undefined)).toBe('rules')
  })

  it('uses the plain name for everyone', () => {
    expect(extractorNameFor({ id: '1' }, 'ai')).toBe('ai')
    expect(extractorNameFor({ id: '1', plan: 'premium' }, 'ai')).toBe('ai')
  })

  it('picks by plan, treating users without a plan as free', () => {
    const config = 'free:rules,premium:ai'
    expect(extractorNameFor({ id: '1' }, config)).toBe('rules')
    expect(extractorNameFor({ id: '1', plan: 'free' }, config)).toBe('rules')
    expect(extractorNameFor({ id: '1', plan: 'premium' }, config)).toBe('ai')
    expect(extractorNameFor({ id: '1', plan: 'team' }, config)).toBe('rules')
  })
})

describe('runExtractor', () => {
  it('runs the stub rules extractor by default', async () => {
    const result = await runExtractor(doc, { config: undefined })
    expect(result.extractor).toBe('rules')
    expect(result.data.personal.fullName).toBe('Ada Lovelace')
  })

  it('swaps extractors by configuration alone', async () => {
    registerExtractor(fake('alpha', 'From Alpha'))
    registerExtractor(fake('beta', 'From Beta'))
    expect((await runExtractor(doc, { config: 'alpha' })).data.personal.fullName).toBe('From Alpha')
    expect((await runExtractor(doc, { config: 'beta' })).data.personal.fullName).toBe('From Beta')
    expect(
      (await runExtractor(doc, { config: 'free:alpha,premium:beta', user: { id: '1', plan: 'premium' } })).extractor,
    ).toBe('beta')
  })

  it('falls back to rules, with a warning, when the chosen extractor throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    registerExtractor({
      name: 'boom',
      extract: async () => {
        throw new Error('model unavailable')
      },
    })
    const result = await runExtractor(doc, { config: 'boom' })
    expect(result.extractor).toBe('rules')
    expect(result.warnings.map((w) => w.code)).toContain('EXTRACTOR_FALLBACK')
  })

  it('falls back to rules when the configured name is unknown', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await runExtractor(doc, { config: 'does-not-exist' })
    expect(result.extractor).toBe('rules')
    expect(result.warnings.map((w) => w.code)).toContain('EXTRACTOR_FALLBACK')
  })
})
