'use client'
import { useEffect, useRef } from 'react'
import { journey } from '@/lib/journey'

type P = { x: number; y: number; vx: number; vy: number; r: number; gr: number; a: number; life: number; max: number; rot: number; vr: number; s: number }

/** Soft, rising roast smoke drawn over the whole page while the roast stop is on screen. */
export function Smoke() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const DPR = 0.5 // render at half res: smoke is soft anyway
    const resize = () => {
      cv.width = innerWidth * DPR
      cv.height = innerHeight * DPR
    }
    resize()
    addEventListener('resize', resize)

    // a handful of wispy puff sprites, built once
    const sprites = Array.from({ length: 4 }, (_, k) => {
      const c = document.createElement('canvas')
      c.width = c.height = 256
      const g = c.getContext('2d')!
      g.filter = 'blur(14px)'
      for (let i = 0; i < 26; i++) {
        const x = 128 + (Math.random() - 0.5) * 120
        const y = 128 + (Math.random() - 0.5) * 120
        const r = 20 + Math.random() * 50
        const grd = g.createRadialGradient(x, y, 0, x, y, r)
        grd.addColorStop(0, `rgba(255,255,255,${0.12 + Math.random() * 0.12})`)
        grd.addColorStop(1, 'rgba(255,255,255,0)')
        g.fillStyle = grd
        g.beginPath()
        g.arc(x, y, r, 0, Math.PI * 2)
        g.fill()
      }
      // carve a few holes so it reads as wisps, not blobs
      g.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < 6 + k; i++) {
        g.beginPath()
        g.arc(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 26, 0, Math.PI * 2)
        g.fillStyle = 'rgba(0,0,0,0.5)'
        g.fill()
      }
      return c
    })

    const parts: P[] = []
    let last = performance.now()
    let raf = 0
    let level = 0

    const spawn = (w: number, h: number) => {
      const wide = innerWidth >= 900 && innerWidth / innerHeight >= 1.05
      const fromBean = Math.random() < 0.8
      const cx = fromBean ? (wide ? 0.765 : 0.5) * w : Math.random() * w
      const cy = fromBean ? (wide ? 0.3 : 0.16) * h : h * (0.85 + Math.random() * 0.25)
      parts.push({
        x: cx + (Math.random() - 0.5) * w * (fromBean ? 0.08 : 0.2),
        y: cy,
        vx: (Math.random() - 0.5) * 14,
        vy: -(18 + Math.random() * 30),
        r: (fromBean ? 40 : 70) + Math.random() * 50,
        gr: 18 + Math.random() * 22,
        a: 0,
        life: 0,
        max: 5 + Math.random() * 4,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        s: Math.floor(Math.random() * sprites.length),
      })
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const f = journey.progress * 5
      const near = journey.active ? Math.max(0, 1 - Math.abs(f - 4) / 0.75) : 0
      const heat = journey.local[4] ?? 0
      const target = near * Math.min(0.4, 0.08 + heat * 0.35)
      level += (target - level) * Math.min(1, dt * 3)
      cv.style.opacity = String(Math.min(1, level * 2))

      const w = cv.width
      const h = cv.height
      ctx.clearRect(0, 0, w, h)
      if (level > 0.01) {
        const want = Math.floor(60 * level)
        if (parts.length < want && Math.random() < 0.9) spawn(w, h)
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.life += dt
        if (p.life > p.max) {
          parts.splice(i, 1)
          continue
        }
        const k = p.life / p.max
        p.vx += Math.sin(now / 1400 + p.rot) * 3 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.r += p.gr * dt
        p.rot += p.vr * dt
        const alpha = Math.sin(Math.PI * k) * 0.3
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        const d = p.r * 2
        ctx.drawImage(sprites[p.s], -d / 2, -d / 2, d, d)
        ctx.restore()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="smoke" aria-hidden />
}
