/* Soft, synthesized foley. No files: everything is shaped noise and tiny tones.
   Audio starts on the first tap (browsers require a gesture). Quiet by design. */

type Loop = 'grind' | 'pour' | 'rattle' | 'steam' | 'shot'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let muted = false
const loops = new Map<Loop, { stop: () => void }>()
const listeners = new Set<(m: boolean) => void>()

const VOLUME = 0.32

try {
  muted = localStorage.getItem('fc-muted') === '1'
} catch {}

function ready() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : VOLUME
    // a gentle low-pass on everything keeps it warm, never harsh
    const soft = ctx.createBiquadFilter()
    soft.type = 'lowpass'
    soft.frequency.value = 7000
    master.connect(soft).connect(ctx.destination)
    const len = ctx.sampleRate * 2
    noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/** call from any user gesture */
export const unlock = () => void ready()

export function isMuted() {
  return muted
}
export function setMuted(m: boolean) {
  muted = m
  try {
    localStorage.setItem('fc-muted', m ? '1' : '0')
  } catch {}
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : VOLUME, ctx.currentTime, 0.05)
  if (m) loops.forEach((_, k) => loop(k, false))
  listeners.forEach((f) => f(m))
}
export function onMute(f: (m: boolean) => void) {
  listeners.add(f)
  return () => void listeners.delete(f)
}

function src(c: AudioContext, loopIt = false) {
  const s = c.createBufferSource()
  s.buffer = noise
  s.loop = loopIt
  s.loopStart = Math.random()
  return s
}
function filt(c: AudioContext, type: BiquadFilterType, f: number, q = 1) {
  const b = c.createBiquadFilter()
  b.type = type
  b.frequency.value = f
  b.Q.value = q
  return b
}

/** one short noise grain (a bean tick, a fibre of the tear) */
function grain(c: AudioContext, at: number, f: number, dur: number, vol: number, q = 4) {
  const s = src(c)
  const b = filt(c, 'bandpass', f, q)
  const g = c.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(vol, at + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  s.connect(b).connect(g).connect(master!)
  s.start(at, Math.random() * 1.5, dur + 0.02)
}

/** the foil tear strip: a quick ripping crackle with a papery swish under it */
export function tear() {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime + 0.02
  for (let i = 0; i < 46; i++) {
    const at = t + (i / 46) * 0.55 + Math.random() * 0.012
    grain(c, at, 2200 + Math.random() * 3800, 0.012 + Math.random() * 0.02, 0.5 + Math.random() * 0.4, 6)
  }
  const s = src(c)
  const b = filt(c, 'bandpass', 1800, 0.8)
  b.frequency.setValueAtTime(1200, t)
  b.frequency.linearRampToValueAtTime(3200, t + 0.55)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.35, t + 0.06)
  g.gain.linearRampToValueAtTime(0.2, t + 0.45)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
  s.connect(b).connect(g).connect(master!)
  s.start(t, 0, 0.8)
  // the bag mouth popping open
  setTimeout(() => crinkle(0.4), 320)
}

/** pouch crinkle */
export function crinkle(len = 0.35) {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime
  for (let i = 0; i < 14; i++) grain(c, t + Math.random() * len, 1500 + Math.random() * 3000, 0.02 + Math.random() * 0.03, 0.18, 3)
}

/** beans tumbling out of the bag: a shower of small hard ticks that thins out */
export function spill(seconds = 2.2) {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime
  const n = 140
  for (let i = 0; i < n; i++) {
    const k = Math.pow(Math.random(), 1.6) // dense at the start
    const at = t + k * seconds
    grain(c, at, 2600 + Math.random() * 3200, 0.018 + Math.random() * 0.02, 0.22 * (1 - k * 0.6), 9)
  }
}

/** the one bean landing */
export function plop() {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime
  grain(c, t, 1400, 0.05, 0.4, 5)
  grain(c, t + 0.09, 1900, 0.03, 0.18, 5)
}

/** a single drip into coffee */
export function drip(pitch = 1) {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(1100 * pitch, t)
  o.frequency.exponentialRampToValueAtTime(420 * pitch, t + 0.07)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.16, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + 0.14)
}

/** soft thud (tamp, mug set down) */
export function thud() {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.frequency.setValueAtTime(140, t)
  o.frequency.exponentialRampToValueAtTime(55, t + 0.15)
  const g = c.createGain()
  g.gain.setValueAtTime(0.5, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + 0.25)
  grain(c, t, 900, 0.05, 0.15, 2)
}

