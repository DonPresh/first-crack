'use client'
import * as sfx from '@/lib/sound'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { goto } from '@/lib/goto'
import { DRINKS, LAYER_COLOR, MUGS, ORIGINS, type Drink, type LayerKind } from '@/lib/brew'
import { BeanBag, Glass, Machine, Mug, type MachineAnim } from './Machine'

type Stage = 'menu' | 'load' | 'grind' | 'tamp' | 'water' | 'pull' | 'steam' | 'mug'

const STEP_NAME: Record<string, string> = {
  load: 'LOAD BEANS',
  grind: 'GRIND',
  tamp: 'TAMP',
  water: 'HOT WATER',
  pull: 'PULL THE SHOT',
  steam: 'STEAM MILK',
  mug: 'POUR INTO A MUG',
}

const hasMilk = (d: Drink) => d.steps.some((s) => s.key === 'steam')
const doseOf = (d: Drink) => (d.id === 'espresso' || d.id === 'macchiato' ? 9 : 18)
const seqFor = (d: Drink): Stage[] => [
  'load',
  'grind',
  'tamp',
  ...(d.id === 'americano' ? (['water'] as Stage[]) : []),
  'pull',
  ...(hasMilk(d) ? (['steam'] as Stage[]) : []),
  'mug',
]

const fresh = () => ({ poured: {} as Record<string, number>, ground: 0, tamp: 0, water: 0, shot: 0, temp: 5 })

function pullVerdict(t: number) {
  if (t < 20) return 'Fast and thin. Under-extracted, so it’ll taste sour. Grind finer next time.'
  if (t < 24) return 'A touch quick. Bright, but it works.'
  if (t <= 32) return 'Right in the window. Sweet, syrupy, balanced. Barista behaviour.'
  if (t <= 38) return 'A little long. It’s heading towards bitter.'
  return 'Over-extracted. Bitter and dry. Let go a little sooner.'
}
function steamVerdict(c: number) {
  if (c < 50) return 'Too cool. The milk hasn’t turned sweet yet.'
  if (c < 55) return 'Warm, almost there.'
  if (c <= 65) return 'Perfect. Glossy, sweet milk.'
  if (c <= 70) return 'Hot, just past its sweetest.'
  return 'Scalded. The sweetness is gone. Ease off sooner.'
}

