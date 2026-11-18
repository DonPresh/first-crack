'use client'
import { hoverCursor } from '@/lib/cursor'
import { crack as sfxCrack } from '@/lib/sound'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Physics, CuboidCollider, RigidBody } from '@react-three/rapier'
import gsap from 'gsap'
import { Beans } from './Beans'
import { Exhibits3D } from './Exhibits3D'
import { createBeanGeometry, createBeanMaterial } from '@/lib/bean'
import { createPouchGeometry, drawBagFront } from '@/lib/bagLabel'
import { COLORS, type Phase } from '@/lib/phase'
import { STOPS, journey } from '@/lib/journey'

const STOP_COLORS = STOPS.map((s) => new THREE.Color(s.bg))
const _c = new THREE.Color()

function journeyColor(p: number, out: THREE.Color) {
  const f = p * (STOP_COLORS.length - 1)
  const i = Math.min(STOP_COLORS.length - 2, Math.floor(f))
  const t = THREE.MathUtils.smoothstep(f - i, 0.25, 0.75)
  return out.copy(STOP_COLORS[i]).lerp(STOP_COLORS[i + 1], t)
}

type Props = {
  phase: Phase
  setPhase: (p: Phase) => void
  onCover: () => void // ask the page to run the colour wipe
  onOpenRequest: () => void
}

const FLOOR_Y = -1.75

function Bag({
  phase,
  bagRef,
  stripRef,
  mouthRef,
  pouchRef,
  onOpenRequest,
}: {
  phase: Phase
  bagRef: React.RefObject<THREE.Group | null>
  stripRef: React.RefObject<THREE.Mesh | null>
  mouthRef: React.RefObject<THREE.Object3D | null>
  pouchRef: React.RefObject<THREE.Mesh | null>
  onOpenRequest: () => void
}) {
  const geo = useMemo(() => createPouchGeometry(2, 3, 0.9), [])
  const plain = useMemo(() => new THREE.MeshStandardMaterial({ color: COLORS.mint, roughness: 0.85 }), [])
  const inside = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a160c', roughness: 1 }), [])
  const front = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82 }), [])
  const stripMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#A9CDB2', roughness: 0.8, transparent: true }),
    [],
  )
  const [hover, setHover] = useState(false)
  const { pointer } = useThree()

  useEffect(() => {
    drawBagFront().then((tex) => {
      front.map = tex
      front.needsUpdate = true
    })
  }, [front])

  useEffect(() => {
    document.body.style.cursor = hover && phase === 'gate' ? 'pointer' : ''
  }, [hover, phase])

  useFrame((state, dt) => {
    const g = bagRef.current
    if (!g) return
    if (phase === 'loading' || phase === 'gate') {
      const t = state.clock.elapsedTime
      g.position.y = 0.25 + Math.sin(t * 1.1) * 0.08
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, Math.sin(t * 0.45) * 0.18 + pointer.x * 0.35, 3, dt)
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.12, 3, dt)
      const s = hover && phase === 'gate' ? 1.03 : 1
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 6, dt))
    }
  })

  return (
    <group
      ref={bagRef}
      position={[0, 0.25, 0]}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      onClick={() => phase === 'gate' && onOpenRequest()}
    >
      <mesh ref={pouchRef} geometry={geo} material={[plain, plain, inside, plain, front, plain]} castShadow receiveShadow onUpdate={(m: THREE.Mesh) => m.updateMorphTargets()} />
      {/* tear-off strip */}
      <mesh ref={stripRef} position={[0, 1.66, 0]} material={stripMat} castShadow>
        <boxGeometry args={[2, 0.32, 0.05]} />
      </mesh>
      {/* where the beans leave from */}
      <object3D ref={mouthRef} position={[0, 1.45, 0]} />
    </group>
  )
}

function HeroBean({ beanRef, onPoke, live }: { beanRef: React.RefObject<THREE.Mesh | null>; onPoke: () => void; live: boolean }) {
  const geo = useMemo(() => createBeanGeometry(96), [])
  const mat = useMemo(() => {
    const m = createBeanMaterial(true)
    return m
  }, [])
  return (
    <mesh
      ref={beanRef}
      geometry={geo}
      material={mat}
      visible={false}
      castShadow
      onClick={live ? (e) => (e.stopPropagation(), onPoke()) : undefined}
      onPointerOver={live ? () => hoverCursor('bean', 'pointer') : undefined}
      onPointerOut={live ? () => hoverCursor('bean', null) : undefined}
    />
  )
}

