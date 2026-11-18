'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { STOPS, journey } from '@/lib/journey'
import { goto } from '@/lib/goto'
import { Stain } from './Stain'
import { JourneyStops } from './JourneyStops'
import { BrewBar } from './BrewBar'
import { Collection } from './Collection'
import { Photobooth } from './Photobooth'
import { Smoke } from './Smoke'

/* ---------------------------------------------------------------
   The main site is one long horizontal track inside a sticky frame.
   Vertical scroll drives it. Some panels "hold" (stay put while their
   scene plays) before the track slides on to the next one.
---------------------------------------------------------------- */

type Seg = { id: string; left: number; width: number; hold: number; t0: number; t1: number; t2: number; to: number }

const PANEL_BG: Record<string, string> = {
  hero: '#2A0A12',
  journey: '#6E1F2F',
  collection: '#F6EFE4',
  brew: '#BCDDC4',
  booth: '#2A0A12',
  outro: '#6E1F2F',
  ...Object.fromEntries(STOPS.map((s, i) => ['stop-' + i, s.bg])),
}

const NAV = [
  { id: 'stop-0', label: 'JOURNEY', match: (a: string) => a.startsWith('stop-') },
  { id: 'collection', label: 'COLLECTION', match: (a: string) => a === 'collection' },
  { id: 'brew', label: 'BREW BAR', match: (a: string) => a === 'brew' },
  { id: 'booth', label: 'PHOTOBOOTH', match: (a: string) => a === 'booth' },
]

const CHAPTERS = [
  { id: 'hero', label: 'FIRST CRACK', from: ['hero'] },
  { id: 'stop-0', label: 'THE JOURNEY', from: STOPS.map((_, i) => 'stop-' + i) },
  { id: 'collection', label: 'THE COLLECTION', from: ['collection'] },
  { id: 'brew', label: 'THE BREW BAR', from: ['brew'] },
  { id: 'booth', label: 'THE PHOTOBOOTH', from: ['booth'] },
  { id: 'outro', label: 'FIN', from: ['outro'] },
]

const smooth = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lerpHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

function stopColor(f: number) {
  const i = Math.min(STOPS.length - 2, Math.floor(f))
  const t = smooth(f - i, 0.25, 0.75)
  return lerpHex(STOPS[i].bg, STOPS[i + 1].bg, t)
}