export function BrewBar({
  picks,
  onEnjoy,
}: {
  picks: string[]
  onEnjoy: (drink: string, mugColor: string) => void
}) {
  const root = useRef<HTMLElement>(null)
  const dialRef = useRef<HTMLDivElement>(null)
  const machineRef = useRef<SVGSVGElement>(null)
  const sim = useRef(fresh())
  const [, setFrame] = useState(0)
  const rerender = () => setFrame((n) => n + 1)

  const [stage, setStage] = useState<Stage>('menu')
  const [drink, setDrink] = useState<Drink | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [holding, setHolding] = useState(false)
  const [touch, setTouch] = useState(false)
  useEffect(() => setTouch(matchMedia('(pointer: coarse)').matches), [])
  const [docked, setDocked] = useState<string | null>(null)
  const [dockAt, setDockAt] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const [locked, setLocked] = useState(false)
  const [verdict, setVerdict] = useState<string | null>(null)
  const [done, setDone] = useState(false) // current step finished
  const [mug, setMug] = useState(MUGS[0])
  const [logo, setLogo] = useState(true)
  const [enjoyed, setEnjoyed] = useState(false)


  const dose = drink ? doseOf(drink) : 18
  const out = dose * 2
  const s = sim.current
  const total = Object.values(s.poured).reduce((a, b) => a + b, 0)
  const seq = drink ? seqFor(drink) : []
  const seqIdx = seq.indexOf(stage)

  const next = useCallback(() => {
    if (!drink) return
    const sq = seqFor(drink)
    const i = sq.indexOf(stage)
    setStage(sq[Math.min(sq.length - 1, i + 1)])
    setVerdict(null)
    setDone(false)
    setHolding(false)
  }, [drink, stage])

  // ---------- the hold loop ----------
  const stageRef = useRef(stage)
  stageRef.current = stage
  const dockedRef = useRef(docked)
  dockedRef.current = docked
  useEffect(() => {
    if (!holding) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const st = sim.current
      const tot = Object.values(st.poured).reduce((a, b) => a + b, 0)
      switch (stageRef.current) {
        case 'load':
          if (dockedRef.current && tot < dose * 1.6)
            st.poured[dockedRef.current] = (st.poured[dockedRef.current] || 0) + 7 * dt
          break
        case 'grind':
          st.ground = Math.min(dose, tot, st.ground + 6 * dt)
          if (st.ground >= Math.min(dose, tot) - 0.01) {
            setHolding(false)
            setDone(true)
            setVerdict(`${st.ground.toFixed(1)}g ground, fine as table salt.`)
          }
          break
        case 'tamp':
          st.tamp = Math.min(1, st.tamp + dt / 0.9)
          if (st.tamp >= 1) {
            setHolding(false)
            setLocked(true)
            setDone(true)
            setVerdict('Level, firm, locked in.')
          }
          break
        case 'water':
          st.water = Math.min(220, st.water + 70 * dt)
          break
        case 'pull':
          st.shot = Math.min(48, st.shot + 6 * dt)
          break
        case 'steam':
          st.temp = Math.min(88, st.temp + 15 * dt)
          break
      }
      rerender()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [holding, dose])

  // sound for whatever the machine is doing while held
  useEffect(() => {
    const on = (k: Parameters<typeof sfx.loop>[0], v: boolean) => sfx.loop(k, v)
    on('rattle', holding && stage === 'load' && !!docked)
    on('grind', holding && stage === 'grind')
    on('pour', holding && stage === 'water')
    on('shot', holding && stage === 'pull')
    on('steam', holding && stage === 'steam')
    if (holding) sfx.unlock()
    return () => sfx.stopAll()
  }, [holding, stage, docked])
  useEffect(() => {
    if (stage === 'tamp' && locked) sfx.thud()
  }, [stage, locked])
  useEffect(() => {
    if (stage === 'mug') sfx.ding()
  }, [stage])

  const release = () => {
    if (!holding) return
    setHolding(false)
    const st = sim.current
    if (stage === 'pull' && st.shot > 2) {
      setVerdict(pullVerdict(st.shot))
      setDone(true)
    }
    if (stage === 'steam' && st.temp > 15) {
      setVerdict(steamVerdict(st.temp))
      setDone(true)
    }
    if (stage === 'water') {
      if (st.water >= 110) {
        setVerdict(`${Math.round(st.water)}ml of hot water in.`)
        setDone(true)
      } else setVerdict('Keep going, about 150ml.')
    }
  }

  const retry = () => {
    const st = sim.current
    if (stage === 'pull') st.shot = 0
    if (stage === 'steam') st.temp = 5
    if (stage === 'water') st.water = 0
    setVerdict(null)
    setDone(false)
    rerender()
  }

  const choose = (d: Drink) => {
    sim.current = fresh()
    setDrink(d)
    setStage('load')
    setDocked(null)
    setLocked(false)
    setVerdict(null)
    setDone(false)
  }

  const reset = () => {
    setEnjoyed(false)
    sim.current = fresh()
    setStage('menu')
    setDrink(null)
    setDocked(null)
    setLocked(false)
    setVerdict(null)
    setDone(false)
    setHolding(false)
  }

  // ---------- drag a bag onto the hopper ----------
  const dock = (id: string) => {
    const hop = machineRef.current?.querySelector('.machine__hopper')?.getBoundingClientRect()
    const dial = dialRef.current?.getBoundingClientRect()
    if (hop && dial) setDockAt({ x: hop.left + hop.width / 2 - dial.left, y: hop.top - dial.top })
    setDocked(id)
  }
  const overHopper = (x: number, y: number) => {
    const r = machineRef.current?.querySelector('.machine__hopper')?.getBoundingClientRect()
    if (!r) return false
    const pad = 60
    return x > r.left - pad && x < r.right + pad && y > r.top - pad * 1.6 && y < r.bottom + pad
  }
  const startDrag = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    setDrag({ id, x: sx, y: sy })
    const move = (ev: PointerEvent) => setDrag({ id, x: ev.clientX, y: ev.clientY })
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDrag(null)
      const moved = Math.hypot(ev.clientX - sx, ev.clientY - sy)
      if (moved < 6 || overHopper(ev.clientX, ev.clientY)) dock(id)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ---------- derived visuals ----------
  const espF = drink ? (drink.final.find(([k]) => k === 'espresso')?.[1] ?? 0.2) : 0.2
  const layers: [LayerKind, number][] = []
  if (drink) {
    if (s.water > 0) layers.push(['water', Math.min(0.55, (s.water / 150) * 0.5)])
    const finishedPull = seqIdx > seq.indexOf('pull') || (stage === 'pull' && done)
    if (drink.id === 'americano' && finishedPull) {
      layers.length = 0
      layers.push(...drink.final)
    } else if (s.shot > 0) {
      layers.push(['espresso', espF * Math.min(1.4, s.shot / 28)])
      layers.push(['crema', 0.045 * Math.min(1, s.shot / 10)])
    }
    if (stage === 'steam' && done) {
      layers.length = 0
      layers.push(...drink.final)
    }
  }

  const readout = (() => {
    if (!drink) return hover !== null ? DRINKS[hover].short : 'READY'
    switch (stage) {
      case 'load':
        return `${total.toFixed(1)} / ${dose}g`
      case 'grind':
        return `GRIND ${s.ground.toFixed(1)}g`
      case 'tamp':
        return locked ? 'LOCKED' : `TAMP ${Math.round(s.tamp * 100)}%`
      case 'water':
        return `${Math.round(s.water)}ml`
      case 'pull':
        return `${s.shot.toFixed(0)}s · ${Math.round((s.shot * out) / 28)}g`
      case 'steam':
        return `${Math.round(s.temp)}°C`
      default:
        return 'ENJOY'
    }
  })()

  const anim: MachineAnim = holding
    ? stage === 'load'
      ? null
      : (stage as MachineAnim)
    : stage === 'tamp' && locked
      ? 'tamp'
      : null
  const gauge = holding && stage === 'pull' ? 0.72 + Math.sin(performance.now() / 90) * 0.02 : holding && stage === 'steam' ? 0.35 : 0
  const hopperFill = Math.max(0, Math.min(1, (total - s.ground) / (dose * 1.6)))

  const blend = (() => {
    const parts = Object.entries(s.poured).filter(([, g]) => g > 0.2)
    if (!parts.length) return ''
    if (parts.length === 1) return ORIGINS.find((o) => o.id === parts[0][0])!.name
    return parts
      .map(([id, g]) => `${ORIGINS.find((o) => o.id === id)!.name.split(',')[0]} ${Math.round((g / total) * 100)}%`)
      .join(' · ')
  })()

  const guide = (() => {
    if (!drink) return ''
    const step = (k: string) => drink.steps.find((x) => x.key === k)?.guide ?? ''
    switch (stage) {
      case 'load':
        return `Drag a bag from your bar onto the hopper, then press and hold to pour. You need ${dose}g. Pour from two bags to make a blend.`
      case 'grind':
        return step('grind') + ' Press and hold to grind.'
      case 'tamp':
        return step('tamp') + ' Press and hold to tamp.'
      case 'water':
        return step('water') + ' Hold to pour, let go at about 150ml.'
      case 'pull':
        return step('pull') + ' Hold to pull. Let go when you think it’s right.'
      case 'steam':
        return step('steam') + ' Hold to steam, let go in the sweet spot.'
      default:
        return ''
    }
  })()

  const title = (() => {
    if (!drink) return 'What are we brewing?'
    return (
      {
        load: 'Load the beans.',
        grind: 'Grind.',
        tamp: 'Dose & tamp.',
        water: 'Hot water first.',
        pull: 'Pull the shot.',
        steam: 'Steam the milk.',
        mug: `Your ${drink.name.toLowerCase()}.`,
        menu: '',
      } as Record<Stage, string>
    )[stage]
  })()

  const holdLabel =
    stage === 'load'
      ? docked
        ? 'HOLD TO POUR'
        : 'DRAG A BAG UP'
      : stage === 'grind'
        ? 'HOLD TO GRIND'
        : stage === 'tamp'
          ? 'HOLD TO TAMP'
          : stage === 'water'
            ? 'HOLD FOR WATER'
            : stage === 'pull'
              ? 'HOLD TO PULL'
              : 'HOLD TO STEAM'

  const canNext = stage === 'load' ? total >= dose * 0.9 : done
  const topColor = drink ? LAYER_COLOR[drink.final[drink.final.length - 1][0]] : LAYER_COLOR.crema
  const dockedBag = ORIGINS.find((o) => o.id === docked)
  const dragBag = ORIGINS.find((o) => o.id === drag?.id)
  const selIdx = drink ? DRINKS.indexOf(drink) : null
  const handAngle = selIdx ?? hover

  const holdHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (stage === 'load' && !docked) return
      if (done && stage !== 'load') return
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
      setHolding(true)
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
  }

  return (
    <section ref={root} id="brew" className={'brew is-' + stage}>
      <header className="brew__head">
        <div className="mono brew__kicker">
          ROOM 03 · THE BREW BAR{drink ? ` · ${drink.name.toUpperCase()}` : ''}
        </div>
        <h2 className="title brew__title" key={title}>
          {title}
        </h2>
        <p className="serif brew__copy" key={stage + (drink?.id ?? '')}>
          {stage === 'menu'
            ? 'Turn the dial. Pick a drink from around the machine and brew it yourself, hands on, shot by shot.'
            : stage === 'mug'
              ? `${blend}. Pick a mug to pour it into.`
              : guide}
        </p>
        {drink && (
          <div className="brew__progress" aria-hidden>
            {seq.map((k, i) => (
              <span key={k} className={i < seqIdx ? 'is-done' : i === seqIdx ? 'is-now' : ''} />
            ))}
          </div>
        )}
        {drink && seq[seqIdx + 1] && (
          <div className="mono brew__next">
            STEP {seqIdx + 1} OF {seq.length} · NEXT: {STEP_NAME[seq[seqIdx + 1]]}
          </div>
        )}
      </header>

      {stage === 'mug' ? (
        <div className={'brew__mug' + (enjoyed ? ' is-enjoyed' : '')}>
          <Mug color={mug.color} ink={mug.ink} logo={logo} top={topColor} />
        </div>
      ) : (
        <div ref={dialRef} className="dial">
          <div
            className={'dial__hand' + (handAngle === null ? ' is-idle' : '')}
            style={handAngle === null ? undefined : { transform: `rotate(${(handAngle / DRINKS.length) * 360}deg)` }}
          />
          {DRINKS.map((d, i) => {
            const a = ((i / DRINKS.length) * 360 - 90) * (Math.PI / 180)
            const faded = selIdx !== null && selIdx !== i
            return (
              <button
                key={d.id}
                className={'cup' + (selIdx === i ? ' is-on' : '') + (faded ? ' is-faded' : '')}
                style={{ left: `${50 + Math.cos(a) * 43}%`, top: `${50 + Math.sin(a) * 43}%` }}
                onMouseEnter={() => !drink && setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => (drink ? undefined : choose(d))}
                disabled={!!drink && selIdx !== i}
              >
                <svg viewBox="0 0 56 64" width="44" height="50" aria-hidden>
                  <Glass layers={d.final} w={56} h={64} uid={'cup-' + d.id} />
                </svg>
                <span className="mono">{d.short}</span>
              </button>
            )
          })}

          <div className="dial__machine">
            <Machine
              ref={machineRef}
              anim={anim}
              layers={layers}
              readout={readout}
              hopper={hopperFill}
              dose={Math.min(1, s.ground / dose)}
              locked={locked}
              gauge={gauge}
            />
          </div>

          {stage === 'load' && dockedBag && (
            <div
              className={'dock' + (holding ? ' is-pouring' : '')}
              style={{ left: dockAt.x, top: dockAt.y }}
              {...holdHandlers}
            >
              <div className="dock__bag">
                <BeanBag color={dockedBag.bag} ink={dockedBag.ink} label={dockedBag.label} name={dockedBag.short} />
              </div>
              <div className="dock__stream">
                {Array.from({ length: 7 }).map((_, i) => (
                  <i key={i} style={{ animationDelay: `${i * 0.07}s`, left: `${(i % 3) * 7 - 7}px` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="brew__controls">
        {stage === 'menu' && (
          <div className="mono brew__hint">
            {hover !== null ? `${DRINKS[hover].name} · ${DRINKS[hover].note}` : (touch ? 'TAP A CUP TO BREW' : 'HOVER A CUP · CLICK TO BREW')}
          </div>
        )}

        {stage === 'load' && (
          <div className="shelf">
            {picks.length === 0 && (
              <p className="serif">
                Your bar is empty.{' '}
                <button className="link" onClick={() => goto('collection')}>
                  Pick beans in the collection ←
                </button>
              </p>
            )}
            {ORIGINS.filter((o) => picks.includes(o.id)).map((o) => (
              <div
                key={o.id}
                className={'shelf__item' + (docked === o.id ? ' is-docked' : '') + (drag?.id === o.id ? ' is-dragging' : '')}
                onPointerDown={startDrag(o.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && dock(o.id)}
                aria-label={`Use ${o.name}`}
              >
                <BeanBag color={o.bag} ink={o.ink} label={o.label} name={o.short} />
                <div className="shelf__meta">
                  <span className="serif">{o.name}</span>
                  <span className="mono">{o.notes}</span>
                  <span className="mono shelf__g">{(s.poured[o.id] || 0).toFixed(1)}g</span>
                </div>
              </div>
            ))}
            {picks.length > 0 && (
              <button className="mono shelf__swap" onClick={() => goto('collection')}>
                ← SWAP BEANS
                <br />
                IN THE COLLECTION
              </button>
            )}
          </div>
        )}

        {stage !== 'menu' && stage !== 'mug' && (
          <div className="brew__row">
            {(!done || stage === 'load') && (
              <button
                className={'hold' + (holding ? ' is-holding' : '') + (stage === 'load' && !docked ? ' is-off' : '')}
                {...holdHandlers}
              >
                <span className="hold__ring" />
                <span className="mono">{holdLabel}</span>
              </button>
            )}
            {verdict && <p className="serif brew__verdict">{verdict}</p>}
            <div className="brew__actions">
              {done && (stage === 'pull' || stage === 'steam' || stage === 'water') && (
                <button className="btn mono" onClick={retry}>
                  TRY AGAIN
                </button>
              )}
              {canNext && (
                <button className="btn btn--primary mono" onClick={next}>
                  {stage === 'load' ? `GRIND IT ↗` : 'NEXT ↗'}
                </button>
              )}
              <button className="btn btn--ghost mono" onClick={reset}>
                START OVER
              </button>
            </div>
          </div>
        )}

        {stage === 'mug' && (
          <div className="brew__row">
            <div className="brew__swatches">
              {MUGS.map((m) => (
                <button
                  key={m.id}
                  aria-label={m.id}
                  className={'swatch' + (m.id === mug.id ? ' is-on' : '')}
                  style={{ background: m.color }}
                  onClick={() => setMug(m)}
                />
              ))}
            </div>
            <label className="brew__toggle mono">
              <input type="checkbox" checked={logo} onChange={(e) => setLogo(e.target.checked)} />
              <span className="brew__switch" />
              BEAN LOGO
            </label>
            {enjoyed && (
              <p className="serif brew__verdict">
                Enjoy it. You made that {drink?.name.toLowerCase()} yourself.
              </p>
            )}
            <div className="brew__actions">
              {!enjoyed ? (
                <button
                  className="btn btn--primary mono"
                  onClick={() => {
                    setEnjoyed(true)
                    if (drink) onEnjoy(drink.name, mug.color)
                  }}
                >
                  ENJOY YOUR DRINK ☕
                </button>
              ) : (
                <button
                  className="btn btn--primary mono"
                  onClick={() => goto('booth')}
                >
                  TAKE IT TO THE PHOTOBOOTH →
                </button>
              )}
              <button className="btn mono" onClick={reset}>
                BREW ANOTHER ↗
              </button>
            </div>
          </div>
        )}
      </div>

      {drag &&
        dragBag &&
        createPortal(
          <div
            className={'drag-ghost' + (overHopper(drag.x, drag.y) ? ' is-over' : '')}
            style={{ left: drag.x, top: drag.y }}
          >
            <BeanBag color={dragBag.bag} ink={dragBag.ink} label={dragBag.label} name={dragBag.short} />
          </div>,
          document.body,
        )}
    </section>
  )
}