function Director({ phase, setPhase, onCover, onOpenRequest }: Props) {
  const bagRef = useRef<THREE.Group>(null)
  const stripRef = useRef<THREE.Mesh>(null)
  const mouthRef = useRef<THREE.Object3D>(null)
  const pouchRef = useRef<THREE.Mesh>(null)
  const beanRef = useRef<THREE.Mesh>(null)
  const ran = useRef<{ open?: boolean; fall?: boolean }>({})
  const { camera, pointer, size } = useThree()
  const beanCount = size.width < 768 ? 110 : 220
  const bg = useRef(new THREE.Color(COLORS.cream))
  const crackAt = useRef<number | null>(null)
  const pokeAt = useRef(-10)
  const poke = () => {
    pokeAt.current = performance.now() / 1000
    sfxCrack()
    window.dispatchEvent(new CustomEvent('fc-poke'))
  }
  const narrow = size.width / size.height < 0.8
  const lookY = narrow ? -1.0 : 0.2

  // frame the bag for portrait screens
  useEffect(() => {
    if (phase === 'entered' || phase === 'falling') return
    camera.position.set(0, narrow ? 1.4 : 1.1, narrow ? 13 : 7)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, camera])

  // OPEN: tear strip, tip bag
  useEffect(() => {
    if (phase !== 'opening' || ran.current.open) return
    ran.current.open = true
    const bag = bagRef.current!
    const strip = stripRef.current!
    const pouch = pouchRef.current
    pouch?.updateMorphTargets()
    const mouth = { v: 0 }
    const tl = gsap.timeline()
    tl.to(strip.position, { x: -1.4, y: 3.4, duration: 1.0, ease: 'power3.out' }, 0)
      // the seal parts: the mouth opens before anything pours
      .to(
        mouth,
        {
          v: 1,
          duration: 0.5,
          ease: 'back.out(2)',
          onUpdate: () => {
            if (pouch?.morphTargetInfluences) pouch.morphTargetInfluences[0] = mouth.v
          },
        },
        0.3,
      )
      .to(strip.rotation, { z: 1.1, x: -0.8, duration: 1.0, ease: 'power3.out' }, 0)
      .to(strip.material as THREE.Material, { opacity: 0, duration: 0.4 }, 0.55)
      .to(bag.rotation, { x: 0.15, y: -0.25, z: -1.95, duration: 1.15, ease: 'power2.inOut' }, 0.75)
      .to(bag.position, { x: -1.3, y: 0.35, duration: 1.15, ease: 'power2.inOut' }, 0.75)
      .call(() => setPhase('spilling'), [], 1.45)
      .call(() => setPhase('falling'), [], 4.3)
  }, [phase, setPhase])

  // FALL: one bean leaves the bag and drops into the page
  useEffect(() => {
    if (phase !== 'falling' || ran.current.fall) return
    ran.current.fall = true
    const bean = beanRef.current!
    const mouth = mouthRef.current!
    const p = new THREE.Vector3()
    mouth.getWorldPosition(p)
    bean.position.copy(p)
    bean.scale.setScalar(0.12)
    bean.rotation.set(0.4, 0, -1)
    bean.visible = true

    const tl = gsap.timeline()
    // pops up out of the bag
    tl.to(bean.position, { x: p.x + 0.9, y: p.y + 1.4, z: 0.6, duration: 0.7, ease: 'power2.out' }, 0)
      .to(bean.rotation, { x: 3.5, z: 1.2, duration: 2.2, ease: 'none' }, 0)
      // then falls toward us, growing to fill the frame
      .to(bean.position, { x: 0, y: 0.15, z: 4.6, duration: 1.2, ease: 'power3.in' }, 0.7)
      .to(bean.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 1.2, ease: 'power3.in' }, 0.7)
      .to(camera.position, { y: 0.4, duration: 1.2, ease: 'power2.in' }, 0.7)
      .call(() => onCover(), [], 1.55)
  }, [phase, camera, onCover])

  useEffect(() => {
    if (phase === 'ritual' && beanRef.current) beanRef.current.visible = false
  }, [phase])

  // ENTERED: bean settles on the right of the hero
  useEffect(() => {
    if (phase !== 'entered') return
    const bean = beanRef.current!
    bean.visible = true
    const wide = (size.width >= 900 && size.width / size.height >= 1.05)
    bean.position.set(wide ? 1.9 : 0, wide ? 0 : 0.85, 0)
    bean.scale.setScalar(wide ? 1.35 : 0.85)
    bean.rotation.set(0.2, -0.6, 0.35)
    camera.position.set(0, 0, 6.5)
    camera.lookAt(0, 0, 0)
    bean.position.y += 3
    gsap.from(bean.rotation, { x: -2, duration: 1.6, ease: 'expo.out' })
  }, [phase, camera, size.width])

  useFrame((state, dt) => {
    if (phase === 'ritual') _c.set(COLORS.mint)
    else if (phase !== 'entered') _c.set(COLORS.cream)
    else _c.set(journey.bg)
    bg.current.lerp(_c, 1 - Math.exp(-dt * 6))
    state.scene.background = bg.current
    if (phase !== 'falling' && phase !== 'entered') camera.lookAt(0, lookY, 0)
    if (phase === 'entered' && beanRef.current) {
      const b = beanRef.current
      const wide = (size.width >= 900 && size.width / size.height >= 1.05)
      const baseX = wide ? 1.9 : 0
      const baseY = wide ? 0 : 0.85
      const baseS = wide ? 1.35 : 0.85
      // the hero bean scrolls up with the hero
      const worldH = 2 * Math.tan((38 * Math.PI) / 360) * 6.5
      let tx = baseX
      let ty = baseY + Math.sin(state.clock.elapsedTime * 1.2) * 0.05 + journey.heroY * worldH
      let ts = baseS
      let spin = 0.25
      let jitter = 0
      if (journey.brew) ts = 0.0001
      else if (journey.active) {
        tx = baseX
        ty = baseY + 0.05
        const f = journey.progress * (STOPS.length - 1)
        const roastT = journey.local[4] ?? 0
        if (f < 3.35) ts = 0.0001 // the bean leaves; the story goes back to the seed
        else if (f < 4.6) {
          ts = baseS * 0.62
          tx = baseX + (4 - f) * worldH * (size.width / size.height)
          // the roast: spins faster as heat climbs, jolts at first crack
          spin = 0.25 + roastT * 2.4
          const cracked = roastT >= 0.926
          if (cracked && crackAt.current === null) crackAt.current = state.clock.elapsedTime
          if (!cracked) crackAt.current = null
          if (crackAt.current !== null) jitter = Math.exp(-(state.clock.elapsedTime - crackAt.current) * 5) * 0.12
        } else ts = 0.0001 // the cup: a 2D bean takes over and falls into the mug
      } else if (journey.progress > 0.98) ts = 0.0001
      // a tap makes the bean jump, spin and crackle
      const since = performance.now() / 1000 - pokeAt.current
      if (since < 1.2) {
        const k = Math.exp(-since * 4)
        spin += 14 * k
        jitter = Math.max(jitter, 0.08 * k)
        ty += Math.sin(Math.min(1, since / 0.45) * Math.PI) * 0.35
      }
      b.rotation.y += dt * spin
      b.rotation.x = THREE.MathUtils.damp(b.rotation.x, 0.2 + pointer.y * 0.4, 2, dt)
      b.rotation.z = THREE.MathUtils.damp(b.rotation.z, 0.35 - pointer.x * 0.4, 2, dt)
      b.position.x = THREE.MathUtils.damp(b.position.x, tx, 8, dt) + (Math.random() - 0.5) * jitter
      b.position.y = THREE.MathUtils.damp(b.position.y, ty, 8, dt) + (Math.random() - 0.5) * jitter
      b.scale.setScalar(THREE.MathUtils.damp(b.scale.x, ts, 7, dt))
    }
  })

  const intro = phase !== 'entered' && phase !== 'ritual'

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.5} position={[0, 5, -3]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer form="ring" color="#ffd9a8" intensity={1.5} position={[4, 2, 4]} scale={2} />
      </Environment>

      {intro && (
        <>
          <Bag phase={phase} bagRef={bagRef} stripRef={stripRef} mouthRef={mouthRef} pouchRef={pouchRef} onOpenRequest={onOpenRequest} />
          <Physics gravity={[0, -9.81, 0]} paused={phase === 'loading' || phase === 'gate'}>
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[20, 0.5, 20]} position={[0, FLOOR_Y - 0.5, 0]} />
            </RigidBody>
            <Beans count={beanCount} active={phase === 'spilling' || phase === 'falling'} mouth={mouthRef} />
          </Physics>
          <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, 0]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <shadowMaterial opacity={0.2} />
          </mesh>
        </>
      )}
      <HeroBean beanRef={beanRef} onPoke={poke} live={phase === 'entered'} />
      {phase === 'entered' && <Exhibits3D />}
    </>
  )
}

export default function Experience(props: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1.1, 7], fov: 38 }}
      gl={{ antialias: true }}
      style={{ position: 'fixed', inset: 0 }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
    >
      <Suspense fallback={null}>
        <Director {...props} />
      </Suspense>
    </Canvas>
  )
}
