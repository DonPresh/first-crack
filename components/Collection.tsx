'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ORIGINS, type Origin } from '@/lib/brew'
import { goto } from '@/lib/goto'
import { BeanBag } from './Machine'

const Dots = ({ n }: { n: number }) => (
  <span className="dots" aria-label={`Roast ${n} of 5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <i key={i} className={i < n ? 'on' : ''} />
    ))}
  </span>
)

const FILTERS = ['ALL', 'NATURAL', 'WASHED', 'LIGHT', 'DARK'] as const
type Filter = (typeof FILTERS)[number]
const matches = (o: Origin, f: Filter) =>
  f === 'ALL' || (f === 'NATURAL' && o.process === 'Natural') || (f === 'WASHED' && o.process === 'Washed') || (f === 'LIGHT' && o.roast <= 2) || (f === 'DARK' && o.roast >= 4)

/** The museum index: a horizontal gallery of bags (or a list), on the main track. */
export function Collection({ picks, onToggle }: { picks: string[]; onToggle: (id: string) => void }) {
  const [view, setView] = useState<'gallery' | 'list'>('gallery')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [open, setOpen] = useState<Origin | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const PickBtn = ({ o }: { o: Origin }) => {
    const on = picks.includes(o.id)
    return (
      <button
        className={'pickbtn mono' + (on ? ' is-on' : '')}
        onClick={(e) => {
          e.stopPropagation()
          onToggle(o.id)
        }}
      >
        {on ? '✓ IN YOUR BAR' : '+ ADD TO BAR'}
      </button>
    )
  }

  const items = ORIGINS.filter((o) => matches(o, filter))

  return (
    <section className={'collection is-' + view} data-sec="collection">
      <div className="collection__intro">
        <div className="mono">ROOM 02 · THE COLLECTION</div>
        <h2 className="title">
          The
          <br />
          <em>Collection.</em>
        </h2>
        <p className="serif">Six bags, six hillsides. Pick one or two for the brew bar. Come back any time to swap.</p>
        <div className="mono collection__picked">
          IN YOUR BAR ·{' '}
          {picks.length ? picks.map((p) => ORIGINS.find((o) => o.id === p)!.name.split(',')[0]).join(' + ') : 'NOTHING YET'}
        </div>
        <div className="collection__chips">
          {FILTERS.map((f) => (
            <button key={f} className={'chip chip--dark mono' + (filter === f ? ' is-on' : '')} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="mono collection__view">
          INDEX ({String(items.length).padStart(2, '0')}) · VIEW
          <button className={view === 'gallery' ? 'is-on' : ''} onClick={() => setView('gallery')}>
            GALLERY
          </button>
          <button className={view === 'list' ? 'is-on' : ''} onClick={() => setView('list')}>
            LIST
          </button>
        </div>
        {picks.length > 0 && (
          <button className="btn btn--primary mono" onClick={() => goto('brew')}>
            BREW WITH {picks.length === 2 ? 'THESE' : 'THIS'} →
          </button>
        )}
      </div>

      {view === 'gallery' ? (
        <div className="gallery">
          {items.map((o) => (
            <article key={o.id} className={'exhibit' + (picks.includes(o.id) ? ' is-picked' : '')} onClick={() => setOpen(o)}>
              <span className="exhibit__big" aria-hidden>
                {Number(o.no)}
              </span>
              <div className="exhibit__tile" style={{ ['--tile' as string]: o.tile }}>
                <span className="mono exhibit__no">No. {o.no}</span>
                <div className="exhibit__bag">
                  <BeanBag color={o.bag} ink={o.ink} label={o.label} name={o.short} />
                </div>
                <PickBtn o={o} />
              </div>
              <div className="exhibit__cap">
                <span className="serif exhibit__name">{o.name}</span>
                <span className="mono">{o.process.toUpperCase()}</span>
              </div>
              <div className="mono exhibit__notes">{o.notes}</div>
            </article>
          ))}
        </div>
      ) : (
        <div className="list">
          <div className="list__row list__row--head mono">
            <span>NO.</span>
            <span />
            <span>ORIGIN</span>
            <span>PROCESS</span>
            <span>ALTITUDE</span>
            <span>ROAST</span>
            <span>NOTES</span>
            <span />
          </div>
          {items.map((o) => (
            <div key={o.id} className={'list__row' + (picks.includes(o.id) ? ' is-picked' : '')} onClick={() => setOpen(o)}>
              <span className="mono">{o.no}</span>
              <span className="list__thumb" style={{ background: o.tile }}>
                <BeanBag color={o.bag} ink={o.ink} label={o.label} name={o.short} />
              </span>
              <span className="serif list__name">{o.name}</span>
              <span className="mono">{o.process.toUpperCase()}</span>
              <span className="mono">{o.altitude}</span>
              <Dots n={o.roast} />
              <span className="mono list__notes">{o.notes}</span>
              <PickBtn o={o} />
            </div>
          ))}
        </div>
      )}

      {open &&
        createPortal(
          <div className="exhibit-modal" onClick={() => setOpen(null)}>
            <div className="exhibit-modal__card" onClick={(e) => e.stopPropagation()}>
              <div className="exhibit-modal__tile" style={{ background: open.tile }}>
                <div className="exhibit-modal__bag">
                  <BeanBag color={open.bag} ink={open.ink} label={open.label} name={open.short} />
                </div>
              </div>
              <div className="exhibit-modal__info">
                <div className="mono">EXHIBIT No. {open.no}</div>
                <h3 className="title">{open.name}</h3>
                <p className="serif">{open.story}</p>
                <dl className="mono spec">
                  <dt>PROCESS</dt>
                  <dd>{open.process.toUpperCase()}</dd>
                  <dt>ALTITUDE</dt>
                  <dd>{open.altitude}</dd>
                  <dt>ROAST</dt>
                  <dd>
                    <Dots n={open.roast} />
                  </dd>
                  <dt>NOTES</dt>
                  <dd>{open.notes.toUpperCase()}</dd>
                </dl>
                <div className="exhibit-modal__actions">
                  <PickBtn o={open} />
                  {picks.includes(open.id) && (
                    <button
                      className="btn btn--primary mono"
                      onClick={() => {
                        setOpen(null)
                        goto('brew')
                      }}
                    >
                      BREW WITH IT →
                    </button>
                  )}
                </div>
              </div>
              <button className="exhibit-modal__close mono" onClick={() => setOpen(null)}>
                CLOSE ✕
              </button>
            </div>
          </div>,
          document.body,
        )}
    </section>
  )
}
