'use client'
import { STOPS } from '@/lib/journey'
import { CherryScene, CupScene, DryScene, PickScene, ProcessScene, RoastScene } from './Scenes'

const SCENES = [CherryScene, PickScene, ProcessScene, DryScene, RoastScene, CupScene]

/** The six journey stops, each a full-viewport panel on the main horizontal track. */
export function JourneyStops({ local, near }: { local: number[]; near: number }) {
  return (
    <>
      {STOPS.map((s, i) => {
        const Scene = SCENES[i]
        const lt = local[i] ?? 0
        const textIn = Math.min(1, lt * 2.2)
        return (
          <article key={s.no} className={'panel stop stop--' + i} data-panel={'stop-' + i} data-hold="1" style={{ color: s.fg }}>
            <div className="mono stop__chapter">ROOM 01 · THE JOURNEY · EXHIBIT {s.no}</div>
            <div className="stop__inner" style={{ opacity: textIn, transform: `translateX(${(1 - textIn) * 60}px)` }}>
              <div className="mono stop__meta" style={{ color: s.accent }}>
                {s.meta}
              </div>
              <div className="title stop__no">{s.no}</div>
              <h2 className="title stop__title">{s.title}</h2>
              <div className="mono stop__plate">{s.plate}</div>
              <p className="serif stop__body">{s.body}</p>
            </div>
            <div className="stop__scene">{Math.abs(i - near) < 1.3 && <Scene t={lt} />}</div>
          </article>
        )
      })}
    </>
  )
}
