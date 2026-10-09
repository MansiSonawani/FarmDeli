import { FileUp, X } from 'lucide-react'
import { IconButton } from '../ui'

const MAX_SHOWN = 5

// Shown above the editor after an import, until dismissed.
export default function ImportBanner({ fileName, warnings = [], onDismiss }) {
  const shown = warnings.slice(0, MAX_SHOWN)
  return (
    <div role="status" className="flex flex-none items-start gap-3 border-b border-line bg-accent/5 px-4 py-3 sm:px-5">
      <FileUp className="mt-0.5 size-4 flex-none text-accent" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm text-ink-2">
        <p>
          <span className="font-medium text-ink">Imported from {fileName}.</span> Please check every section: automatic
          import can miss or misplace details.
        </p>
        {shown.length > 0 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted">
            {shown.map((warning, i) => (
              <li key={i}>{warning.message}</li>
            ))}
            {warnings.length > MAX_SHOWN && <li>and {warnings.length - MAX_SHOWN} more</li>}
          </ul>
        )}
      </div>
      <IconButton label="Dismiss" onClick={onDismiss}>
        <X className="size-4" />
      </IconButton>
    </div>
  )
}
