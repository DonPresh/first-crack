'use client'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent, type ThreeElements } from '@react-three/fiber'
import { journey } from '@/lib/journey'
import { hoverCursor, clearCursors } from '@/lib/cursor'
import { useEffect } from 'react'
import { createBeanGeometry, createBeanMaterial } from '@/lib/bean'

/* The journey's exhibits, in 3D, each standing on a museum plinth under one moving spotlight.
   Exhibit i sits where stop i's panel is on the horizontal track. */

const ss = (v: number, a: number, b: number) => {
  const x = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return x * x * (3 - 2 * x)
}
const PLINTH_TOP = -1.0
const TILT = 0.32 // the whole exhibit leans toward us so we see a little from above

const emit = (name: string, detail: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }))
let uid = 0
function useHoverable(c = 'pointer') {
  const key = useMemo(() => 'h' + uid++, [])
  return { onPointerOver: () => hoverCursor(key, c), onPointerOut: () => hoverCursor(key, null) }
}

/* drag sideways to turn an exhibit; it keeps spinning a little, then settles */
function Spin({ children, y = 0 }: { children: React.ReactNode; y?: number }) {
  const key = useMemo(() => 'spin' + uid++, [])
  const g = useRef<THREE.Group>(null)
  const drag = useRef<{ x: number; id: number } | null>(null)
  const vel = useRef(0)
  const hover = useRef(false)
  useFrame((_, dt) => {
    if (!g.current) return
    if (!drag.current) {
      g.current.rotation.y += vel.current * dt
      vel.current = THREE.MathUtils.damp(vel.current, 0, 2.2, dt)
    }
    const s = THREE.MathUtils.damp(g.current.scale.x, hover.current || drag.current ? 1.04 : 1, 8, dt)
    g.current.scale.setScalar(s)
  })
  return (
    <group
      ref={g}
      position={[0, y, 0]}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, id: e.pointerId }
        vel.current = 0
        ;(e.target as Element)?.setPointerCapture?.(e.pointerId)
        hoverCursor(key + 'd', 'grabbing')
      }}
      onPointerMove={(e) => {
        if (!drag.current || !g.current) return
        const dx = e.clientX - drag.current.x
        drag.current.x = e.clientX
        g.current.rotation.y += dx * 0.012
        vel.current = dx * 0.012 * 60
      }}
      onPointerUp={(e) => {
        drag.current = null
        ;(e.target as Element)?.releasePointerCapture?.(e.pointerId)
        hoverCursor(key + 'd', null)
      }}
      onPointerOver={() => {
        hover.current = true
        hoverCursor(key, 'grab')
      }}
      onPointerOut={() => {
        hover.current = false
        hoverCursor(key, null)
      }}
    >
      {children}
    </group>
  )
}

function useMaterials() {
  return useMemo(() => {
    const cherry = new THREE.MeshPhysicalMaterial({ color: '#9e1028', roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new THREE.Color('#ff7a8a'), side: THREE.DoubleSide })
    const unripe = new THREE.MeshPhysicalMaterial({ color: '#7d9a45', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 })
    const yellow = new THREE.MeshPhysicalMaterial({ color: '#d9a32b', roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.2 })
    const pulp = new THREE.MeshPhysicalMaterial({ color: '#f1cf98', roughness: 0.45, transmission: 0.15, thickness: 0.3, side: THREE.DoubleSide })
    const seed = new THREE.MeshPhysicalMaterial({ color: '#b5bf8a', roughness: 0.62, sheen: 0.3, sheenColor: new THREE.Color('#e7edc9') })
    const leaf = new THREE.MeshPhysicalMaterial({ color: '#2f5a3c', roughness: 0.5, clearcoat: 0.6, side: THREE.DoubleSide })
    const wood = new THREE.MeshStandardMaterial({ color: '#5b3a24', roughness: 0.85 })
    const basket = new THREE.MeshStandardMaterial({ color: '#9a6a38', roughness: 0.95, side: THREE.DoubleSide })
    const plinth = new THREE.MeshStandardMaterial({ color: '#efe9df', roughness: 0.92 })
    const ceramic = new THREE.MeshPhysicalMaterial({ color: '#6E1F2F', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide })
    const coffee = new THREE.MeshPhysicalMaterial({ color: '#2b120a', roughness: 0.12, clearcoat: 1 })
    const crema = new THREE.MeshStandardMaterial({ color: '#b37a45', roughness: 0.6 })
    const bed = new THREE.MeshStandardMaterial({ color: '#c8a46a', roughness: 0.95 })
    return { cherry, unripe, yellow, pulp, seed, leaf, wood, basket, plinth, ceramic, coffee, crema, bed }
  }, [])
}

