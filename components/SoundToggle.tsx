'use client'
import { useEffect, useState } from 'react'
import { isMuted, onMute, setMuted, unlock } from '@/lib/sound'

export function SoundToggle({ className = '' }: { className?: string }) {
  const [m, setM] = useState(false)
  useEffect(() => {
    setM(isMuted())
    return onMute(setM)
  }, [])
  return (
    <button
      className={'sound-toggle mono ' + className}
      aria-pressed={!m}
      aria-label={m ? 'Turn sound on' : 'Turn sound off'}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        unlock()
        setMuted(!m)
      }}
    >
      <span className={'sound-toggle__bars' + (m ? ' is-off' : '')} aria-hidden>
        <i />
        <i />
        <i />
      </span>
      {m ? 'SOUND OFF' : 'SOUND ON'}
    </button>
  )
}
