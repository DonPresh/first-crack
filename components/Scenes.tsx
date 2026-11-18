'use client'
import { useEffect, useRef, useState } from 'react'
import { journey } from '@/lib/journey'
import * as sfx from '@/lib/sound'

/* Light HTML/SVG overlays for the journey. The exhibits themselves are 3D (Exhibits3D). */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ss = (v: number, a: number, b: number) => {
  const x = clamp((v - a) / (b - a))
  return x * x * (3 - 2 * x)
}

/* 01 */
export function CherryScene({ t }: { t: number }) {
  return (
    <svg viewBox="0 0 500 500" className="scene">
      <g className="mono-svg" opacity={ss(t, 0.7, 1)}>
        <text x="250" y="70" textAnchor="middle">TWO SEEDS · FLAT SIDES TOUCHING</text>
      </g>
      <text x="250" y="492" textAnchor="middle" className="mono-svg" opacity={0.6}>
        TAP TO OPEN · DRAG TO TURN IT
      </text>
    </svg>
  )
}

/* 02 */
export function PickScene({ t }: { t: number }) {
  const [n, setN] = useState(() => journey.picked.length)
  const [nope, setNope] = useState(false)
  useEffect(() => {
    const a = (e: Event) => setN((e as CustomEvent).detail)
    let tm = 0
    const b = () => {
      setNope(true)
      clearTimeout(tm)
      tm = window.setTimeout(() => setNope(false), 1100)
    }
    addEventListener('fc-picked', a)
    addEventListener('fc-nope', b)
    return () => {
      removeEventListener('fc-picked', a)
      removeEventListener('fc-nope', b)
    }
  }, [])
  return (
    <svg viewBox="0 0 500 500" className="scene" style={{ opacity: ss(t, 0, 0.4) }}>
      <text x="250" y="492" textAnchor="middle" className="mono-svg">
        {nope ? 'NOT YET · GIVE IT ANOTHER WEEK' : n >= 5 ? 'EVERY RIPE CHERRY PICKED ✓' : `TAP THE RED ONES · ${n} / 5`}
      </text>
    </svg>
  )
}

/* 03 */
const LAYERS = ['SKIN', 'FRUIT PULP', 'MUCILAGE · THE STICKY SWEET BIT', 'PARCHMENT', 'SILVERSKIN']
export function ProcessScene({ t }: { t: number }) {
  const [peeled, setPeeled] = useState(() => journey.peeled)
  useEffect(() => {
    const a = (e: Event) => setPeeled((e as CustomEvent).detail)
    addEventListener('fc-peel', a)
    return () => removeEventListener('fc-peel', a)
  }, [])
  const current = LAYERS.findIndex((_, k) => ss(t, 0.12 + k * 0.13, 0.28 + k * 0.13) < 0.5 && k >= peeled)
  return (
    <svg viewBox="0 0 500 500" className="scene">
      <text x="250" y="492" textAnchor="middle" className="mono-svg">
        {current === -1 ? 'THE SEED · TAP TO DRESS IT AGAIN' : `TAP TO PEEL · ${LAYERS[current]}`}
      </text>
    </svg>
  )
}

/* 04 */
export function DryScene({ t }: { t: number }) {
  const day = 1 + Math.round(t * 23)
  const moist = Math.round(60 - t * 49)
  const a = Math.PI * (1 - t)
  return (
    <svg viewBox="0 0 500 500" className="scene">
      <path d="M50 170 A200 130 0 0 1 450 170" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 8" fill="none" strokeWidth="2" />
      <g transform={`translate(${250 + Math.cos(a) * 200} ${170 - Math.sin(a) * 130})`}>
        <circle r="24" fill="#fff6d2" />
        <circle r="40" fill="#fff6d2" opacity="0.3" className="sun-glow" />
      </g>
      <g className="mono-svg">
        <text x="30" y="40">DAY {String(day).padStart(2, '0')}</text>
        <text x="470" y="40" textAnchor="end">MOISTURE {moist}%</text>
        <text x="250" y="492" textAnchor="middle" opacity="0.6">DRAG ACROSS THE BED TO TURN THEM</text>
      </g>
    </svg>
  )
}

/* 05 · THE ROAST: heat, steam, then the pop. The 3D bean sits in the middle of this. */
export function RoastScene({ t }: { t: number }) {
  const temp = Math.round(20 + t * 190)
  const cracked = temp >= 196
  const [burst, setBurst] = useState(0)
  const was = useRef(false)
  useEffect(() => {
    if (cracked && !was.current) {
      setBurst((b) => b + 1)
      sfx.crackBurst()
    }
    was.current = cracked
  }, [cracked])
  const [poked, setPoked] = useState(0)
  useEffect(() => {
    const a = () => setPoked((n) => n + 1)
    addEventListener('fc-poke', a)
    return () => removeEventListener('fc-poke', a)
  }, [])
  const phase = temp < 150 ? 'DRYING · GREEN TO YELLOW' : temp < 196 ? 'BROWNING · SUGARS CARAMELISE' : 'FIRST CRACK'
  const steam = ss(t, 0.15, 0.75)
  return (
    <svg viewBox="0 0 500 500" className="scene scene--roast">
      {/* thermometer */}
      <g transform="translate(40 80)">
        <rect x="0" y="0" width="16" height="320" rx="8" fill="rgba(255,255,255,0.15)" />
        <rect x="0" y={320 - t * 320} width="16" height={t * 320} rx="8" fill={cracked ? '#BCDDC4' : '#ff8a5c'} />
        <line x1="-6" x2="22" y1={320 - ((196 - 20) / 190) * 320} y2={320 - ((196 - 20) / 190) * 320} stroke="#BCDDC4" strokeWidth="2" />
        <text x="30" y={325 - ((196 - 20) / 190) * 320} className="mono-svg">196°</text>
        <text x="-4" y="350" className="mono-svg big-svg">{temp}°C</text>
      </g>
      <text x="250" y="470" textAnchor="middle" className="mono-svg">
        {phase}
      </text>
      <text x="250" y="492" textAnchor="middle" className="mono-svg" opacity={0.6}>
        TAP THE BEAN TO SHAKE THE DRUM
      </text>
      {(cracked || poked > 0) && (
        <g key={`${burst}-${poked}`} className="crack-burst">
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2
            return (
              <ellipse
                key={i}
                className="chaff"
                cx={300 + Math.cos(a) * 30}
                cy={250 + Math.sin(a) * 30}
                rx="6"
                ry="3"
                fill="#d9b98a"
                style={{ ['--dx' as string]: `${Math.cos(a) * 140}px`, ['--dy' as string]: `${Math.sin(a) * 140}px` }}
              />
            )
          })}
        </g>
      )}
    </svg>
  )
}

/* 06 */
export function CupScene({ t }: { t: number }) {
  const steam = ss(t, 0.75, 0.95)
  return (
    <svg viewBox="0 0 500 500" className="scene">
      <g className="mono-svg" style={{ opacity: ss(t, 0.8, 1) }}>
        <text x="250" y="470" textAnchor="middle">≈70 BEANS IN ONE CUP · ≈1 LB OF COFFEE PER TREE A YEAR</text>
      </g>
      <g className="mono-svg" style={{ opacity: 0.6 }}>
        <text x="250" y="492" textAnchor="middle">TAP THE MUG TO DROP A BEAN · DRAG TO TURN IT</text>
      </g>
    </svg>
  )
}
