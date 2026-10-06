// Infinite horizontal ticker. The content is rendered twice and the track moves
// by -50%, so the loop is seamless. Pauses on hover; stops with reduced motion.
export default function Marquee({ items, duration = 40, className }) {
  const row = (hidden) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="px-8">{item}</span>
          <span className="text-accent" aria-hidden="true">
            ✳
          </span>
        </span>
      ))}
    </div>
  )
  return (
    <div className={`group flex overflow-hidden ${className ?? ''}`}>
      <div
        className="flex w-max animate-marquee group-hover:[animation-play-state:paused]"
        style={{ '--marquee-duration': `${duration}s` }}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
