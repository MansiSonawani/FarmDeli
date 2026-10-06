import { supabase, isLocalMode } from './supabase'

export const aiAvailable = !isLocalMode

// Calls the `ai-assist` Supabase Edge Function (supabase/functions/ai-assist).
//   mode: 'improve'  – rewrite a description as strong, concise bullet points
//         'summary'  – write a profile summary from the rest of the resume
export async function aiAssist({ mode, text, context }) {
  if (!supabase) throw new Error('AI features need Supabase to be configured.')
  // Never send the photo (a large data URL) to the model.
  const safeContext = context?.personal ? { ...context, personal: { ...context.personal, photo: undefined } } : context
  const { data, error } = await supabase.functions.invoke('ai-assist', {
    body: { mode, text, context: safeContext },
  })
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      // keep the generic message
    }
    throw new Error(message)
  }
  return data.text
}