function Plinth({ m, h }: { m: ReturnType<typeof useMaterials>; h: number }) {
  return (
    <mesh position={[0, PLINTH_TOP - h / 2, 0]} receiveShadow castShadow material={m.plinth}>
      <boxGeometry args={[1.9, h, 1.4]} />
    </mesh>
  )
}

function Leaf({ m, ...p }: { m: ReturnType<typeof useMaterials> } & ThreeElements['mesh']) {
  return (
    <mesh {...p} material={m.leaf} castShadow scale={[0.42, 0.03, 0.16]}>
      <sphereGeometry args={[1, 24, 12]} />
    </mesh>
  )
}

function Seed({ m, geo, ...p }: { m: ReturnType<typeof useMaterials>; geo: THREE.BufferGeometry } & ThreeElements['mesh']) {
  return <mesh {...p} geometry={geo} material={m.seed} castShadow />
}

/* 01 · cherry that splits to show two seeds */
function Cherry({ t, m, seedGeo }: { t: number; m: ReturnType<typeof useMaterials>; seedGeo: THREE.BufferGeometry }) {
  const hov2 = useHoverable()
  const [tapped, setTapped] = useState(false)
  const L = useRef<THREE.Group>(null)
  const R = useRef<THREE.Group>(null)
  const S = useRef<THREE.Group>(null)
  const open = useRef(0)
  useFrame((st, dt) => {
    const auto = ss(t, 0.35, 0.85)
    const target = tapped ? 1 - auto : auto
    open.current = THREE.MathUtils.damp(open.current, target, 5, dt)
    const o = open.current
    if (L.current) {
      L.current.position.x = -o * 0.62
      L.current.rotation.y = -o * 0.75
    }
    if (R.current) {
      R.current.position.x = o * 0.62
      R.current.rotation.y = o * 0.75
    }
    if (S.current) {
      S.current.position.y = o * 0.08
      S.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.6) * 0.3 * o
    }
  })
  const r = 0.55
  return (
    <group position={[0, PLINTH_TOP + r + 0.02, 0]} onClick={(e) => (e.stopPropagation(), e.delta < 6 && setTapped((v) => !v))} {...hov2}>
      {/* halves: each a half shell + a pulp cap on its cut face */}
      <group ref={L}>
        <mesh material={m.cherry} castShadow>
          <sphereGeometry args={[r, 64, 48, -Math.PI / 2, Math.PI]} />
        </mesh>
        <mesh material={m.pulp} rotation={[0, Math.PI / 2, 0]} position={[0.001, 0, 0]}>
          <circleGeometry args={[r * 0.97, 48]} />
        </mesh>
      </group>
      <group ref={R}>
        <mesh material={m.cherry} castShadow>
          <sphereGeometry args={[r, 64, 48, Math.PI / 2, Math.PI]} />
        </mesh>
        <mesh material={m.pulp} rotation={[0, -Math.PI / 2, 0]} position={[-0.001, 0, 0]}>
          <circleGeometry args={[r * 0.97, 48]} />
        </mesh>
        {/* the calyx nub */}
        <mesh position={[0.08, -r + 0.02, 0.05]} material={m.wood}>
          <sphereGeometry args={[0.05, 12, 8]} />
        </mesh>
      </group>
      {/* two seeds, flat sides touching */}
      <group ref={S}>
        <Seed m={m} geo={seedGeo} position={[-0.115, 0, 0]} rotation={[0, Math.PI / 2, 0.08]} scale={0.27} />
        <Seed m={m} geo={seedGeo} position={[0.115, 0, 0]} rotation={[0, -Math.PI / 2, -0.08]} scale={0.27} />
      </group>
      {/* stem + leaves */}
      <mesh position={[0, r + 0.12, 0]} rotation={[0, 0, 0.25]} material={m.wood}>
        <cylinderGeometry args={[0.025, 0.035, 0.3, 10]} />
      </mesh>
      <Leaf m={m} position={[-0.35, r + 0.24, -0.05]} rotation={[0.3, 0.4, 0.5]} />
      <Leaf m={m} position={[0.38, r + 0.22, -0.1]} rotation={[-0.2, -0.5, -0.45]} />
    </group>
  )
}

