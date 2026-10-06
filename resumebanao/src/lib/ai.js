import { api, isLocalMode } from './api'

export const aiAvailable = !isLocalMode

// Calls POST /api/ai (server/ai.js).
//   mode: 'improve'  – rewrite a description as strong, concise bullet points
//         'summary'  – write a profile summary from the rest of the resume
export async function aiAssist({ mode, text, context }) {
  // Never send the photo (a large data URL) to the model.
  const safeContext = context?.personal ? { ...context, personal: { ...context.personal, photo: undefined } } : context
  const data = await api('/ai', { method: 'POST', body: { mode, text, context: safeContext } })
  return data.text
}
