'use client'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { createBeanGeometry, createBeanMaterial } from '@/lib/bean'

type Props = {
  count: number
  active: boolean
  mouth: React.RefObject<THREE.Object3D | null>
}

const RATE = 0.011 // seconds between beans
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _dir = new THREE.Vector3()

export function Beans({ count, active, mouth }: Props) {
  const geo = useMemo(() => createBeanGeometry(18), [])
  const mat = useMemo(() => createBeanMaterial(false), [])
  const bodies = useRef<RapierRigidBody[]>(null)
  const released = useRef(0)
  const start = useRef<number | null>(null)

  // parked far below the scene until released
  const instances = useMemo<InstancedRigidBodyProps[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const s = 0.1 + Math.random() * 0.025
        return {
          key: 'bean-' + i,
          position: [(i % 25) * 0.6 - 7, -60 - Math.floor(i / 25) * 0.6, 0],
          rotation: [Math.random() * 6, Math.random() * 6, Math.random() * 6],
          scale: [s, s, s],
        }
      }),
    [count],
  )

  useFrame((state) => {
    if (!active || !bodies.current || !mouth.current) return
    if (start.current === null) start.current = state.clock.elapsedTime
    const t = state.clock.elapsedTime - start.current
    const target = Math.min(count, Math.floor(t / RATE))
    if (released.current >= target) return

    mouth.current.getWorldPosition(_p)
    mouth.current.getWorldQuaternion(_q)
    _dir.set(0, 1, 0).applyQuaternion(_q)

    while (released.current < target) {
      const b = bodies.current[released.current]
      released.current++
      if (!b) continue
      const j = () => (Math.random() - 0.5) * 0.35
      b.setTranslation({ x: _p.x + j(), y: _p.y + j() * 0.5, z: _p.z + j() }, true)
      const sp = 2.2 + Math.random() * 1.6
      b.setLinvel({ x: _dir.x * sp + j() * 2, y: _dir.y * sp + 0.6, z: _dir.z * sp + j() * 3 + 0.6 }, true)
      b.setAngvel({ x: j() * 30, y: j() * 30, z: j() * 30 }, true)
      b.setGravityScale(1, true)
    }
  })

  return (
    <InstancedRigidBodies
      ref={bodies}
      instances={instances}
      colliders="hull"
      gravityScale={0}
      friction={0.9}
      restitution={0.25}
      linearDamping={0.15}
      angularDamping={0.4}
    >
      <instancedMesh args={[geo, mat, count]} castShadow receiveShadow frustumCulled={false} />
    </InstancedRigidBodies>
  )
}
