'use client'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Loader } from '@/components/Loader'
import { Gate } from '@/components/Gate'
import { Hero } from '@/components/Hero'
import { Ritual } from '@/components/Ritual'
import type { Phase } from '@/lib/phase'

const Experience = dynamic(() => import('@/components/Experience'), { ssr: false })

export default function Page() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [loaderGone, setLoaderGone] = useState(false)
  const wipe = useRef<HTMLDivElement>(null)

  // dev shortcut: /?phase=gate or /?phase=entered
  useEffect(() => {
    const p = new URLSearchParams(location.search).get('phase') as Phase | null
    if (p) {
      setLoaderGone(true)
      setPhase(p)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('locked', phase !== 'entered')
  }, [phase])

  const open = useCallback(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    setPhase(reduce ? 'ritual' : 'opening')
  }, [])

  const cover = useCallback((next: Phase = 'ritual') => {
    const el = wipe.current!
    gsap
      .timeline()
      .set(el, { display: 'block', clipPath: 'circle(0% at 50% 50%)' })
      .to(el, { clipPath: 'circle(75% at 50% 50%)', duration: 0.55, ease: 'power3.in' })
      .call(() => setPhase(next))
      .to(el, { clipPath: 'circle(0% at 50% 100%)', duration: 1.0, ease: 'expo.inOut', delay: 0.15 })
      .set(el, { display: 'none' })
  }, [])

  return (
    <>
      <Experience phase={phase} setPhase={setPhase} onCover={() => cover('ritual')} onOpenRequest={open} />
      <div className="vignette" aria-hidden />
      <div className="grain-overlay" aria-hidden />
      <Gate visible={phase === 'gate'} onOpen={open} />
      {phase === 'ritual' && <Ritual onEnter={() => cover('entered')} />}
      <Hero visible={phase === 'entered'} />
      <div ref={wipe} className="wipe" aria-hidden />
      {!loaderGone && (
        <Loader
          onDone={() => {
            setLoaderGone(true)
            setPhase((p) => (p === 'loading' ? 'gate' : p))
          }}
        />
      )}
    </>
  )
}
