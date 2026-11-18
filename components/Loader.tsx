'use client'
import { useEffect, useRef, useState } from 'react'

const MIN_MS = 3200

const FACTS = [
  'First crack is the pop a bean makes near 196°C, when steam splits it open. The roast is now drinkable.',
  'Coffee beans are seeds. Each red cherry usually holds two, flat sides pressed together.',
  'About 70 beans go into one cup. A single tree gives roughly a pound of roasted coffee a year.',
  'Legend says a goat herder in Ethiopia noticed his goats dancing after eating coffee cherries.',
  'Light roasts carry slightly more caffeine than dark ones. Roasting burns a little off.',
  'Fresh coffee blooms when hot water hits it: that puff is CO₂ escaping the grounds.',
]

/** Just the counter. Counts to 100 (waiting for fonts), then slides away. */
export function Loader({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [fact, setFact] = useState(0)
  useEffect(() => setFact(Math.floor(Math.random() * FACTS.length)), [])
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
      <p className="loader__fact mono">
        <span>FUN FACT</span>
        {FACTS[fact]}
      </p>
    </div>
  )
}
