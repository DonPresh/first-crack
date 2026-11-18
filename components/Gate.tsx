'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Stain } from './Stain'

export function Gate({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  const root = useRef<HTMLDivElement>(null)

  const shown = useRef(false)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (visible) {
      shown.current = true
      gsap.set(el, { opacity: 1, y: 0 })
      gsap.fromTo(
        el.querySelectorAll('[data-in]'),
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.09, ease: 'expo.out', delay: 0.15 },
      )
    } else if (shown.current) {
      gsap.to(el, { opacity: 0, y: -10, duration: 0.5, ease: 'power2.in' })
    }
  }, [visible])

  return (
    <div ref={root} className="gate" style={{ opacity: 0 }}>
      <Stain className="stain stain--gate" seed={7} />
      <div className="gate__top mono" data-in>
        <span>FIRST CRACK</span>
        <span>EXHIBIT 001 · THE BAG</span>
      </div>
      <div className="gate__copy">
        <div className="mono gate__kicker" data-in>
          ADMISSION
        </div>
        <h1 className="title gate__line" data-in>
          One deep breath.
          <br />
          <em>Smell that?</em>
        </h1>
        <button className="gate__btn mono" onClick={onOpen} disabled={!visible} data-in>
          OPEN THE BAG
          <span aria-hidden>↗</span>
        </button>
        <div className="mono gate__hint" data-in>
          OR TAP THE BAG
        </div>
      </div>
    </div>
  )
}
