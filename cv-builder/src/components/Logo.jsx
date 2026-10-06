export default function Logo({ className = '', inverted = false }) {
  const ink = inverted ? '#f5f3ef' : '#121211'
  const paper = inverted ? '#121211' : '#f5f3ef'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill={ink} />
        <path d="M11 9.5h7.5l3.5 3.5v9.5H11z" fill={paper} />
        <circle cx="21.5" cy="21.5" r="3.5" fill="#ff5a1f" />
      </svg>
      <span className={`text-[17px] font-medium tracking-tight ${inverted ? 'text-paper' : 'text-ink'}`}>
        CV <span className="font-serif text-[19px] italic">Builder</span>
      </span>
    </span>
  )
}