/* 02 · a branch of cherries; pick the ripe ones into the basket */
const ON_BRANCH = [
  { x: -1.0, c: 'cherry' },
  { x: -0.72, c: 'unripe' },
  { x: -0.45, c: 'cherry' },
  { x: -0.2, c: 'yellow' },
  { x: 0.05, c: 'cherry' },
  { x: 0.3, c: 'unripe' },
  { x: 0.55, c: 'cherry' },
  { x: 0.8, c: 'yellow' },
  { x: 1.02, c: 'cherry' },
] as const
function Picking({ m }: { m: ReturnType<typeof useMaterials> }) {
  const [picked, setPickedState] = useState<number[]>(() => journey.picked)
  const setPicked = (v: number[]) => {
    journey.picked = v
    setPickedState(v)
  }
  const nope = useRef<{ i: number; at: number } | null>(null)
  const refs = useRef<(THREE.Group | null)[]>([])
  const branchY = 0.5
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([new THREE.Vector3(-1.15, branchY + 0.08, -0.2), new THREE.Vector3(-0.4, branchY - 0.04, 0), new THREE.Vector3(0.4, branchY + 0.04, 0), new THREE.Vector3(1.15, branchY - 0.06, -0.2)]),
    [],
  )
  const basketGeo = useMemo(() => {
    const pts = [0, 0.05, 0.1, 0.15, 0.2, 0.25].map((y, i) => new THREE.Vector2(0.38 + i * 0.05, y * 1.4))
    pts.unshift(new THREE.Vector2(0, 0))
    return new THREE.LatheGeometry(pts, 40)
  }, [])
  const hang = (i: number) => {
    const p = curve.getPoint((ON_BRANCH[i].x * 0.95 + 1.15) / 2.3)
    return new THREE.Vector3(p.x, p.y - 0.2 - (i % 2) * 0.06, p.z + 0.05)
  }
  const basketSpot = (k: number) => new THREE.Vector3(-0.2 + (k % 3) * 0.2, PLINTH_TOP + 0.22 + Math.floor(k / 3) * 0.12, 0.05 * (k % 2))
  const hov = useRef(-1)
  useFrame((st, dt) => {
    refs.current.forEach((g, i) => {
      if (!g) return
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, hov.current === i && !picked.includes(i) ? 1.22 : 1, 10, dt))
      const k = picked.indexOf(i)
      const home = hang(i)
      const dest = k >= 0 ? basketSpot(k) : home
      g.position.x = THREE.MathUtils.damp(g.position.x, dest.x, 4, dt)
      g.position.y = THREE.MathUtils.damp(g.position.y, dest.y, 4, dt)
      g.position.z = THREE.MathUtils.damp(g.position.z, dest.z, 4, dt)
      const n = nope.current
      if (n && n.at < 0) n.at = st.clock.elapsedTime
      g.rotation.z = n && n.i === i && st.clock.elapsedTime - n.at < 0.6 ? Math.sin((st.clock.elapsedTime - n.at) * 40) * 0.25 : Math.sin(st.clock.elapsedTime * 1.2 + i) * 0.04
    })
  })
  const tap = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    if (picked.includes(i)) return // let the tap fall through to the cherry behind
    e.stopPropagation()
    if (ON_BRANCH[i].c === 'cherry') {
      const next = [...picked, i]
      setPicked(next)
      emit('fc-picked', next.length)
    } else {
      nope.current = { i, at: -1 }
      emit('fc-nope', i)
    }
  }
  return (
    <group>
      <mesh material={m.wood} castShadow>
        <tubeGeometry args={[curve, 64, 0.035, 8, false]} />
      </mesh>
      {[-0.95, -0.45, 0.1, 0.6, 1.0].map((x, i) => (
        <Leaf key={x} m={m} position={[x, branchY + 0.12, -0.1]} rotation={[0.4, i % 2 ? 0.6 : -0.6, i % 2 ? 0.5 : -0.5]} />
      ))}
      {ON_BRANCH.map((b, i) => (
        <group
          key={i}
          ref={(el) => {
            if (el && !el.userData.placed) (el.userData.placed = true), el.position.copy(picked.includes(i) ? basketSpot(picked.indexOf(i)) : hang(i))
            refs.current[i] = el
          }}
          onClick={tap(i)}
          onPointerOver={(e) => {
            e.stopPropagation()
            hov.current = i
            hoverCursor('pick' + i, picked.includes(i) ? null : 'pointer')
          }}
          onPointerOut={() => {
            if (hov.current === i) hov.current = -1
            hoverCursor('pick' + i, null)
          }}
        >
          {!picked.includes(i) && (
            <mesh position={[0, 0.13, 0]} material={m.wood}>
              <cylinderGeometry args={[0.008, 0.01, 0.16, 6]} />
            </mesh>
          )}
          <mesh material={m[b.c]} castShadow>
            <sphereGeometry args={[0.115, 32, 24]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={basketGeo} material={m.basket} position={[0, PLINTH_TOP + 0.01, 0]} castShadow receiveShadow />
    </group>
  )
}

/* 03 · the cherry peeled layer by layer */
function Process({ t, m, seedGeo }: { t: number; m: ReturnType<typeof useMaterials>; seedGeo: THREE.BufferGeometry }) {
  const hov2 = useHoverable()
  const layers = useMemo(
    () => [
      { r: 0.62, mat: m.cherry.clone() },
      { r: 0.55, mat: m.pulp.clone() },
      { r: 0.47, mat: new THREE.MeshPhysicalMaterial({ color: '#f6dfae', roughness: 0.2, transmission: 0.5, thickness: 0.4 }) },
      { r: 0.4, mat: new THREE.MeshStandardMaterial({ color: '#efe6d0', roughness: 0.95 }) },
      { r: 0.36, mat: new THREE.MeshStandardMaterial({ color: '#dcd5c0', roughness: 0.7 }) },
    ],
    [m],
  )
  const G = useRef<THREE.Group>(null)
  const [peeled, setPeeledState] = useState(() => journey.peeled)
  const setPeeled = (n: number) => {
    journey.peeled = n
    setPeeledState(n)
  }
  const peelP = useRef(layers.map(() => 0))
  useFrame((st, dt) => {
    if (G.current) G.current.rotation.y = st.clock.elapsedTime * 0.25
    peelP.current = peelP.current.map((v, k) => THREE.MathUtils.damp(v, k < peeled ? 1 : 0, 6, dt))
  })
  const peel = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 6) return
    const next = peeled >= layers.length ? 0 : peeled + 1
    setPeeled(next)
    emit('fc-peel', next)
  }
  return (
    <group position={[0, PLINTH_TOP + 0.64, 0]} ref={G} onClick={peel} {...hov2}>
      {layers.map((l, k) => {
        const p = Math.max(ss(t, 0.12 + k * 0.13, 0.28 + k * 0.13), peelP.current[k])
        l.mat.transparent = true
        l.mat.opacity = 1 - p
        l.mat.depthWrite = p < 0.5
        return (
          <mesh key={k} material={l.mat} scale={1 + p * 0.5} visible={p < 0.99} castShadow={p < 0.3}>
            <sphereGeometry args={[l.r, 48, 32]} />
          </mesh>
        )
      })}
      <Seed m={m} geo={seedGeo} position={[-0.11, 0, 0]} rotation={[0, Math.PI / 2, 0.1]} scale={0.27} />
      <Seed m={m} geo={seedGeo} position={[0.11, 0, 0]} rotation={[0, -Math.PI / 2, -0.1]} scale={0.27} />
    </group>
  )
}

/* 04 · a raised drying bed; drag across it to rake */
const BED = Array.from({ length: 48 }, (_, i) => ({ x: -0.72 + (i % 8) * 0.205 + ((i * 37) % 9) * 0.006, z: -0.3 + Math.floor(i / 8) * 0.12 + ((i * 53) % 7) * 0.005 }))
function Drying({ t, m }: { t: number; m: ReturnType<typeof useMaterials> }) {
  const hovGrab = useHoverable('grab')
  const inst = useRef<THREE.InstancedMesh>(null)
  const rot = useRef(BED.map(() => new THREE.Euler(Math.random(), Math.random(), Math.random())))
  const hop = useRef(BED.map(() => 0))
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const red = useMemo(() => new THREE.Color('#9e1028'), [])
  const raisin = useMemo(() => new THREE.Color('#3a1219'), [])
  const tmp = useMemo(() => new THREE.Color(), [])
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.7 }), [])
  const bedY = PLINTH_TOP + 0.42
  useFrame((_, dt) => {
    const im = inst.current
    if (!im) return
    const k = ss(t, 0.05, 0.9)
    const s = 1 - t * 0.3
    BED.forEach((c, i) => {
      hop.current[i] = THREE.MathUtils.damp(hop.current[i], 0, 7, dt)
      dummy.position.set(c.x, bedY + 0.06 + hop.current[i] * 0.07, c.z)
      dummy.rotation.copy(rot.current[i])
      dummy.scale.set(s, s * (1 - k * 0.15), s)
      dummy.updateMatrix()
      im.setMatrixAt(i, dummy.matrix)
      im.setColorAt(i, tmp.copy(red).lerp(raisin, k))
    })
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    mat.roughness = 0.35 + k * 0.4
    mat.clearcoat = 0.7 * (1 - k)
  })
  const rake = (e: ThreeEvent<PointerEvent>) => {
    const p = e.object.worldToLocal(e.point.clone())
    BED.forEach((c, i) => {
      if (Math.hypot(c.x - p.x, c.z - p.z) < 0.16) {
        rot.current[i].x += 0.5
        rot.current[i].z += 0.3
        hop.current[i] = 1
      }
    })
  }
  return (
    <group>
      {/* the bed: a mesh tray on four legs */}
      <mesh position={[0, bedY, 0]} material={m.bed} receiveShadow onPointerMove={rake} onClick={(e) => (rake(e as unknown as ThreeEvent<PointerEvent>), rake(e as unknown as ThreeEvent<PointerEvent>))} {...hovGrab}>
        <boxGeometry args={[1.8, 0.04, 0.8]} />
      </mesh>
      {[-0.4, 0.4].map((z) => (
        <mesh key={z} position={[0, bedY + 0.04, z]} material={m.wood}>
          <boxGeometry args={[1.86, 0.06, 0.05]} />
        </mesh>
      ))}
      {[-0.86, 0.86].map((x) => (
        <mesh key={x} position={[x, bedY + 0.04, 0]} material={m.wood}>
          <boxGeometry args={[0.05, 0.06, 0.86]} />
        </mesh>
      ))}
      {[
        [-0.82, -0.36],
        [0.82, -0.36],
        [-0.82, 0.36],
        [0.82, 0.36],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, (bedY + PLINTH_TOP) / 2, z]} material={m.wood} castShadow>
          <boxGeometry args={[0.05, bedY - PLINTH_TOP, 0.05]} />
        </mesh>
      ))}
      <instancedMesh ref={inst} args={[undefined, mat, BED.length]} castShadow>
        <sphereGeometry args={[0.07, 20, 14]} />
      </instancedMesh>
    </group>
  )
}

