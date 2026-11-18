'use client'
import { useEffect, useRef, useState } from 'react'

type Theme = 'beans' | 'crack' | 'mug'
const THEMES: { id: Theme; label: string }[] = [
  { id: 'beans', label: 'BEAN SHOWER' },
  { id: 'crack', label: 'FIRST CRACK!' },
  { id: 'mug', label: 'MY MUG' },
]
const SHOTS = 4
const FW = 640
const FH = 480

function drawBean(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = '#4a2716'
  ctx.beginPath()
  ctx.ellipse(0, 0, 14 * s, 20 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#c69a66'
  ctx.lineWidth = 3 * s
  ctx.beginPath()
  ctx.moveTo(-2 * s, -16 * s)
  ctx.bezierCurveTo(-7 * s, -5 * s, 5 * s, 5 * s, 0, 16 * s)
  ctx.stroke()
  ctx.restore()
}

function drawSticker(ctx: CanvasRenderingContext2D, theme: Theme, i: number, drink: string, mugColor: string) {
  if (theme === 'beans') {
    const spots = [
      [40, 40], [600, 60], [70, 430], [590, 420], [320, 30], [30, 240], [610, 250],
    ]
    spots.forEach(([x, y], k) => drawBean(ctx, x, y, 1.2 + ((k + i) % 3) * 0.3, k * 1.3 + i))
  }
  if (theme === 'crack') {
    ctx.save()
    ctx.translate(470, 90)
    ctx.rotate(-0.15)
    ctx.font = '700 64px "Familjen Grotesk", sans-serif'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#2A0A12'
    ctx.strokeText('CRACK!', -140, 20)
    ctx.fillStyle = '#BCDDC4'
    ctx.fillText('CRACK!', -140, 20)
    ctx.restore()
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      ctx.fillStyle = '#d9b98a'
      ctx.beginPath()
      ctx.ellipse(470 + Math.cos(a) * 120, 90 + Math.sin(a) * 60, 9, 4, a, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (theme === 'mug') {
    ctx.save()
    ctx.translate(520, 360)
    ctx.fillStyle = mugColor
    ctx.beginPath()
    ctx.roundRect(-60, -50, 110, 110, [6, 6, 30, 30])
    ctx.fill()
    ctx.lineWidth = 14
    ctx.strokeStyle = mugColor
    ctx.beginPath()
    ctx.arc(56, 4, 26, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()
    ctx.fillStyle = '#3a1b0e'
    ctx.beginPath()
    ctx.ellipse(-5, -50, 55, 12, 0, 0, Math.PI * 2)
    ctx.fill()
    drawBean(ctx, -5, 8, 1, -0.5)
    ctx.restore()
    ctx.font = '700 22px "JetBrains Mono", monospace'
    ctx.fillStyle = '#F6EFE4'
    ctx.strokeStyle = '#2A0A12'
    ctx.lineWidth = 6
    const txt = drink.toUpperCase()
    ctx.strokeText(txt, 30, 455)
    ctx.fillText(txt, 30, 455)
  }
}

/** Draw an image or video into a frame with "cover" cropping, optionally mirrored. */
function cover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, mirror: boolean) {
  const s = Math.max(FW / sw, FH / sh)
  const w = sw * s
  const h = sh * s
  ctx.save()
  if (mirror) {
    ctx.translate(FW, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(src, (FW - w) / 2, (FH - h) / 2, w, h)
  ctx.restore()
}

export function Photobooth({ drink, mugColor }: { drink: string | null; mugColor: string }) {
  const root = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [mode, setMode] = useState<'idle' | 'live' | 'shooting' | 'done'>('idle')
  const [theme, setTheme] = useState<Theme>('beans')
  const [count, setCount] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [shots, setShots] = useState<string[]>([])
  const [strip, setStrip] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const label = drink ?? 'Morning coffee'

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }
  useEffect(() => stop, [])

  const openCamera = async () => {
    setErr(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 960 } })
      stream.current = s
      setMode('live')
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => {})
        }
      })
    } catch {
      setErr('The camera isn’t available here. Upload up to four photos instead.')
    }
  }

  const frameFrom = (src: CanvasImageSource, sw: number, sh: number, i: number, mirror: boolean) => {
    const c = document.createElement('canvas')
    c.width = FW
    c.height = FH
    const ctx = c.getContext('2d')!
    cover(ctx, src, sw, sh, mirror)
    // warm, slightly faded film look
    ctx.fillStyle = 'rgba(110, 31, 47, 0.12)'
    ctx.fillRect(0, 0, FW, FH)
    drawSticker(ctx, theme, i, label, mugColor)
    return c.toDataURL('image/jpeg', 0.9)
  }

  const shoot = async () => {
    const v = video.current
    if (!v) return
    setMode('shooting')
    const got: string[] = []
    for (let i = 0; i < SHOTS; i++) {
      for (let n = 3; n > 0; n--) {
        setCount(n)
        await new Promise((r) => setTimeout(r, 650))
      }
      setCount(null)
      setFlash(true)
      got.push(frameFrom(v, v.videoWidth, v.videoHeight, i, true))
      setShots([...got])
      await new Promise((r) => setTimeout(r, 220))
      setFlash(false)
      await new Promise((r) => setTimeout(r, 350))
    }
    stop()
    compose(got)
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    const imgs = await Promise.all(
      Array.from(files)
        .slice(0, SHOTS)
        .map(
          (f) =>
            new Promise<HTMLImageElement>((res) => {
              const im = new Image()
              im.onload = () => res(im)
              im.src = URL.createObjectURL(f)
            }),
        ),
    )
    const got = Array.from({ length: SHOTS }, (_, i) => {
      const im = imgs[i % imgs.length]
      return frameFrom(im, im.naturalWidth, im.naturalHeight, i, false)
    })
    setShots(got)
    compose(got)
  }

  const compose = async (frames: string[]) => {
    const pad = 36
    const W = FW + pad * 2
    const head = 150
    const foot = 150
    const H = head + frames.length * (FH + pad) + foot
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#6E1F2F'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#BCDDC4'
    ctx.font = '700 76px "Familjen Grotesk", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('FIRST CRACK', W / 2, 98)
    ctx.font = '500 18px "JetBrains Mono", monospace'
    ctx.fillStyle = 'rgba(246,239,228,0.75)'
    ctx.fillText('A MUSEUM OF THE BEAN · PHOTOBOOTH', W / 2, 130)
    const imgs = await Promise.all(
      frames.map(
        (d) =>
          new Promise<HTMLImageElement>((res) => {
            const im = new Image()
            im.onload = () => res(im)
            im.src = d
          }),
      ),
    )
    imgs.forEach((im, i) => {
      const y = head + i * (FH + pad)
      ctx.fillStyle = '#F6EFE4'
      ctx.fillRect(pad - 8, y - 8, FW + 16, FH + 16)
      ctx.drawImage(im, pad, y, FW, FH)
    })
    const fy = H - foot + 40
    ctx.fillStyle = '#F6EFE4'
    ctx.font = '700 34px "Familjen Grotesk", sans-serif'
    ctx.fillText(label, W / 2, fy + 20)
    ctx.font = '500 16px "JetBrains Mono", monospace'
    ctx.fillStyle = 'rgba(246,239,228,0.7)'
    const d = new Date()
    ctx.fillText(
      `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} · BREWED BY ME`,
      W / 2,
      fy + 56,
    )
    drawBean(ctx, pad + 30, fy + 30, 1.6, -0.5)
    drawBean(ctx, W - pad - 30, fy + 30, 1.6, 0.6)
    setStrip(c.toDataURL('image/jpeg', 0.92))
    setMode('done')
  }

  const reset = () => {
    stop()
    setShots([])
    setStrip(null)
    setMode('idle')
    setErr(null)
  }

  const framed = typeof window !== 'undefined' && window.self !== window.top

  return (
    <section ref={root} id="booth" className="booth">
      <header className="booth__head">
        <div className="mono">ROOM 04 · THE PHOTOBOOTH</div>
        <h2 className="title">
          Say <em>“espresso”.</em>
        </h2>
        <p className="serif">
          Four shots, one strip. {drink ? `Your ${drink.toLowerCase()} is in the frame.` : 'Brew something first and it’ll be in the frame.'}
        </p>
      </header>

      <div className="booth__themes">
        {THEMES.map((t) => (
          <button key={t.id} className={'chip mono' + (theme === t.id ? ' is-on' : '')} onClick={() => setTheme(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="booth__stage">
        {mode === 'done' && strip ? (
          <div className="booth__result">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={strip} alt="Your First Crack photobooth strip" className="booth__strip" />
            <div className="booth__actions">
              <a className="btn btn--primary mono" href={strip} download="first-crack-photobooth.jpg">
                DOWNLOAD STRIP ↓
              </a>
              <button className="btn mono" onClick={reset}>
                RETAKE
              </button>
            </div>
            {framed && <p className="mono booth__note">DOWNLOADS ARE BLOCKED IN THIS PREVIEW · THEY WORK ON THE LIVE SITE</p>}
          </div>
        ) : (
          <div className="booth__cabin">
            <div className="booth__screen">
              {mode === 'idle' ? (
                <div className="booth__placeholder">
                  <span className="serif">Step into the booth.</span>
                </div>
              ) : (
                <video ref={video} className="booth__video" playsInline muted />
              )}
              <svg className={'booth__overlay theme-' + theme} viewBox="0 0 640 480" aria-hidden>
                {theme === 'beans' &&
                  [[40, 40], [600, 60], [70, 430], [590, 420], [320, 30], [30, 240], [610, 250]].map(([x, y], k) => (
                    <g key={k} transform={`translate(${x} ${y}) rotate(${k * 75})`}>
                      <ellipse rx="16" ry="23" fill="#4a2716" />
                      <path d="M-2 -18 C-8 -6 6 6 0 18" stroke="#c69a66" strokeWidth="3" fill="none" />
                    </g>
                  ))}
                {theme === 'crack' && (
                  <text x="330" y="110" className="booth__crack" transform="rotate(-8 470 90)">
                    CRACK!
                  </text>
                )}
                {theme === 'mug' && (
                  <g transform="translate(520 360)">
                    <rect x="-60" y="-50" width="110" height="110" rx="20" fill={mugColor} />
                    <path d="M50 -22 a26 26 0 0 1 0 52" stroke={mugColor} strokeWidth="14" fill="none" />
                    <ellipse cx="-5" cy="-50" rx="55" ry="12" fill="#3a1b0e" />
                  </g>
                )}
              </svg>
              {count !== null && <div className="booth__count display">{count}</div>}
              {flash && <div className="booth__flash" />}
              <div className="booth__film">
                {Array.from({ length: SHOTS }).map((_, i) => (
                  <span key={i} className={shots[i] ? 'is-taken' : ''} style={shots[i] ? { backgroundImage: `url(${shots[i]})` } : undefined} />
                ))}
              </div>
            </div>

            <div className="booth__controls">
              {mode === 'idle' && (
                <>
                  <button className="btn btn--primary mono" onClick={openCamera}>
                    OPEN CAMERA
                  </button>
                  <label className="btn mono booth__upload">
                    UPLOAD PHOTOS
                    <input type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} />
                  </label>
                </>
              )}
              {mode === 'live' && (
                <button className="booth__shutter" onClick={shoot} aria-label="Take four photos">
                  <span />
                </button>
              )}
              {mode === 'shooting' && <span className="mono">SMILE · {shots.length} / {SHOTS}</span>}
            </div>
            {err && <p className="mono booth__note">{err}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
