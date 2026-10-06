// Supabase Edge Function: AI writing help for the resume editor.
//
// Deploy:   supabase functions deploy ai-assist
// Secret:   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Supabase verifies the caller's JWT before this code runs (verify_jwt is on by
// default), so only signed-in users can spend your API credits.

import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_INPUT_CHARS = 8000

const SYSTEM_PROMPT = `You help people write their resumes. You rewrite or draft resume text that is clear, specific and honest.

Style rules:
- Lead with strong action verbs and concrete results; keep numbers the user gave you, and never invent facts, numbers, employers or skills.
- Be concise: no filler, no buzzwords, no first-person pronouns in bullet points.
- Reply with the resume text only: no preamble, no explanations, no surrounding quotes, no markdown headings.
- Bullet points start with "- ". Use **double asterisks** only for the one or two most important figures, if any.
- Write in the same language as the user's text.`

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function buildPrompt(mode: string, text: string, context: unknown): string | null {
  const ctx = JSON.stringify(context ?? {}).slice(0, MAX_INPUT_CHARS)
  if (mode === 'improve') {
    if (!text?.trim()) return null
    return `Rewrite this resume text as 2-5 concise bullet points (or, if it is a profile summary, as 2-3 tight sentences without bullets). Context about the entry: ${ctx}

Text to improve:
${text.slice(0, MAX_INPUT_CHARS)}`
  }
  if (mode === 'summary') {
    return `Write a 2-3 sentence professional profile summary for the top of this resume, based only on the resume data below. No bullet points.

Resume data (JSON):
${ctx}`
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'AI is not configured: set the ANTHROPIC_API_KEY secret.' }, 500)

  let body: { mode?: string; text?: string; context?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const prompt = buildPrompt(body.mode ?? '', body.text ?? '', body.context)
  if (!prompt) return json({ error: 'Nothing to work with – add some text first.' }, 400)

  const client = new Anthropic({ apiKey })
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      // Short rewriting task: low effort keeps it fast and cheap.
      output_config: { effort: 'low' },
      // If a request is declined by a safety classifier, retry on a fallback model automatically.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    if (response.stop_reason === 'refusal') {
      return json({ error: 'The AI could not help with this text. Try rephrasing it.' }, 422)
    }

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()
    return json({ text })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: 'The AI is busy right now. Please try again in a minute.' }, 429)
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return json({ error: 'AI is misconfigured: the Anthropic API key was rejected.' }, 500)
    }
    if (error instanceof Anthropic.APIError) {
      return json({ error: `AI request failed (${error.status}).` }, 502)
    }
    return json({ error: 'AI request failed.' }, 502)
  }
})