/* 06 · a ceramic mug: a bean drops in, it splashes, the mug fills */
function CupExhibit({ t, m, beanGeo, beanMat }: { t: number; m: ReturnType<typeof useMaterials>; beanGeo: THREE.BufferGeometry; beanMat: THREE.Material }) {
  const hov2 = useHoverable()
  const clock = useThree((s) => s.clock)
  const T_HIT = 0.42
  const mugGeo = useMemo(() => {
    const H = 0.78
    const R = 0.42
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(R - 0.06, 0),
      new THREE.Vector2(R, 0.06),
      new THREE.Vector2(R, H),
      new THREE.Vector2(R - 0.035, H + 0.01),
      new THREE.Vector2(R - 0.045, H - 0.02),
      new THREE.Vector2(R - 0.045, 0.1),
      new THREE.Vector2(0, 0.08),
    ]
    return new THREE.LatheGeometry(pts, 64)
  }, [])
  const logo = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 256
    const g = c.getContext('2d')!
    g.strokeStyle = '#BCDDC4'
    g.lineWidth = 16
    g.beginPath()
    g.arc(128, 128, 90, 0, Math.PI * 2)
    g.stroke()
    g.save()
    g.translate(128, 128)
    g.rotate(-0.5)
    g.fillStyle = '#BCDDC4'
    g.beginPath()
    g.ellipse(0, 0, 38, 56, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#6E1F2F'
    g.lineWidth = 10
    g.beginPath()
    g.moveTo(0, -46)
    g.bezierCurveTo(-18, -14, 18, 14, 0, 46)
    g.stroke()
    g.restore()
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.3 })
  }, [])
  const bean = useRef<THREE.Mesh>(null)
  const bean2 = useRef<THREE.Mesh>(null)
  const dropAt = useRef(-10)
  const ripples = useRef<(THREE.Mesh | null)[]>([])
  const fall = ss(t, 0.05, T_HIT)
  const after = Math.min(1, Math.max(0, (t - T_HIT) / (1 - T_HIT)))
  const fill = 0.14 + ss(after, 0.05, 0.6) * 0.78
  const base = PLINTH_TOP + 0.01
  const surfY = base + 0.1 + fill * 0.62
  useFrame((st) => {
    if (bean.current) {
      const y0 = base + 2.2
      const y = after > 0 ? surfY - after * 0.6 : y0 + (surfY - y0) * fall
      bean.current.position.set((1 - fall) * 0.25, y, 0)
      bean.current.rotation.set(fall * 6, fall * 3, 0)
      bean.current.visible = after < 0.3
    }
    // tap the mug: another bean drops in
    const since = st.clock.elapsedTime - dropAt.current
    const fallT = Math.min(1, since / 0.55)
    if (bean2.current) {
      const y0 = base + 2.0
      bean2.current.visible = since < 0.75
      bean2.current.position.set(0.05, since < 0.55 ? y0 + (surfY - y0) * fallT * fallT : surfY - (since - 0.55) * 0.4, 0)
      bean2.current.rotation.set(since * 9, since * 4, 0)
    }
    const splash = since > 0.55 ? (since - 0.55) / 1.1 : -1
    ripples.current.forEach((r, k) => {
      if (!r) return
      const pScroll = Math.min(1, Math.max(0, (after - k * 0.08) / 0.5))
      const pTap = splash >= 0 ? Math.min(1, Math.max(0, (splash - k * 0.12) / 0.6)) : 1
      const useTap = splash >= 0 && splash < 1
      const p = useTap ? pTap : pScroll
      r.visible = useTap ? p < 1 : after > 0 && p < 1
      r.scale.setScalar(0.05 + p * 0.33)
      ;(r.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - p)
      r.position.y = surfY + 0.004
    })
  })
  const drop = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 6) return
    dropAt.current = clock.elapsedTime
    emit('fc-drop', 1)
  }
  return (
    <group position={[0, 0.34, 0]} scale={1.35} onClick={drop} {...hov2}>
      <mesh geometry={mugGeo} material={m.ceramic} position={[0, base, 0]} castShadow receiveShadow />
      {/* handle */}
      <mesh material={m.ceramic} position={[0.4, base + 0.42, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <torusGeometry args={[0.19, 0.048, 20, 40, Math.PI]} />
      </mesh>
      {/* bean logo on the front */}
      <mesh position={[0, base + 0.4, 0.426]} material={logo}>
        <planeGeometry args={[0.32, 0.32]} />
      </mesh>
      {/* coffee + crema */}
      <mesh position={[0, surfY, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.coffee}>
        <circleGeometry args={[0.37, 48]} />
      </mesh>
      <mesh position={[0, surfY + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.crema}>
        <ringGeometry args={[0.3, 0.372, 48]} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} ref={(el) => (ripples.current[k] = el)} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 1, 48]} />
          <meshBasicMaterial color="#e6be8c" transparent />
        </mesh>
      ))}
      <mesh ref={bean} geometry={beanGeo} material={beanMat} scale={0.12} castShadow />
      <mesh ref={bean2} geometry={beanGeo} material={beanMat} scale={0.12} visible={false} castShadow />
    </group>
  )
}

