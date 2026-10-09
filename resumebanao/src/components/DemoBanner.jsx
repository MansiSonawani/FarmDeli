import { isLocalMode } from '../lib/api'

export default function DemoBanner({ what = 'Your data is' }) {
  if (!isLocalMode) return null
  return (
    <div className="mx-auto mt-4 max-w-7xl px-5 sm:px-8">
      <p className="rounded-2xl border border-line bg-white/60 px-4 py-3 text-sm text-ink-2">
        <span className="mr-2 inline-block size-1.5 -translate-y-0.5 rounded-full bg-accent" aria-hidden="true" />
        Demo mode — {what} saved in this browser. The deployed app has accounts and cloud sync.
      </p>
    </div>
  )
}
