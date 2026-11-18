'use client'
import { useEffect, useRef, useState } from 'react'

/* Part 1 · The morning ritual: a hand-poured V60 into the museum mug, in the brew bar's lacquer and chrome. */

type Step = 'land' | 'grind' | 'bloom' | 'wait' | 'pour' | 'drawdown' | 'done'
const ORDER: Step[] = ['grind', 'bloom', 'pour', 'drawdown', 'done']
const COPY: Record<Step, { kicker: string; title: string; body: string; hold?: string }> = {
  land: { kicker: 'THE MORNING RITUAL', title: 'Your bean landed.', body: 'Right in the dripper. Let’s make the first cup of the day.' },
  grind: { kicker: '01 · GRIND', title: 'Fifteen grams.', body: 'Medium-fine, like sea salt. Grind right before you brew.', hold: 'HOLD TO GRIND' },
  bloom: { kicker: '02 · BLOOM', title: 'Let it breathe.', body: 'Pour just enough to wet the grounds, about 45g. Fresh coffee puffs up as it lets go of CO₂.', hold: 'HOLD TO POUR' },
  wait: { kicker: '02 · BLOOM', title: 'Thirty seconds.', body: 'Watch it rise and bubble. Patience is an ingredient.' },
  pour: { kicker: '03 · POUR', title: 'Slow circles.', body: 'Hold and move in small circles, centre out. Stop at 250g.', hold: 'HOLD & CIRCLE' },
  drawdown: { kicker: '04 · DRAWDOWN', title: 'Now we wait.', body: 'The water finds its way through the bed. Three minutes, give or take.' },
  done: { kicker: '05 · YOUR CUP', title: 'The first crack of the day.', body: '15g of coffee, 250g of water. 1 : 16.7. Your mug is waiting for you inside the museum.' },
}