export function Exhibits3D() {
  const m = useMaterials()
  const beanGeo = useMemo(() => createBeanGeometry(64), [])
  const beanMat = useMemo(() => createBeanMaterial(true), [])
  const seedGeo = useMemo(() => createBeanGeometry(48), [])
  const { size } = useThree()
  const groups = useRef<(THREE.Group | null)[]>([])
  const spot = useRef<THREE.SpotLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const [, force] = useState(0)
  const tick = useRef(0)

  useFrame((_, dt) => {
    const wide = (size.width >= 900 && size.width / size.height >= 1.05)
    const worldH = 2 * Math.tan((38 * Math.PI) / 360) * 6.5
    const worldW = worldH * (size.width / size.height)
    const baseX = wide ? 1.9 : 0
    // phones: exhibits sit in the top band, sized to the screen, clear of the wall text
    const baseY = wide ? 0 : worldH * 0.17
    const ms = Math.min(0.62, (worldW * 0.8) / 2.7)
    const f = journey.progress * 5
    const on = journey.active
    groups.current.forEach((g, i) => {
      if (!g) return
      g.visible = on && Math.abs(i - f) < 1.25
      g.position.set(baseX + (i - f) * worldW, baseY, 0)
      g.rotation.x = TILT
      g.scale.setScalar(wide ? 1 : ms)
    })
    if (spot.current) {
      spot.current.visible = on
      target.position.set(baseX, baseY - 0.4, 0)
      spot.current.position.set(baseX + 0.4, baseY + 4.2, 3)
    }
    // re-render scenes at ~30fps so scroll-driven props stay current
    tick.current += dt
    if (tick.current > 1 / 30 && on) {
      tick.current = 0
      force((n) => (n + 1) % 1e6)
    }
  })

  const wasOn = useRef(false)
  useFrame(() => {
    if (wasOn.current && !journey.active) clearCursors()
    wasOn.current = journey.active
  })
  useEffect(() => () => clearCursors(), [])
  const L = journey.local
  return (
    <>
      <primitive object={target} />
      <spotLight ref={spot} target={target} intensity={60} angle={0.42} penumbra={0.75} decay={1.6} distance={14} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <group key={i} ref={(el) => (groups.current[i] = el)} visible={false}>
          <Plinth m={m} h={(size.width >= 900 && size.width / size.height >= 1.05) ? 3.2 : 0.35} />
          {i === 0 && (
            <Spin>
              <Cherry t={L[0] ?? 0} m={m} seedGeo={seedGeo} />
            </Spin>
          )}
          {i === 1 && <Picking m={m} />}
          {i === 2 && (
            <Spin>
              <Process t={L[2] ?? 0} m={m} seedGeo={seedGeo} />
            </Spin>
          )}
          {i === 3 && <Drying t={L[3] ?? 0} m={m} />}
          {i === 5 && (
            <Spin>
              <CupExhibit t={L[5] ?? 0} m={m} beanGeo={beanGeo} beanMat={beanMat} />
            </Spin>
          )}
        </group>
      ))}
    </>
  )
}
