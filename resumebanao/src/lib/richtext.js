import DOMPurify from 'dompurify'
import { legacyToHtml } from './richtext-html.js'

// Descriptions are stored as HTML from the rich text editor. Resumes saved before the editor
// existed use the older plain-text markup ("- " bullets, **bold**), which is converted on read.

export { legacyToHtml }

export function isHtml(text) {
  return /^\s*</.test(text || '')
}

export function toHtml(text) {
  if (!text) return ''
  return isHtml(text) ? text : legacyToHtml(text)
}

// True when there is no visible text (the editor can leave behind tags like "<p></p>").
export function isRichTextEmpty(text) {
  if (!text) return true
  return !text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

const TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a']
const ALIGN_STYLE = /^\s*text-align:\s*(left|center|right|justify)\s*;?\s*$/i

let hooksInstalled = false
function installHooks() {
  if (hooksInstalled) return
  hooksInstalled = true
  // Public resumes show one user's HTML to everyone, so only text alignment survives in `style`.
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName === 'style' && !ALIGN_STYLE.test(data.attrValue)) data.keepAttr = false
  })
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer nofollow')
    }
  })
}

// `links: false` turns links into plain text (thumbnails are rendered inside other links).
export function sanitizeRichText(text, { links = true } = {}) {
  installHooks()
  return DOMPurify.sanitize(toHtml(text), {
    ALLOWED_TAGS: links ? TAGS : TAGS.filter((tag) => tag !== 'a'),
    ALLOWED_ATTR: links ? ['href', 'style', 'target', 'rel'] : ['style'],
  })
}
