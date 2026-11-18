import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Procedural roasted coffee bean.
 * Long axis = Y, crease faces +Z. Unit length ~2 (y from -1 to 1).
 */
export function createBeanGeometry(detail = 64) {
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.75))
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  g = mergeVertices(g)

  const pos = g.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const uvs = new Float32Array(pos.count * 2)
  const v = new THREE.Vector3()

  const shell = new THREE.Color('#3f2012')
  const shellLight = new THREE.Color('#6a3a1e')
  const chaff = new THREE.Color('#b98a57')

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    uvs.set([Math.atan2(v.z, v.x) / (Math.PI * 2) + 0.5, v.y * 0.5 + 0.5], i * 2)
    const front = Math.max(0, v.z)
    let x = v.x * 0.68
    const y = v.y
    let z = v.z * 0.52

    // flatter face on the crease side
    if (z > 0) z *= 0.74

    // the S-shaped centre cut
    const wig = 0.075 * Math.sin(y * 3.6)
    const d = x - wig
    const w = 0.065
    const ends = 1 - Math.pow(Math.abs(y), 5)
    const crease = Math.exp(-(d * d) / (w * w)) * front * ends
    z -= crease * 0.42

    // tiny organic asymmetry
    x *= 1 + 0.05 * Math.sin(y * 2.2 + 0.6)

    pos.setXYZ(i, x, y, z)

    // colour: darker shell, warmer highlights on the ridges, pale chaff in the cut
    const ridge = Math.exp(-((Math.abs(d) - 0.16) ** 2) / 0.006) * front
    const c = shell.clone().lerp(shellLight, Math.min(1, ridge * 0.9 + 0.15 * Math.sin(x * 9 + y * 7) ** 2))
    // dark lips either side of the cut, pale chaff deep inside it
    const lip = Math.exp(-((Math.abs(d) - 0.07) ** 2) / 0.0012) * front * ends
    c.lerp(new THREE.Color('#2a140a'), Math.min(1, lip * 0.8))
    c.lerp(chaff, Math.min(1, Math.pow(crease, 2.2) * 0.9))
    colors.set([c.r, c.g, c.b], i * 3)
  }

  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

let noiseTex: THREE.CanvasTexture | null = null
function beanNoise() {
  if (noiseTex) return noiseTex
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(s, s)
  for (let i = 0; i < s * s; i++) {
    const n = 110 + Math.random() * 120
    img.data.set([n, n, n, 255], i * 4)
  }
  ctx.putImageData(img, 0, 0)
  noiseTex = new THREE.CanvasTexture(c)
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping
  noiseTex.repeat.set(3, 3)
  return noiseTex
}

export function createBeanMaterial(hero = false) {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: hero ? 0.5 : 0.55,
    clearcoat: hero ? 0.35 : 0.2, // a little roast oil
    clearcoatRoughness: 0.45,
    bumpMap: beanNoise(),
    bumpScale: hero ? 0.9 : 0.5,
    sheen: 0.3,
    sheenColor: new THREE.Color('#a0683a'),
  })
}