export function Hero({ visible }: { visible: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const segs = useRef<Seg[]>([])
  const total = useRef(1)
  const cur = useRef(0)
  const [height, setHeight] = useState(0)
  const [local, setLocal] = useState<number[]>(STOPS.map(() => 0))
  const [near, setNear] = useState(0)
  const [active, setActive] = useState('hero')
  const [inJourney, setInJourney] = useState(false)

  const [picks, setPicks] = useState<string[]>(['guji'])
  const [brewed, setBrewed] = useState<{ drink: string; mug: string } | null>(null)
  const togglePick = (id: string) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)))

  // ---------- measure the journey track (the only horizontal part) ----------
  const measure = useCallback(() => {
    const tr = track.current
    if (!tr) return
    const vw = window.innerWidth
    const els = Array.from(tr.querySelectorAll<HTMLElement>('[data-panel]'))
    const maxX = Math.max(0, tr.scrollWidth - vw)
    let t = 0
    segs.current = els.map((el, i) => {
      const left = Math.min(el.offsetLeft, maxX)
      const next = els[i + 1] ? Math.min(els[i + 1].offsetLeft, maxX) : maxX
      const hold = parseFloat(el.dataset.hold || '0') * vw
      const seg = { id: el.dataset.panel!, left, width: el.offsetWidth, hold, t0: t, t1: t + hold, t2: t + hold + Math.max(0, next - left), to: next }
      t = seg.t2
      return seg
    })
    total.current = Math.max(1, t)
    setHeight(t + window.innerHeight)
  }, [])

  useLayoutEffect(() => {
    if (!visible) return
    measure()
    addEventListener('resize', measure)
    return () => removeEventListener('resize', measure)
  }, [visible, measure])

  // ---------- one frame loop: journey track, page colour, which section is on screen ----------
  useEffect(() => {
    if (!visible) return
    let raf = 0
    const xAt = (time: number) => {
      for (const s of segs.current) {
        if (time < s.t1) return s.left
        if (time < s.t2) return s.left + (time - s.t1)
      }
      const last = segs.current[segs.current.length - 1]
      return last ? last.to : 0
    }
    const loop = () => {
      const vw = innerWidth
      const vh = innerHeight
      const fr = frame.current
      const top = fr ? fr.getBoundingClientRect().top + scrollY : 0
      const target = Math.min(total.current, Math.max(0, scrollY - top))
      cur.current += (target - cur.current) * 0.14
      if (Math.abs(target - cur.current) < 0.3) cur.current = target
      const time = cur.current
      const x = xAt(time)
      if (track.current) track.current.style.transform = `translate3d(${-x}px,0,0)`

      const ss = segs.current
      const loc = ss.map((s) => Math.min(1, Math.max(0, (time - (s.t0 - vw * 0.5)) / (s.hold + vw * 0.5))))
      const f = Math.min(STOPS.length - 1, Math.max(0, x / vw))
      const pinned = scrollY > top - vh * 0.55 && scrollY < top + total.current + vh * 0.45
      journey.local = loc
      journey.progress = f / (STOPS.length - 1)
      journey.active = pinned
      journey.heroX = 0
      journey.heroY = Math.min(1.5, Math.max(0, scrollY / vh))

      // which block sits under the middle of the screen, and the page colour
      const blocks = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-sec]') ?? [])
      const mid = vh / 2
      const colOf = (id: string) => (id === 'journey' ? stopColor(f) : PANEL_BG[id] ?? '#2A0A12')
      let col = colOf(blocks[0]?.dataset.sec ?? 'hero')
      let under = 'hero'
      blocks.forEach((b, i) => {
        const r = b.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) under = b.dataset.sec!
        if (i > 0) {
          const w = smooth(mid - r.top, -vh * 0.22, vh * 0.22)
          if (w > 0) col = lerpHex(col, colOf(b.dataset.sec!), w)
        }
      })
      journey.bg = col
      {
        const n = parseInt(col.slice(1), 16)
        const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
        document.documentElement.style.setProperty('--fg', lum > 0.55 ? '#2A0A12' : '#F6EFE4')
      }
      journey.section = under === 'collection' || under === 'brew' || under === 'booth' || under === 'outro' ? (under as never) : ''
      journey.brew = journey.section !== ''

      setLocal((prev) => (prev.some((v, i) => Math.abs(v - loc[i]) > 0.002) ? loc : prev))
      setNear(f)
      setActive(under === 'journey' ? 'stop-' + Math.round(f) : under)
      setInJourney(under === 'journey')
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [visible])

  // ---------- navigation ----------
  useEffect(() => {
    if (!visible) return
    const onGoto = (e: Event) => {
      const id = (e as CustomEvent).detail as string
      if (id === 'hero') return window.scrollTo({ top: 0, behavior: 'smooth' })
      if (id.startsWith('stop-')) {
        const s = segs.current.find((x) => x.id === id)
        if (!s || !frame.current) return
        const top = frame.current.getBoundingClientRect().top + scrollY
        return window.scrollTo({ top: top + s.t0 + s.hold * 0.92, behavior: 'smooth' })
      }
      document.querySelector(`[data-sec='${id}']`)?.scrollIntoView({ behavior: 'smooth' })
    }
    const step = (dir: 1 | -1) => {
      const ss = segs.current
      const t = cur.current
      let i = ss.findIndex((s) => t < s.t1 + (s.t2 - s.t1) / 2)
      if (i === -1) i = ss.length - 1
      const idx = Math.min(ss.length - 1, Math.max(0, i + dir))
      window.dispatchEvent(new CustomEvent('fc-goto', { detail: ss[idx].id }))
    }
    const onKey = (e: KeyboardEvent) => {
      if (!journey.active || (e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    ;(window as unknown as { fcStep: typeof step }).fcStep = step
    // settle on an exhibit: if scrolling stops between two stops, glide to the nearer one
    let idle = 0
    const settle = () => {
      const fr = frame.current
      const ss = segs.current
      if (!fr || !ss.length) return
      const top = fr.getBoundingClientRect().top + scrollY
      const time = scrollY - top
      if (time <= 0 || time >= total.current) return
      const k = ss.findIndex((x) => time > x.t1 + 2 && time < x.t2 - 2)
      if (k === -1 || !ss[k + 1]) return
      const s = ss[k]
      const back = (time - s.t1) / (s.t2 - s.t1) < 0.5
      const dest = back ? s.t1 - 1 : ss[k + 1].t0 + ss[k + 1].hold * 0.6
      window.scrollTo({ top: top + dest, behavior: 'smooth' })
    }
    const onScroll = () => {
      clearTimeout(idle)
      idle = window.setTimeout(settle, 220)
    }
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('fc-goto', onGoto)
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('fc-goto', onGoto)
      removeEventListener('keydown', onKey)
      removeEventListener('scroll', onScroll)
      clearTimeout(idle)
    }
  }, [visible])

  useEffect(() => {
    if (!visible || !root.current) return
    window.scrollTo(0, 0)
    gsap.fromTo(
      root.current.querySelectorAll('[data-in]'),
      { yPercent: 110, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1.2, stagger: 0.07, ease: 'expo.out', delay: 0.25 },
    )
  }, [visible])

  if (!visible) return null

  const stopIdx = Math.round(near)

  return (
    <div ref={root} className="main">
      <nav className="hero__nav mono">
        <button className="hero__logo" onClick={() => goto('hero')}>
          FIRST CRACK
        </button>
        <div className="hero__links">
          {NAV.map((c) => (
            <button key={c.id} className={c.match(active) ? 'is-on' : ''} onClick={() => goto(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </nav>

      <Smoke />

      {/* ---------- HERO: the museum entrance ---------- */}
      <section className="hero__main" data-sec="hero">
        <Stain className="stain stain--hero" seed={11} color="#a05a32" />
        <div className="hero__text">
          <div className="mask">
            <div className="mono hero__kicker" data-in>
              EST. 2026 · A MUSEUM OF THE BEAN · OPEN DAILY FROM FIRST LIGHT
            </div>
          </div>
          <div className="mask">
            <h1 className="title hero__title" data-in>
              First
            </h1>
          </div>
          <div className="mask">
            <h1 className="title hero__title hero__title--b" data-in>
              <em>crack.</em>
            </h1>
          </div>
          <div className="mask">
            <p className="serif hero__lede" data-in>
              Two things crack before your first sip. The bean, popping open in the roaster. And the dawn, with that{' '}
              <em>early-morning longing</em> for a cup. Follow this one from cherry to cup.
            </p>
          </div>
        </div>
        <div className="hero__cue mono">
          <span>THE EXHIBITION STARTS BELOW</span>
          <span className="hero__arrow">↓</span>
        </div>
        <div className="gallery-floor" aria-hidden />
      </section>

      {/* ---------- CHAPTER 01: the journey, the one horizontal room ---------- */}
      <section ref={frame} className="frame" data-sec="journey" style={{ height }}>
        <div className="frame__sticky">
          <div ref={track} className="track">
            <JourneyStops local={local} near={near} />
          </div>
          <div className={'hud mono' + (inJourney ? ' is-on' : '')} style={{ color: STOPS[stopIdx].fg }}>
            <div className="hud__bars">
              {STOPS.map((s, i) => (
                <button key={s.no} className="hud__seg" onClick={() => goto('stop-' + i)} aria-label={s.title}>
                  <i style={{ transform: `scaleX(${Math.min(1, Math.max(0, near - i + 1))})` }} />
                </button>
              ))}
            </div>
            <div className="hud__row">
              <span>ROOM 01 · THE JOURNEY</span>
              <span className="hud__ctrl">
                <button onClick={() => (window as unknown as { fcStep: (d: number) => void }).fcStep(-1)} aria-label="Previous">
                  ←
                </button>
                {STOPS[stopIdx].no} / {String(STOPS.length).padStart(2, '0')}
                <button onClick={() => (window as unknown as { fcStep: (d: number) => void }).fcStep(1)} aria-label="Next">
                  →
                </button>
              </span>
              <span className="hud__scroll">SCROLL →</span>
            </div>
          </div>
        </div>
      </section>

      <Collection picks={picks} onToggle={togglePick} />

      <section className="sec sec--brew" data-sec="brew">
        <BrewBar picks={picks} onEnjoy={(drink, mug) => setBrewed({ drink, mug })} />
      </section>

      <section className="sec sec--booth" data-sec="booth">
        <Photobooth drink={brewed?.drink ?? null} mugColor={brewed?.mug ?? '#BCDDC4'} />
      </section>

      <section className="sec outro" data-sec="outro">
        <div className="outro__inner">
          <div className="mono">THANK YOU FOR VISITING</div>
          <h2 className="title">
            Same time
            <br />
            <em>tomorrow?</em>
          </h2>
          <p className="serif">The museum opens every morning, right around the first crack of dawn.</p>
          <div className="brew__actions">
            <button className="btn btn--light mono" onClick={() => goto('brew')}>
              BREW ANOTHER ↺
            </button>
            <button className="btn btn--ghost-light mono" onClick={() => goto('hero')}>
              BACK TO THE START ↑
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
