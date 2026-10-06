import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { aiAssist, aiAvailable } from '../../lib/ai'
import { cx } from '../../lib/cx'

export default function AiButton({ mode, text, context, onResult, onError, label = 'Improve with AI' }) {
  const [busy, setBusy] = useState(false)
  const disabled = !aiAvailable || busy || (mode === 'improve' && !text?.trim())

  const run = async () => {
    setBusy(true)
    try {
      onResult(await aiAssist({ mode, text, context }))
    } catch (e) {
      onError?.(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled}
      title={aiAvailable ? undefined : 'Connect Supabase and deploy the ai-assist function to enable AI'}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition',
        disabled ? 'cursor-not-allowed text-muted' : 'text-ink hover:bg-paper-2',
      )}
    >
      <Sparkles className={cx('size-3.5', busy && 'animate-pulse')} />
      {busy ? 'Writing…' : label}
    </button>
  )
}
