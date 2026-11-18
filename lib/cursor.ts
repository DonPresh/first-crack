/* One owner per hovered thing, so a pointer-out on one object never wipes the cursor another just set. */
const held = new Map<string, string>()
const RANK = ['grabbing', 'pointer', 'grab']
function apply() {
  const vals = [...held.values()]
  document.body.style.cursor = RANK.find((c) => vals.includes(c)) ?? ''
}
export function hoverCursor(key: string, c: string | null) {
  if (typeof document === 'undefined') return
  if (c) held.set(key, c)
  else held.delete(key)
  apply()
}
export function clearCursors() {
  held.clear()
  if (typeof document !== 'undefined') document.body.style.cursor = ''
}
