// AI writing help for the resume editor (the "Improve with AI" and "Write with AI" buttons).
import Anthropic from '@anthropic-ai/sdk'

const MAX_INPUT_CHARS = 8000

const SYSTEM_PROMPT = `You help people write their resumes. You rewrite or draft resume text that is clear, specific and honest.

Style rules:
- Lead with strong action verbs and concrete results; keep numbers the user gave you, and never invent facts, numbers, employers or skills.
- Be concise: no filler, no buzzwords, no first-person pronouns in bullet points.
- Reply with the resume text only: no preamble, no explanations, no surrounding quotes, no markdown headings.
- Bullet points start with "- ". Use **double asterisks** only for the one or two most important figures, if any.
- Write in the same language as the user's text.`

export function buildPrompt(mode, text, context) {
  const ctx = JSON.stringify(context ?? {}).slice(0, MAX_INPUT_CHARS)
  if (mode === 'improve') {
    if (typeof text !== 'string' || !text.trim()) return null
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

// Returns { status, body } so the HTTP layer stays thin.
export async function runAi({ apiKey, mode, text, context }) {
  if (!apiKey) return { status: 503, body: { error: 'AI is not configured: set the ANTHROPIC_API_KEY variable.' } }

  const prompt = buildPrompt(mode, text, context)
  if (!prompt) return { status: 400, body: { error: 'Nothing to work with – add some text first.' } }

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
      return { status: 422, body: { error: 'The AI could not help with this text. Try rephrasing it.' } }
    }

    const output = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()
    return { status: 200, body: { text: output } }
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return { status: 429, body: { error: 'The AI is busy right now. Please try again in a minute.' } }
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: 500, body: { error: 'AI is misconfigured: the Anthropic API key was rejected.' } }
    }
    if (error instanceof Anthropic.APIError) {
      return { status: 502, body: { error: `AI request failed (${error.status}).` } }
    }
    return { status: 502, body: { error: 'AI request failed.' } }
  }
}
