'use client'
import { forwardRef } from 'react'
import { LAYER_COLOR, type LayerKind } from '@/lib/brew'

const DEEP = '#2A0A12'
const MINT = '#BCDDC4'

/** Layered glass: layers stack from the bottom, fractions of the glass height. */
export function Glass({
  layers,
  x = 0,
  y = 0,
  w = 56,
  h = 64,
  uid = 'g',
}: {
  layers: [LayerKind, number][]
  x?: number
  y?: number
  w?: number
  h?: number
  uid?: string
}) {
  let acc = 0
  const shape = `M0 0 H${w} L${w - 5} ${h - 6} Q${w - 6} ${h} ${w - 12} ${h} H12 Q6 ${h} 5 ${h - 6} Z`
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <clipPath id={uid}>
          <path d={shape} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid})`}>
        <rect width={w} height={h} fill="rgba(255,255,255,0.2)" />
        {layers.map(([k, f], i) => {
          const lh = Math.max(0, f) * h
          acc += lh
          return <rect key={i} x={0} width={w} y={h - acc} height={lh + 0.5} fill={LAYER_COLOR[k]} />
        })}
      </g>
      <path d={shape} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
      <rect x={6} y={6} width={4} height={h - 22} rx={2} fill="rgba(255,255,255,0.5)" />
    </g>
  )
}

export type MachineAnim = 'grind' | 'tamp' | 'pull' | 'water' | 'steam' | null

type Props = {
  anim: MachineAnim
  layers: [LayerKind, number][]
  readout: string
  hopper: number // 0..1 beans in hopper
  dose: number // 0..1 grounds in the dosing cup
  locked: boolean // portafilter locked in
  gauge: number // 0..1 pressure
}

/** A stylised but detailed espresso machine with built-in grinder. */
export const Machine = forwardRef<SVGSVGElement, Props>(function Machine(
  { anim, layers, readout, hopper, dose, locked, gauge },
  ref,
) {
  const beanSlots = 30
  const shown = Math.round(hopper * beanSlots)
  return (
    <svg ref={ref} className={`machine ${anim ? 'is-' + anim : ''}`} viewBox="0 0 320 390" aria-label="Espresso machine">
      <defs>
        <linearGradient id="m-lacquer" x1="0" x2="1">
          <stop offset="0" stopColor="#4d1220" />
          <stop offset="0.18" stopColor="#7c2537" />
          <stop offset="0.5" stopColor="#6E1F2F" />
          <stop offset="0.86" stopColor="#5a1726" />
          <stop offset="1" stopColor="#3b0d18" />
        </linearGradient>
        <linearGradient id="m-chrome" x1="0" x2="1">
          <stop offset="0" stopColor="#8f8a84" />
          <stop offset="0.25" stopColor="#f4f1ec" />
          <stop offset="0.5" stopColor="#b9b3ab" />
          <stop offset="0.75" stopColor="#eeeae4" />
          <stop offset="1" stopColor="#7f7a74" />
        </linearGradient>
        <linearGradient id="m-chromeV" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f6f3ee" />
          <stop offset="0.55" stopColor="#b5afa7" />
          <stop offset="1" stopColor="#8a857f" />
        </linearGradient>
        <linearGradient id="m-glass" x1="0" x2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="0.35" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.35)" />
        </linearGradient>
        <radialGradient id="m-bay" cx="0.5" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#3a0f19" />
          <stop offset="1" stopColor="#17050a" />
        </radialGradient>
        <clipPath id="m-hopperClip">
          <path d="M214 20 H286 L272 78 H228 Z" />
        </clipPath>
      </defs>

      {/* floor shadow */}
      <ellipse cx="160" cy="378" rx="150" ry="9" fill="rgba(42,10,18,0.28)" />

      {/* ---------- grinder hopper ---------- */}
      <g className="machine__hopper">
        <g clipPath="url(#m-hopperClip)">
          <rect x="214" y="20" width="72" height="58" fill="rgba(246,239,228,0.18)" />
          {Array.from({ length: shown }).map((_, i) => {
            const row = Math.floor(i / 6)
            const col = i % 6
            const cx = 230 + col * 8 + (row % 2) * 4
            const cy = 73 - row * 7
            return (
              <g key={i} transform={`translate(${cx} ${cy}) rotate(${(i * 53) % 180})`}>
                <ellipse rx="4.6" ry="3.3" fill={i % 3 ? '#4a2716' : '#3b1d0f'} />
                <path d="M-3.4 0 Q0 1 3.4 0" stroke="#b98a57" strokeWidth="0.9" fill="none" />
              </g>
            )
          })}
        </g>
        <path d="M214 20 H286 L272 78 H228 Z" fill="url(#m-glass)" stroke="rgba(42,10,18,0.55)" strokeWidth="2" />
        <rect x="210" y="12" width="80" height="10" rx="4" fill={DEEP} />
        <rect x="224" y="78" width="52" height="14" rx="3" fill="url(#m-chrome)" />
      </g>

      {/* ---------- body ---------- */}
      <rect x="30" y="92" width="260" height="270" rx="24" fill="url(#m-lacquer)" />
      {/* cup warmer rail */}
      <rect x="40" y="84" width="150" height="9" rx="4.5" fill="url(#m-chrome)" />
      {/* front panel inset */}
      <rect x="44" y="104" width="232" height="70" rx="14" fill="rgba(0,0,0,0.14)" />

      {/* pressure gauge */}
      <g transform="translate(86 139)">
        <circle r="25" fill="url(#m-chrome)" />
        <circle r="20" fill="#f6efe4" />
        {Array.from({ length: 13 }).map((_, i) => {
          const a = (-135 + i * 22.5) * (Math.PI / 180)
          return (
            <line
              key={i}
              x1={Math.sin(a) * 15}
              y1={-Math.cos(a) * 15}
              x2={Math.sin(a) * (i % 3 === 0 ? 11 : 13)}
              y2={-Math.cos(a) * (i % 3 === 0 ? 11 : 13)}
              stroke={i >= 6 && i <= 9 ? '#6E1F2F' : DEEP}
              strokeWidth={i % 3 === 0 ? 1.6 : 1}
            />
          )
        })}
        <path d="M-12 8 A15 15 0 0 1 -6 -13" stroke={MINT} strokeWidth="0" fill="none" />
        <line
          className="machine__needle"
          x1="0"
          y1="0"
          x2="0"
          y2="-15"
          stroke="#6E1F2F"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{ transform: `rotate(${-135 + gauge * 200}deg)` }}
        />
        <circle r="2.4" fill={DEEP} />
        <text y="12" textAnchor="middle" fontSize="5" fontFamily="monospace" fill={DEEP}>
          BAR
        </text>
      </g>

      {/* display */}
      <rect x="124" y="120" width="86" height="38" rx="7" fill="#12050a" />
      <rect x="124" y="120" width="86" height="38" rx="7" fill="none" stroke="rgba(255,255,255,0.08)" />
      <text x="167" y="144" textAnchor="middle" className="machine__readout" fill={MINT}>
        {readout}
      </text>

      {/* buttons */}
      {[232, 256].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="139" r="10" fill="url(#m-chrome)" />
          <circle cx={x} cy="139" r="6.5" fill={DEEP} />
          <circle
            cx={x}
            cy="139"
            r="2.4"
            className={'machine__led' + (i === 0 ? ' led--a' : ' led--b')}
            fill={MINT}
          />
        </g>
      ))}

      {/* group head */}
      <rect x="128" y="182" width="64" height="16" rx="4" fill="url(#m-chrome)" />
      <path d="M134 198 H186 L180 210 H140 Z" fill="url(#m-chromeV)" />
      <circle cx="136" cy="190" r="2" fill="#8a857f" />
      <circle cx="184" cy="190" r="2" fill="#8a857f" />

      {/* portafilter */}
      <g className={'machine__portafilter' + (locked ? ' is-locked' : '')}>
        <path d="M136 210 H184 L178 224 H142 Z" fill="url(#m-chrome)" />
        <rect x="180" y="212" width="20" height="8" rx="3" fill="url(#m-chrome)" />
        <rect x="198" y="210.5" width="66" height="11" rx="5.5" fill="#1c0f0a" />
        <rect x="200" y="212" width="60" height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
        <path d="M152 224 H168 L165 232 H155 Z" fill="url(#m-chromeV)" />
      </g>

      {/* bay */}
      <rect x="96" y="236" width="128" height="104" rx="10" fill="url(#m-bay)" />

      {/* streams */}
      <rect className="machine__stream machine__stream--shot" x="156.5" y="232" width="7" height="64" rx="3.5" fill="#4a2414" />
      <rect className="machine__stream machine__stream--water" x="155" y="212" width="10" height="84" rx="5" fill="rgba(240,230,215,0.85)" />

      {/* grinder outlet + dosing cup (right) */}
      <rect x="250" y="176" width="16" height="22" rx="3" fill="url(#m-chromeV)" />
      <g className="machine__grounds">
        {Array.from({ length: 7 }).map((_, i) => (
          <circle key={i} className="machine__ground" cx={255 + (i % 3) * 3} cy={202} r="1.6" fill="#3b1d0f" style={{ animationDelay: `${i * 0.09}s` }} />
        ))}
      </g>
      <g className={'machine__dosecup' + (locked ? ' is-gone' : '')}>
        <path d="M244 228 H274 L271 250 Q270 254 266 254 H252 Q248 254 247 250 Z" fill="url(#m-chrome)" />
        <rect x="246" y={250 - dose * 20} width="26" height={dose * 20} rx="2" fill="#3b1d0f" opacity={dose > 0 ? 1 : 0} />
      </g>

      {/* steam wand + knob */}
      <circle cx="48" cy="200" r="9" fill="url(#m-chrome)" />
      <path d="M48 208 L48 262 Q48 276 36 284" stroke="url(#m-chrome)" strokeWidth="7" fill="none" strokeLinecap="round" />
      <g className="machine__steam">
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} className="machine__puff" cx="34" cy="288" r={6 + i * 2} fill="rgba(255,255,255,0.75)" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
      </g>
      <g className="machine__jug">
        <path d="M14 280 H62 L58 338 Q58 344 52 344 H24 Q18 344 18 338 Z" fill="url(#m-chrome)" />
        <path d="M62 292 Q76 296 64 314" stroke="url(#m-chrome)" strokeWidth="5" fill="none" />
        <rect x="18" y="300" width="40" height="40" rx="3" fill="rgba(239,225,204,0.55)" className="machine__milk" />
      </g>

      {/* drip tray */}
      <rect x="88" y="338" width="144" height="16" rx="5" fill="url(#m-chrome)" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={98 + i * 13} y="342" width="7" height="8" rx="2" fill="rgba(0,0,0,0.22)" />
      ))}
      {/* base + feet */}
      <rect x="30" y="352" width="260" height="14" rx="7" fill={DEEP} />
      <rect x="44" y="366" width="26" height="7" rx="3" fill="#12050a" />
      <rect x="250" y="366" width="26" height="7" rx="3" fill="#12050a" />

      {/* the glass on the tray */}
      <Glass layers={layers} x={132} y={272} w={56} h={66} uid="machine-glass" />

      {/* lacquer highlight */}
      <rect x="38" y="98" width="6" height="250" rx="3" fill="rgba(255,255,255,0.1)" />
    </svg>
  )
})

/** Retail bag for the bean shelf, in the First Crack style. */
export function BeanBag({ color, label, ink, name }: { color: string; label: string; ink: string; name: string }) {
  return (
    <svg viewBox="0 0 90 120" className="bag" aria-hidden>
      <path d="M8 18 Q8 12 14 12 H76 Q82 12 82 18 L86 108 Q86 116 78 116 H12 Q4 116 4 108 Z" fill={color} />
      <rect x="8" y="4" width="74" height="12" rx="2" fill={color} />
      <rect x="8" y="4" width="74" height="12" rx="2" fill="rgba(0,0,0,0.1)" />
      <line x1="10" y1="22" x2="80" y2="22" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
      <text x="14" y="40" fontFamily="'Familjen Grotesk', sans-serif" fontWeight="800" fontSize="13" fill={ink}>
        FIRST
      </text>
      <text x="14" y="53" fontFamily="'Familjen Grotesk', sans-serif" fontWeight="800" fontSize="13" fill={ink}>
        CRACK
      </text>
      <rect x="12" y="62" width="66" height="42" rx="2" fill={label} />
      <text x="18" y="76" fontFamily="'Familjen Grotesk', sans-serif" fontWeight="800" fontSize="10" fill="#2A0A12">
        {name.split(' · ')[0]}
      </text>
      <text x="18" y="88" fontFamily="'JetBrains Mono', monospace" fontSize="6.5" letterSpacing="0.6" fill="#2A0A12">
        {name.split(' · ')[1] ?? ''}
      </text>
      <line x1="18" y1="95" x2="72" y2="95" stroke="#2A0A12" strokeWidth="0.6" strokeDasharray="1.5 2" />
      <path d="M8 18 L10 108" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
    </svg>
  )
}

/** Side-view mug with optional First Crack bean mark and rising steam. */
export function Mug({ color, ink, logo, top }: { color: string; ink: string; logo: boolean; top: string }) {
  return (
    <svg className="mug" viewBox="0 0 240 240" aria-label="Your mug">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          className="mug__steam"
          style={{ animationDelay: `${i * 0.6}s` }}
          d={`M${88 + i * 24} 62 q-10 -16 0 -30 q10 -14 0 -28`}
          stroke="rgba(42,10,18,0.25)"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      ))}
      <path d="M170 104 q42 0 42 36 q0 36 -46 38" stroke={color} strokeWidth="18" fill="none" strokeLinecap="round" />
      <path d="M46 76 H178 V176 Q178 214 140 214 H84 Q46 214 46 176 Z" fill={color} />
      <ellipse cx="112" cy="76" rx="66" ry="14" fill={top} />
      <ellipse cx="112" cy="76" rx="66" ry="14" fill="none" stroke={color} strokeWidth="6" />
      <ellipse cx="96" cy="74" rx="16" ry="4" fill="rgba(255,255,255,0.35)" />
      {logo && (
        <g transform="translate(112 146)">
          <circle r="26" fill="none" stroke={ink} strokeWidth="5" />
          <g transform="rotate(-28)">
            <ellipse rx="11" ry="16" fill={ink} />
            <path d="M0 -13 C-5 -4 5 4 0 13" stroke={color} strokeWidth="3" fill="none" />
          </g>
        </g>
      )}
      <rect x="54" y="90" width="8" height="70" rx="4" fill="rgba(255,255,255,0.22)" />
    </svg>
  )
}
