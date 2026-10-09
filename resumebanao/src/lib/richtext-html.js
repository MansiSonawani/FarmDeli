import { parseRichText } from './format.js'

// Converts the app's older plain-text markup ("- " bullets, **bold**) to the HTML the rich text editor
// stores. Kept free of browser-only code so the server (resume import) can use it too; note the explicit
// ".js" extension, which plain Node needs and Vite does not.

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function legacyToHtml(text) {
  const spans = (list) =>
    list.map((s) => (s.bold ? `<strong>${escapeHtml(s.text)}</strong>` : escapeHtml(s.text))).join('')
  return parseRichText(text)
    .map((block) =>
      block.type === 'ul'
        ? `<ul>${block.items.map((item) => `<li><p>${spans(item)}</p></li>`).join('')}</ul>`
        : `<p>${spans(block.spans)}</p>`,
    )
    .join('')
}
