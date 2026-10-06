import { emptyResume } from '../../../../src/lib/defaults.js'

// TODO(T7–T11): replace this stub with the real rule-based extractor. For now it only uses the first
// line of the document as the name, so the whole import flow can be exercised end to end.
/** @type {import('../../types.js').Extractor} */
export default {
  name: 'rules',
  async extract(doc) {
    const data = emptyResume()
    data.personal.fullName = doc.lines[0]?.text ?? ''
    return {
      data,
      warnings: [
        {
          code: 'STUB_EXTRACTOR',
          message:
            'Automatic import is still being built, so only a placeholder was created. Please fill in your details.',
        },
      ],
      extractor: 'rules',
    }
  },
}
