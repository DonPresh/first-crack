/** Coffee-cup ring stain: darker at the dried edge, a second faint ring where the cup was set down twice, a few drips. */
export function Stain({
  className,
  seed = 3,
  color = '#5b2a14',
}: {
  className?: string
  seed?: number
  color?: string
}) {
  const id = `stain-${seed}`
  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden>
      <defs>
        <filter id={`${id}-f`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale="26" />
        </filter>
        <radialGradient id={`${id}-g`}>
          <stop offset="0.7" stopColor={color} stopOpacity="0.04" />
          <stop offset="0.88" stopColor={color} stopOpacity="0.14" />
          <stop offset="0.95" stopColor={color} stopOpacity="0.5" />
          <stop offset="0.975" stopColor={color} stopOpacity="0.75" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g filter={`url(#${id}-f)`}>
        <circle cx="200" cy="200" r="150" fill={`url(#${id}-g)`} />
        <circle
          cx="228"
          cy="218"
          r="148"
          fill="none"
          stroke={color}
          strokeOpacity="0.28"
          strokeWidth="3"
          strokeDasharray="420 180 160 300"
        />
        <ellipse cx="60" cy="300" rx="9" ry="7" fill={color} fillOpacity="0.35" />
        <circle cx="42" cy="318" r="4" fill={color} fillOpacity="0.3" />
        <circle cx="355" cy="95" r="3" fill={color} fillOpacity="0.3" />
      </g>
    </svg>
  )
}
