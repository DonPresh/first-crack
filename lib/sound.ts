/* Soft, synthesized foley. No files: everything is shaped noise and tiny tones.
   Audio starts on the first tap (browsers require a gesture). Quiet by design. */

type Loop = 'grind' | 'pour' | 'rattle' | 'steam' | 'shot' | 'trickle'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let muted = false
let fillLevel = 0
let trickleBand: BiquadFilterNode | null = null
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
  if (m) {
    loops.forEach((_, k) => loop(k, false))
    const w = musicWanted
    music(false)
    musicWanted = w
  } else if (musicWanted) music(true)
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

/** a hard little click: one bean hitting foil, glass or another bean */
function tick(c: AudioContext, at: number, vol: number, bright = 1) {
  const s = src(c)
  const hp = filt(c, 'highpass', 900 * bright, 0.7)
  const pk = filt(c, 'peaking', 2400 + Math.random() * 2600, 3)
  pk.gain.value = 9
  const g = c.createGain()
  const d = 0.004 + Math.random() * 0.01
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + d)
  s.connect(hp).connect(pk).connect(g).connect(master!)
  s.start(at, Math.random() * 1.8, d + 0.01)
}

/** beans pouring out of a bag: a dense, swelling rattle with a sandy hiss under it,
    then the last few stragglers bouncing on the counter */
export function spill(seconds = 2.4) {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime + 0.03
  // sandy bed of countless tiny hits
  const bed = src(c, true)
  const bp = filt(c, 'bandpass', 3400, 0.6)
  const bg = c.createGain()
  bg.gain.setValueAtTime(0, t)
  bg.gain.linearRampToValueAtTime(0.09, t + 0.25)
  bg.gain.setValueAtTime(0.09, t + seconds * 0.55)
  bg.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  // amplitude flutter so the bed sounds granular, not like a hiss
  const fl = c.createOscillator()
  fl.type = 'square'
  fl.frequency.value = 23
  const flg = c.createGain()
  flg.gain.value = 0.03
  fl.connect(flg).connect(bg.gain)
  bed.connect(bp).connect(bg).connect(master!)
  bed.start(t)
  bed.stop(t + seconds + 0.1)
  fl.start(t)
  fl.stop(t + seconds + 0.1)
  // individual beans: rate swells then thins
  const n = 520
  for (let i = 0; i < n; i++) {
    const u = Math.random()
    const k = u < 0.85 ? Math.pow(Math.random(), 0.9) * 0.7 : 0.7 + Math.random() * 0.3
    const at = t + k * seconds
    const swell = Math.sin(Math.min(1, k / 0.7) * Math.PI * 0.5 + 0.2)
    tick(c, at, (0.08 + Math.random() * 0.22) * swell * (k > 0.7 ? 0.8 : 1), 0.8 + Math.random() * 0.6)
  }
  // stragglers: a bean bouncing, gaps shrinking (tik... tik.. tik.tik)
  for (let b = 0; b < 3; b++) {
    let at = t + seconds * (0.75 + b * 0.08)
    let gap = 0.16
    let v = 0.3
    for (let j = 0; j < 5; j++) {
      tick(c, at, v, 1.1)
      at += gap
      gap *= 0.62
      v *= 0.62
    }
  }
}

/** the one bean landing on the counter: tok, then a tiny bounce */
export function plop() {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime
  tick(c, t, 0.45, 0.7)
  knock(c, t, 520, 0.18)
  tick(c, t + 0.11, 0.18, 1)
  tick(c, t + 0.17, 0.08, 1.1)
}

/** a woody knock body under a click */
function knock(c: AudioContext, at: number, f: number, vol: number) {
  const o = c.createOscillator()
  o.frequency.setValueAtTime(f, at)
  o.frequency.exponentialRampToValueAtTime(f * 0.7, at + 0.05)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06)
  o.connect(g).connect(master!)
  o.start(at)
  o.stop(at + 0.08)
}

/** a real drop into liquid: a tiny splash, then the bubble "bloop" that rises in pitch */
export function drip(pitch = 1) {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime + Math.random() * 0.02
  const f0 = (380 + Math.random() * 160) * pitch
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(f0 * (2.2 + Math.random() * 0.8), t + 0.045)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.11, t + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + 0.09)
  // the splash on impact
  const s = src(c)
  const b = filt(c, 'bandpass', 2500, 1.2)
  const sg = c.createGain()
  sg.gain.setValueAtTime(0.05, t)
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
  s.connect(b).connect(sg).connect(master!)
  s.start(t, Math.random(), 0.04)
}