const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function Ritual({ onEnter }: { onEnter: () => void }) {
  const [step, setStep] = useState<Step>('land')
  const [holding, setHolding] = useState(false)
  const [, force] = useState(0)
  const sim = useRef({ grind: 0, water: 0, bloomT: 0, fill: 0, clock: 0, kx: 0, circling: 0, land: 0 })
  const svg = useRef<SVGSVGElement>(null)
  const last = useRef<{ a: number; t: number } | null>(null)
  const stepRef = useRef(step)
  stepRef.current = step
  const holdRef = useRef(holding)
  holdRef.current = holding

  // the main loop: physics of the pour, timers, auto-advancing steps
  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const s = sim.current
      const st = stepRef.current
      const h = holdRef.current
      if (st === 'land') {
        s.land = Math.min(1, s.land + dt / 1.3)
        if (s.land >= 1) setStep('grind')
      }
      if (st === 'grind' && h) {
        s.grind = Math.min(1, s.grind + dt / 2)
        if (s.grind >= 1) {
          setHolding(false)
          setTimeout(() => setStep('bloom'), 400)
        }
      }
      if (st === 'bloom' && h) {
        s.water = Math.min(60, s.water + 26 * dt)
        s.clock += dt * 4
        if (s.water >= 45) {
          setHolding(false)
          setStep('wait')
        }
      }
      if (st === 'wait') {
        s.bloomT += dt
        s.clock += dt * 6
        if (s.bloomT >= 4) setStep('pour')
      }
      if (st === 'pour') {
        s.clock += dt * (h ? 4 : 2)
        if (h) s.water = Math.min(260, s.water + 32 * dt)
        s.fill = Math.min(0.45, s.fill + (h ? 0.05 : 0.03) * dt)
        s.circling = Math.max(0, s.circling - dt * 0.8)
        if (s.water >= 250) {
          setHolding(false)
          setStep('drawdown')
        }
      }
      if (st === 'drawdown') {
        s.clock = Math.min(184, s.clock + dt * 14)
        s.fill = Math.min(0.86, s.fill + dt * 0.12)
        if (s.fill >= 0.86) setStep('done')
      }
      // kettle eases back to rest when not pouring
      if (!(h && (st === 'pour' || st === 'bloom'))) s.kx += (0 - s.kx) * Math.min(1, dt * 3)
      force((n) => (n + 1) % 1e6)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const canHold = step === 'grind' || step === 'bloom' || step === 'pour'
  const down = (e: React.PointerEvent) => {
    if (!canHold) return
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    setHolding(true)
  }
  const up = () => setHolding(false)
  const move = (e: React.PointerEvent) => {
    if (step !== 'pour' || !holding || !svg.current) return
    const r = svg.current.getBoundingClientRect()
    const x = 290 + ((e.clientX - r.left) / r.width) * 620
    const y = 100 + ((e.clientY - r.top) / r.height) * 540
    sim.current.kx = Math.max(-60, Math.min(60, x - 500))
    // detect circling: angle travelled around the dripper centre
    const a = Math.atan2(y - 330, x - 500)
    if (last.current) {
      let d = a - last.current.a
      if (d > Math.PI) d -= Math.PI * 2
      if (d < -Math.PI) d += Math.PI * 2
      sim.current.circling = Math.min(1, sim.current.circling + Math.abs(d) * 0.25)
    }
    last.current = { a, t: performance.now() }
  }

  const s = sim.current
  const pouring = holding && (step === 'bloom' || step === 'pour')
  const grounds = s.grind
  const swell = step === 'wait' ? Math.sin(Math.min(1, s.bloomT / 4) * Math.PI) * 10 + 6 : step === 'pour' || step === 'drawdown' || step === 'done' ? 4 : 0
  const bedY = 352 - grounds * 26 - swell
  const wet = Math.min(1, s.water / 45)
  const waterLvl = step === 'pour' ? Math.min(1, (s.water - 45) / 120) : step === 'drawdown' ? Math.max(0, 1 - (s.fill - 0.45) / 0.4) : 0
  const drip = step === 'pour' || step === 'drawdown' || (step === 'wait' && s.bloomT > 2)
  const spoutX = 556 + s.kx
  const kettleTilt = pouring ? -24 : 0
  const beanY = 60 + s.land * 252
  const c = COPY[step]
  const idx = Math.max(0, ORDER.indexOf(step === 'wait' ? 'bloom' : step === 'land' ? 'grind' : step))
  const weight = Math.round(step === 'grind' || step === 'land' ? grounds * 15 : s.water)

  return (
    <div className={'ritual is-' + step} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerMove={move}>
      <div className="ritual__top mono">
        <span>FIRST CRACK · PART ONE · THE MORNING RITUAL</span>
        <button
          className="ritual__skip mono"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onEnter()
          }}
        >
          SKIP TO THE MUSEUM →
        </button>
      </div>

      <svg ref={svg} className="ritual__art" viewBox="290 100 620 540" aria-label="Pour-over coffee">
        <defs>
          <linearGradient id="r-lac" x1="0" x2="1">
            <stop offset="0" stopColor="#4d1220" />
            <stop offset="0.2" stopColor="#80283a" />
            <stop offset="0.55" stopColor="#6E1F2F" />
            <stop offset="1" stopColor="#3b0d18" />
          </linearGradient>
          <linearGradient id="r-chrome" x1="0" x2="1">
            <stop offset="0" stopColor="#8f8a84" />
            <stop offset="0.25" stopColor="#f4f1ec" />
            <stop offset="0.5" stopColor="#b9b3ab" />
            <stop offset="0.75" stopColor="#eeeae4" />
            <stop offset="1" stopColor="#7f7a74" />
          </linearGradient>
          <linearGradient id="r-chromeV" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f6f3ee" />
            <stop offset="0.55" stopColor="#b5afa7" />
            <stop offset="1" stopColor="#8a857f" />
          </linearGradient>
          <radialGradient id="r-coffee" cx="0.4" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#6b3a1f" />
            <stop offset="0.7" stopColor="#3a1b0e" />
            <stop offset="1" stopColor="#b37a45" />
          </radialGradient>
          <radialGradient id="r-shadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#2A0A12" stopOpacity="0.35" />
            <stop offset="1" stopColor="#2A0A12" stopOpacity="0" />
          </radialGradient>
          <clipPath id="mug-mouth">
            <ellipse cx="500" cy="440" rx="96" ry="19" />
          </clipPath>
          <clipPath id="cone-open">
            <ellipse cx="500" cy="306" rx="102" ry="12" />
          </clipPath>
          <clipPath id="bean-in">
            <rect x="290" y="0" width="620" height="306" />
            <ellipse cx="500" cy="306" rx="102" ry="12" />
          </clipPath>
        </defs>

        {/* floor shadow */}
        <ellipse cx="500" cy="632" rx="280" ry="14" fill="url(#r-shadow)" />

        {/* scale, styled like the machine's drip tray */}
        <rect x="350" y="602" width="300" height="24" rx="7" fill="url(#r-chrome)" />
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x={366 + i * 23} y="607" width="12" height="6" rx="2" fill="rgba(0,0,0,0.2)" />
        ))}

        {/* the museum mug */}
        <path d="M604 470 q60 0 60 52 q0 50 -66 52" stroke="#5a1726" strokeWidth="20" fill="none" strokeLinecap="round" />
        <ellipse cx="500" cy="440" rx="104" ry="24" fill="#6E1F2F" />
        <g clipPath="url(#mug-mouth)">
          <rect x="390" y="410" width="220" height="80" fill="#1c070c" />
          <ellipse cx="500" cy={446 + (1 - s.fill) * 34} rx={96 * (0.84 + 0.16 * s.fill)} ry={19 * (0.84 + 0.16 * s.fill)} fill="url(#r-coffee)" opacity={s.fill > 0.02 ? 1 : 0} />
          {drip &&
            [0, 1, 2].map((i) => (
              <circle key={i} className="ritual__drip" cx="500" cy="420" r="3.2" fill="#4a2414" style={{ animationDelay: `${i * 0.33}s` }} />
            ))}
        </g>
        <path d="M396 440 A104 24 0 0 0 604 440 L598 560 Q592 600 552 600 H448 Q408 600 402 560 Z" fill="url(#r-lac)" />
        <path d="M396 440 A104 24 0 0 0 604 440" fill="none" stroke="#8a2c3f" strokeWidth="5" />
        <g transform="translate(500 522)">
          <circle r="28" fill="none" stroke="#BCDDC4" strokeWidth="5" />
          <g transform="rotate(-28)">
            <ellipse rx="11.5" ry="17" fill="#BCDDC4" />
            <path d="M0 -14 C-5 -4 5 4 0 14" stroke="#6E1F2F" strokeWidth="3" fill="none" />
          </g>
        </g>
        <rect x="414" y="470" width="9" height="90" rx="4.5" fill="rgba(255,255,255,0.12)" />

        {/* steam once it's done */}
        {(step === 'done' || step === 'drawdown') &&
          [0, 1, 2].map((i) => (
            <path
              key={i}
              className="wisp"
              style={{ animationDelay: `${i * 0.5}s` }}
              d={`M${468 + i * 32} ${step === 'done' ? 410 : 300} q-12 -24 0 -48 q12 -24 0 -48`}
              stroke="rgba(42,10,18,0.3)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          ))}

        {/* the dripper: a chrome cone on a lacquered collar; lifts away when done */}
        <g className={'ritual__dripper' + (step === 'done' ? ' is-off' : '')}>
          <path d="M392 306 L608 306 L524 404 L476 404 Z" fill="url(#r-chrome)" />
          {[-60, -30, 0, 30, 60].map((d) => (
            <path key={d} d={`M${500 + d * 1.5} 312 L${500 + d * 0.3} 398`} stroke="rgba(0,0,0,0.12)" strokeWidth="2" />
          ))}
          <ellipse cx="500" cy="306" rx="110" ry="16" fill="url(#r-chromeV)" />
          <ellipse cx="500" cy="306" rx="102" ry="12" fill="#3a2a22" />
          <rect x="436" y="402" width="128" height="14" rx="6" fill="url(#r-lac)" />
          <path d="M606 318 Q648 320 644 346 Q640 368 592 366" stroke="#1c0f0a" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* what you see through the opening: empty, then grounds, then a pool of water */}
          <g clipPath="url(#cone-open)">
            <ellipse cx="500" cy="306" rx="102" ry="12" fill={grounds > 0.05 ? (wet > 0.1 ? '#3b1d0f' : '#6a4026') : '#3a2a22'} />
            {grounds > 0.05 && wet < 0.1 &&
              Array.from({ length: 14 }).map((_, i) => (
                <circle key={i} cx={420 + ((i * 37) % 160)} cy={300 + ((i * 13) % 12)} r="1.6" fill="#8a5a36" />
              ))}
            {waterLvl > 0 && <ellipse cx="500" cy="306" rx={102 * Math.min(1, 0.5 + waterLvl)} ry={12 * Math.min(1, 0.5 + waterLvl)} fill="rgba(110,58,28,0.85)" />}
            {waterLvl > 0 && <ellipse cx="478" cy="303" rx="30" ry="3" fill="rgba(255,255,255,0.18)" />}
            {step === 'wait' &&
              Array.from({ length: 9 }).map((_, i) => (
                <circle
                  key={i}
                  className="ritual__bubble"
                  cx={430 + i * 17}
                  cy={302 + (i % 3) * 3}
                  r={2 + (i % 3)}
                  fill="none"
                  stroke="#d9b98a"
                  strokeWidth="1.5"
                  style={{ animationDelay: `${i * 0.21}s` }}
                />
              ))}
          </g>
          {/* the bloom: the wet bed domes up above the rim */}
          {swell > 0 && step === 'wait' && <ellipse cx="500" cy={306 - swell * 0.35} rx="86" ry={8 + swell * 0.5} fill="#3b1d0f" />}
        </g>

        {/* the bean landing */}
        {(step === 'land' || (step === 'grind' && grounds < 1)) && (
          <g clipPath="url(#bean-in)">
          <g transform={`translate(500 ${Math.min(312, beanY)}) rotate(${s.land * 420}) scale(${0.75 * (1 - grounds)})`} className={holding ? 'ritual__jit' : ''}>
            <ellipse rx="15" ry="21" fill="#4a2716" />
            <path d="M-2 -17 C-7 -5 5 5 -1 17" stroke="#c69a66" strokeWidth="3" fill="none" />
            <ellipse cx="-6" cy="-7" rx="4" ry="8" fill="rgba(255,255,255,0.2)" />
          </g>
          </g>
        )}

        {/* water stream */}
        {pouring && (
          <path
            className="ritual__stream"
            d={`M${spoutX + 2} 210 Q${spoutX - 6} 250 ${500 + s.kx * 0.6} 304`}
            stroke="rgba(246,239,228,0.9)"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* gooseneck kettle in the machine's lacquer and chrome */}
        <g className={'ritual__kettle' + (step === 'done' ? ' is-off' : '')} transform={`translate(${s.kx} 0) rotate(${kettleTilt} 720 190)`} style={{ transition: 'transform 0.35s cubic-bezier(.2,.8,.2,1)' }}>
          <path d="M648 222 Q600 220 590 180 Q584 152 556 196" stroke="url(#r-chromeV)" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M640 250 Q630 140 720 132 Q810 140 800 250 Z" fill="url(#r-lac)" />
          <path d="M660 236 Q656 170 700 150" stroke="rgba(255,255,255,0.18)" strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="632" y="244" width="176" height="16" rx="7" fill="url(#r-chrome)" />
          <path d="M800 170 Q862 170 854 214 Q848 242 800 238" stroke="#1c0f0a" strokeWidth="13" fill="none" />
          <ellipse cx="720" cy="134" rx="30" ry="8" fill="url(#r-chrome)" />
          <circle cx="720" cy="124" r="8" fill="url(#r-chrome)" />
        </g>

        {/* scale readout, like the machine's display */}
        <g className="ritual__readout">
          <rect x="440" y="606" width="120" height="16" rx="3" fill="#12050a" />
          <text x="450" y="618">{String(weight).padStart(3, ' ')}g</text>
          <text x="550" y="618" textAnchor="end">
            {fmt(s.clock)}
          </text>
        </g>
      </svg>

      <div className="ritual__copy" key={step}>
        <div className="mono ritual__kicker">{c.kicker}</div>
        <h1 className="title ritual__title">{c.title}</h1>
        <p className="serif ritual__body">{c.body}</p>
        {step === 'pour' && <div className="mono ritual__hint">{s.circling > 0.35 ? 'NICE, SLOW CIRCLES ✓' : 'MOVE IN CIRCLES WHILE YOU HOLD'}</div>}
      </div>

      <div className="ritual__foot">
        <div className="ritual__steps mono">
          {ORDER.map((k, i) => (
            <span key={k} className={i < idx ? 'is-done' : i === idx ? 'is-now' : ''}>
              {String(i + 1).padStart(2, '0')}
            </span>
          ))}
        </div>
        {c.hold && (
          <button className={'hold hold--ritual' + (holding ? ' is-holding' : '')} aria-label={c.hold}>
            <span className="hold__ring" />
            <span className="mono">{c.hold}</span>
          </button>
        )}
        {step === 'done' && (
          <button
            className="btn btn--primary mono ritual__enter"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onEnter()
            }}
          >
            ENTER THE MUSEUM →
          </button>
        )}
      </div>
    </div>
  )
}
