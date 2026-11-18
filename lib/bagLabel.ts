import * as THREE from 'three'

const INK = '#15161A'
const WINE = '#6E1F2F'
const MINT = '#BCDDC4'
const CARD = '#F4EEE3'

/** Draws the First Crack bag front: wordmark + spec-sheet card. Canvas is 2:3 to match the bag. */
export async function drawBagFront(): Promise<THREE.CanvasTexture> {
  try {
    await Promise.all([
      document.fonts.load('700 120px "Familjen Grotesk"'),
      document.fonts.load('500 30px "JetBrains Mono"'),
      document.fonts.load('600 60px "Familjen Grotesk"'),
    ])
  } catch {}

  const W = 1024
  const H = 1536
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  ctx.fillStyle = MINT
  ctx.fillRect(0, 0, W, H)

  // zip ridges
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 6
  for (const y of [150, 172, 194]) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // bean-in-circle mark
  const mx = 140
  const my = 330
  ctx.strokeStyle = WINE
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.arc(mx, my, 58, 0, Math.PI * 2)
  ctx.stroke()
  ctx.save()
  ctx.translate(mx, my)
  ctx.rotate(-0.5)
  ctx.fillStyle = WINE
  ctx.beginPath()
  ctx.ellipse(0, 0, 24, 36, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = MINT
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(0, -30)
  ctx.bezierCurveTo(-10, -10, 10, 10, 0, 30)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = INK
  ctx.font = '500 26px "JetBrains Mono", monospace'
  ctx.textBaseline = 'top'
  ;['ROASTED IN', 'SMALL BATCHES', 'EST. 2026'].forEach((t, i) => ctx.fillText(t, 240, 290 + i * 34))
  ctx.textAlign = 'right'
  ;['MUSEUM', 'OF THE', 'BEAN'].forEach((t, i) => ctx.fillText(t, W - 80, 290 + i * 34))
  ctx.textAlign = 'left'

  // wordmark
  ctx.fillStyle = WINE
  ctx.font = '700 200px "Familjen Grotesk", sans-serif'
  ctx.fillText('FIRST', 70, 450)
  ctx.fillText('CRACK', 70, 630)

  // spec card
  const cx = 70
  const cy = 860
  const cw = W - 140
  const ch = 560
  ctx.fillStyle = CARD
  ctx.fillRect(cx, cy, cw, ch)
  drawRing(ctx, cx + cw - 120, cy + 60, 120)

  ctx.fillStyle = INK
  ctx.font = '600 64px "Familjen Grotesk", sans-serif'
  ctx.fillText('Guji, Ethiopia', cx + 40, cy + 34)
  ctx.font = '500 26px "JetBrains Mono", monospace'
  ctx.textAlign = 'right'
  ctx.fillText('No. 001', cx + cw - 40, cy + 54)
  ctx.textAlign = 'left'

  const rows: [string, string][] = [
    ['PROCESS', 'NATURAL'],
    ['ALTITUDE', '1,950–2,200 M'],
    ['ROAST', '●●○○○'],
    ['NOTES', 'BLUEBERRY · JASMINE · CACAO'],
  ]
  rows.forEach(([k, val], i) => {
    const y = cy + 160 + i * 84
    ctx.setLineDash([4, 8])
    ctx.strokeStyle = 'rgba(21,22,26,0.55)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx + 40, y + 56)
    ctx.lineTo(cx + cw - 40, y + 56)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillText(k, cx + 40, y + 14)
    ctx.textAlign = 'right'
    ctx.fillText(val, cx + cw - 40, y + 14)
    ctx.textAlign = 'left'
  })

  ctx.font = '500 26px "JetBrains Mono", monospace'
  ctx.fillText('WHOLE BEAN', 70, H - 86)
  ctx.textAlign = 'right'
  ctx.fillText('250 G', W - 70, H - 86)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** A dried coffee-cup ring, drawn as many jittered translucent strokes. */
function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < 90; i++) {
    const rr = r + (Math.random() - 0.5) * 10
    const a0 = Math.random() * Math.PI * 2
    const a1 = a0 + 0.4 + Math.random() * 1.6
    ctx.strokeStyle = `rgba(110, 60, 25, ${0.04 + Math.random() * 0.08})`
    ctx.lineWidth = 2 + Math.random() * 7
    ctx.beginPath()
    ctx.arc(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4, rr, a0, a1)
    ctx.stroke()
  }
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r)
  g.addColorStop(0, 'rgba(120, 70, 30, 0.02)')
  g.addColorStop(1, 'rgba(120, 70, 30, 0.08)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Box → soft pillow pouch with a heat-sealed top.
 *  Morph target 0 = the same pouch torn open: the seal parts into an oval mouth. */
export function createPouchGeometry(w = 2, h = 3, d = 0.9) {
  const g = new THREE.BoxGeometry(w, h, d, 40, 60, 12)
  const pos = g.attributes.position as THREE.BufferAttribute
  const open = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const nx = x / (w / 2)
    const ny = y / (h / 2)
    const base = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(nx), 6))) * (1 + 0.06 * Math.max(0, -ny) ** 2)
    const t = THREE.MathUtils.smoothstep(ny, 0.68, 0.96)
    const waist = 1 - 0.025 * Math.cos(ny * Math.PI)
    // sealed: depth squashed to almost nothing at the top
    const sealed = base * THREE.MathUtils.lerp(1, 0.05, t)
    // open: the mouth gapes, an oval that pinches toward the side seams
    const mouth = base * THREE.MathUtils.lerp(1, 0.7, t) * (0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - nx * nx)))
    pos.setXYZ(i, x * waist, y, z * Math.max(sealed, 0.04))
    open.set([x * waist * (1 + t * 0.03), y - t * 0.04, z * Math.max(mouth, 0.04)], i * 3)
  }
  g.computeVertexNormals()
  // normals for the open state
  const og = g.clone()
  og.setAttribute('position', new THREE.BufferAttribute(open, 3))
  og.computeVertexNormals()
  g.morphAttributes.position = [new THREE.BufferAttribute(open, 3)]
  g.morphAttributes.normal = [og.attributes.normal]
  return g
}
