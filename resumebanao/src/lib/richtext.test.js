import { describe, expect, it } from 'vitest'
import { isRichTextEmpty, legacyToHtml, toHtml } from './richtext'

describe('legacyToHtml', () => {
  it('converts bullets, paragraphs and bold', () => {
    expect(legacyToHtml('Intro\n- Cut costs by **30%**\n- Shipped')).toBe(
      '<p>Intro</p><ul><li><p>Cut costs by <strong>30%</strong></p></li><li><p>Shipped</p></li></ul>',
    )
  })

  it('escapes HTML in old plain text', () => {
    expect(legacyToHtml('<script>alert(1)</script> & co')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; co</p>')
  })
})

describe('toHtml', () => {
  it('passes HTML through and converts plain text', () => {
    expect(toHtml('<p>Hi</p>')).toBe('<p>Hi</p>')
    expect(toHtml('Hi')).toBe('<p>Hi</p>')
    expect(toHtml('')).toBe('')
  })
})

describe('isRichTextEmpty', () => {
  it('ignores empty tags and whitespace', () => {
    expect(isRichTextEmpty('<p></p>')).toBe(true)
    expect(isRichTextEmpty('<ul><li><p>&nbsp;</p></li></ul>')).toBe(true)
    expect(isRichTextEmpty('')).toBe(true)
    expect(isRichTextEmpty('<p>x</p>')).toBe(false)
    expect(isRichTextEmpty('plain')).toBe(false)
  })
})
