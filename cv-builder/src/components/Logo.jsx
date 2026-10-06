export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold text-slate-900 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#4f46e5" />
        <path d="M10 9h9l4 4v10a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z" fill="#fff" />
        <path d="M12 16h8M12 19h8M12 13h4" stroke="#4f46e5" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="text-lg tracking-tight">CV Builder</span>
    </span>
  )
}
