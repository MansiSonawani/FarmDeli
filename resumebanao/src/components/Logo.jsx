import LogoMark from './LogoMark'

// Mark + wordmark. "resume" in the sans, "banao" (Hindi: "make") in the serif italic.
export default function Logo({ className = '', inverted = false }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark inverted={inverted} />
      <span
        className={`text-[17px] leading-none font-medium tracking-[-0.02em] ${inverted ? 'text-paper' : 'text-ink'}`}
      >
        resume<span className="font-serif text-[19px] font-normal tracking-normal italic">banao</span>
      </span>
    </span>
  )
}