/** a gentle chime when the drink is ready */
export function ding() {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime
  ;[1318, 1976].forEach((f, i) => {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = c.createGain()
    g.gain.setValueAtTime(0, t + i * 0.09)
    g.gain.linearRampToValueAtTime(0.09, t + i * 0.09 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 1.2)
    o.connect(g).connect(master!)
    o.start(t + i * 0.09)
    o.stop(t + 1.4)
  })
}

/** continuous sounds that run while the visitor holds */
export function loop(kind: Loop, on: boolean) {
  const c = ready()
  const cur = loops.get(kind)
  if (!on || !c || muted) {
    if (cur) {
      cur.stop()
      loops.delete(kind)
    }
    return
  }
  if (cur) return
  const t = c.currentTime
  const out = c.createGain()
  out.gain.setValueAtTime(0, t)
  out.connect(master!)
  const parts: AudioScheduledSourceNode[] = []
  let timer = 0
  let level = 0.3

  if (kind === 'grind') {
    // burr grinder: band-limited noise, chopped by a fast buzz
    const s = src(c, true)
    const b = filt(c, 'bandpass', 1500, 1.2)
    const am = c.createGain()
    am.gain.value = 0.55
    const lfo = c.createOscillator()
    lfo.frequency.value = 38
    const lg = c.createGain()
    lg.gain.value = 0.4
    lfo.connect(lg).connect(am.gain)
    s.connect(b).connect(am).connect(out)
    const hum = c.createOscillator()
    hum.type = 'sawtooth'
    hum.frequency.value = 96
    const hg = c.createGain()
    hg.gain.value = 0.05
    hum.connect(filt(c, 'lowpass', 400)).connect(hg).connect(out)
    parts.push(s, lfo, hum)
    level = 0.38
    timer = window.setInterval(() => grain(c, c.currentTime, 3000 + Math.random() * 2500, 0.015, 0.12, 8), 45)
  }
  if (kind === 'pour') {
    // water from a gooseneck into a bed of grounds / a cup: a wandering trickle
    const s = src(c, true)
    const b = filt(c, 'bandpass', 900, 2.2)
    const lp = filt(c, 'lowpass', 2600)
    s.connect(b).connect(lp).connect(out)
    const s2 = src(c, true)
    const b2 = filt(c, 'bandpass', 380, 1.4)
    const g2 = c.createGain()
    g2.gain.value = 0.6
    s2.connect(b2).connect(g2).connect(out)
    parts.push(s, s2)
    level = 0.42
    timer = window.setInterval(() => {
      const now = c.currentTime
      b.frequency.setTargetAtTime(650 + Math.random() * 700, now, 0.05)
      if (Math.random() < 0.35) drip(0.8 + Math.random() * 0.5)
    }, 90)
  }
  if (kind === 'rattle') {
    // beans sliding into the hopper
    timer = window.setInterval(() => {
      const now = c.currentTime
      for (let i = 0; i < 5; i++) grain(c, now + Math.random() * 0.06, 2400 + Math.random() * 3000, 0.02, 0.16, 9)
    }, 60)
    level = 1
  }
  if (kind === 'steam') {
    const s = src(c, true)
    const b = filt(c, 'highpass', 3200, 0.7)
    const lfo = c.createOscillator()
    lfo.frequency.value = 6
    const lg = c.createGain()
    lg.gain.value = 0.08
    const am = c.createGain()
    am.gain.value = 0.25
    lfo.connect(lg).connect(am.gain)
    s.connect(b).connect(am).connect(out)
    parts.push(s, lfo)
    level = 0.35
  }
  if (kind === 'shot') {
    // the espresso pull: pump hum plus a thin syrupy stream
    const hum = c.createOscillator()
    hum.type = 'triangle'
    hum.frequency.value = 52
    const hg = c.createGain()
    hg.gain.value = 0.16
    hum.connect(hg).connect(out)
    const s = src(c, true)
    const b = filt(c, 'bandpass', 600, 3)
    const sg = c.createGain()
    sg.gain.value = 0.5
    s.connect(b).connect(sg).connect(out)
    parts.push(hum, s)
    level = 0.4
    timer = window.setInterval(() => Math.random() < 0.4 && drip(0.6 + Math.random() * 0.3), 140)
  }

  parts.forEach((p) => p.start())
  out.gain.linearRampToValueAtTime(level, t + 0.12)
  loops.set(kind, {
    stop: () => {
      clearInterval(timer)
      const now = c.currentTime
      out.gain.cancelScheduledValues(now)
      out.gain.setValueAtTime(out.gain.value, now)
      out.gain.linearRampToValueAtTime(0, now + 0.18)
      parts.forEach((p) => p.stop(now + 0.25))
    },
  })
}

export function stopAll() {
  loops.forEach((_, k) => loop(k, false))
}
