// The resumebanao mark: a lowercase "r" finished with an accent full stop –
// the same "set in type." gesture as the brand's headlines.
export default function LogoMark({ className = 'size-7', inverted = false }) {
  const tile = inverted ? '#f5f3ef' : '#121211'
  const glyph = inverted ? '#121211' : '#f5f3ef'
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill={tile} />
      <path
        d="M11.25 23.5V15.25a5.75 5.75 0 0 1 5.75-5.75h1.75"
        fill="none"
        stroke={glyph}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="21.75" cy="21.75" r="2.6" fill="#ff5a1f" />
    </svg>
  )
}
