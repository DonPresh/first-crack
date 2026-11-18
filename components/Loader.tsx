'use client'
import { useEffect, useRef, useState } from 'react'

const MIN_MS = 3200

/** Just the counter. Counts to 100 (waiting for fonts), then slides away. */
export function Loader({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0)
  const [exiting, setExiting] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    let fontsReady = false
    document.fonts?.ready.then(() => (fontsReady = true))
    const t0 = performance.now()
    let raf = 0
    let exitT = 0
    let doneT = 0
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / MIN_MS)
      const eased = 1 - Math.pow(1 - k, 3)
      const capped = fontsReady ? eased : Math.min(eased, 0.9)
      setPct(Math.round(capped * 100))
      if (capped < 1) raf = requestAnimationFrame(tick)
      else {
        exitT = window.setTimeout(() => setExiting(true), 300)
        doneT = window.setTimeout(() => doneRef.current(), 300 + 1150)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(exitT)
      clearTimeout(doneT)
    }
  }, [])

  return (
    <div className={'loader grain' + (exiting ? ' is-out' : '')} aria-live="polite" aria-label={`Loading ${pct}%`}>
      <div className="loader__count title">
        {String(pct).padStart(3, '0')}
        <span>%</span>
      </div>
    </div>
  )
}