/** first crack: a sharp, dry snap with a short woody crunch, like cracking a nut */
export function crack(vol = 1) {
  const c = ready()
  if (!c || muted) return
  const t = c.currentTime + 0.005
  // the snap
  const s = src(c)
  const hp = filt(c, 'highpass', 1200, 0.7)
  const pk = filt(c, 'peaking', 3200, 2)
  pk.gain.value = 8
  const g = c.createGain()
  g.gain.setValueAtTime(0.9 * vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018)
  s.connect(hp).connect(pk).connect(g).connect(master!)
  s.start(t, Math.random(), 0.03)
  // the shell giving way: 3 to 5 micro clicks right behind it
  const m = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < m; i++) tick(c, t + 0.006 + Math.random() * 0.035, (0.25 + Math.random() * 0.3) * vol, 1.2)
  knock(c, t, 700 + Math.random() * 300, 0.22 * vol)
}

/** a handful of pops, the way a real roast cracks: scattered, then clustered */
export function crackBurst(count = 9, seconds = 2.6) {
  const c = ready()
  if (!c || muted) return
  for (let i = 0; i < count; i++) {
    const k = Math.pow(Math.random(), 0.8)
    setTimeout(() => crack(0.5 + Math.random() * 0.5), k * seconds * 1000)
  }
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

  if (kind === 'trickle') {
    // a thin stream into a mug: a liquid resonance that climbs as the cup fills, with bubbles
    const s = src(c, true)
    const b = filt(c, 'bandpass', 600 + fillLevel * 900, 5)
    trickleBand = b
    const am = c.createGain()
    am.gain.value = 0.7
    s.connect(filt(c, 'highpass', 250)).connect(b).connect(am).connect(out)
    const s2 = src(c, true)
    const b2 = filt(c, 'bandpass', 2600, 1)
    const g2 = c.createGain()
    g2.gain.value = 0.12
    s2.connect(b2).connect(g2).connect(out)
    parts.push(s, s2)
    level = 0.5
    timer = window.setInterval(() => {
      const now = c.currentTime
      am.gain.setTargetAtTime(0.5 + Math.random() * 0.5, now, 0.03)
      b.frequency.setTargetAtTime((600 + fillLevel * 900) * (0.92 + Math.random() * 0.16), now, 0.04)
      if (Math.random() < 0.5) drip(1 + fillLevel * 0.8)
    }, 70)
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

/** how full the mug is (0..1), so the pour sound rises as it fills */
export function setFill(f: number) {
  fillLevel = Math.max(0, Math.min(1, f))
}

/* ---------- museum music: a very soft, slow lo-fi loop, all synthesized ---------- */
let musicOn = false
let musicWanted = false
let musicBus: GainNode | null = null
let musicTimer = 0
let crackle: AudioBufferSourceNode | null = null
const BPM = 72
const BEAT = 60 / BPM
// Fmaj9 - Em7 - Dm9 - Cmaj7 (as MIDI notes), the bass root an octave below
const CHORDS = [
  [53, 57, 60, 64, 67],
  [52, 55, 59, 62],
  [50, 53, 57, 60, 64],
  [48, 52, 55, 59],
]
const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

function keys(c: AudioContext, at: number, notes: number[], len: number, vel: number) {
  notes.forEach((n, i) => {
    const f = hz(n)
    const g = c.createGain()
    const a = at + i * 0.012 // a lazy, rolled chord
    g.gain.setValueAtTime(0, a)
    g.gain.linearRampToValueAtTime(vel, a + 0.02)
    g.gain.exponentialRampToValueAtTime(vel * 0.35, a + 0.6)
    g.gain.exponentialRampToValueAtTime(0.0001, a + len)
    const o1 = c.createOscillator()
    o1.type = 'sine'
    o1.frequency.value = f
    o1.detune.value = (Math.random() - 0.5) * 10
    const o2 = c.createOscillator()
    o2.type = 'triangle'
    o2.frequency.value = f * 2
    const g2 = c.createGain()
    g2.gain.value = 0.12
    o1.connect(g)
    o2.connect(g2).connect(g)
    g.connect(musicBus!)
    o1.start(a)
    o2.start(a)
    o1.stop(a + len + 0.05)
    o2.stop(a + len + 0.05)
  })
}
function bass(c: AudioContext, at: number, n: number, len: number) {
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.value = hz(n)
  const g = c.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(0.32, at + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  o.connect(g).connect(musicBus!)
  o.start(at)
  o.stop(at + len + 0.05)
}
function kick(c: AudioContext, at: number) {
  const o = c.createOscillator()
  o.frequency.setValueAtTime(110, at)
  o.frequency.exponentialRampToValueAtTime(42, at + 0.18)
  const g = c.createGain()
  g.gain.setValueAtTime(0.42, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3)
  o.connect(g).connect(musicBus!)
  o.start(at)
  o.stop(at + 0.32)
}
function snare(c: AudioContext, at: number) {
  const s = src(c)
  const b = filt(c, 'bandpass', 1700, 0.8)
  const g = c.createGain()
  g.gain.setValueAtTime(0.16, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)
  s.connect(b).connect(g).connect(musicBus!)
  s.start(at, Math.random(), 0.2)
}
function hat(c: AudioContext, at: number, v: number) {
  const s = src(c)
  const b = filt(c, 'highpass', 7000, 0.7)
  const g = c.createGain()
  g.gain.setValueAtTime(v, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04)
  s.connect(b).connect(g).connect(musicBus!)
  s.start(at, Math.random(), 0.06)
}

export function music(on: boolean) {
  musicWanted = on
  const c = ready()
  if (!c) return
  if (!on || muted) {
    if (!musicOn) return
    musicOn = false
    clearInterval(musicTimer)
    const now = c.currentTime
    musicBus?.gain.setTargetAtTime(0, now, 0.4)
    const bus = musicBus
    const cr = crackle
    setTimeout(() => {
      bus?.disconnect()
      cr?.stop()
    }, 2500)
    musicBus = null
    crackle = null
    return
  }
  if (musicOn) return
  musicOn = true
  const now = c.currentTime
  musicBus = c.createGain()
  musicBus.gain.setValueAtTime(0, now)
  musicBus.gain.linearRampToValueAtTime(0.3, now + 4) // fades in slowly
  // tape warmth: everything through a soft low-pass that drifts a little
  const warm = filt(c, 'lowpass', 2200, 0.5)
  const wob = c.createOscillator()
  wob.frequency.value = 0.15
  const wg = c.createGain()
  wg.gain.value = 300
  wob.connect(wg).connect(warm.frequency)
  wob.start()
  musicBus.connect(warm).connect(master!)
  // vinyl crackle under it all
  crackle = src(c, true)
  const cg = c.createGain()
  cg.gain.value = 0.012
  crackle.connect(filt(c, 'bandpass', 3000, 0.5)).connect(cg).connect(musicBus)
  crackle.start()
  const pops = setInterval(() => {
    if (!musicOn) return clearInterval(pops)
    if (Math.random() < 0.5) grainTo(c, musicBus!, c.currentTime + Math.random() * 0.2, 2000 + Math.random() * 3000, 0.006, 0.06)
  }, 220)

  let next = now + 0.3
  let step = 0 // eighth notes
  musicTimer = window.setInterval(() => {
    if (!musicBus) return
    while (next < c.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % CHORDS.length
      const e = step % 8
      const swing = e % 2 === 1 ? BEAT * 0.16 : 0
      const at = next + swing
      const chord = CHORDS[bar]
      if (e === 0) {
        keys(c, at, chord, BEAT * 3.2, 0.05)
        bass(c, at, chord[0] - 12, BEAT * 1.6)
        kick(c, at)
      }
      if (e === 3) keys(c, at, chord.slice(1), BEAT * 1.6, 0.03)
      if (e === 5) kick(c, at)
      if (e === 4) bass(c, at, chord[0] - 5, BEAT * 1.2)
      if (e === 2 || e === 6) snare(c, at)
      hat(c, at, e % 2 ? 0.02 : 0.035)
      next += BEAT / 2
      step++
    }
  }, 120)
}

function grainTo(c: AudioContext, dest: AudioNode, at: number, f: number, dur: number, vol: number) {
  const s = src(c)
  const b = filt(c, 'bandpass', f, 4)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  s.connect(b).connect(g).connect(dest)
  s.start(at, Math.random(), dur + 0.02)
}

export function stopAll() {
  loops.forEach((_, k) => loop(k, false))
}
