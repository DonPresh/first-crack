/** Shared, mutable scroll state for the journey (read every frame by the 3D scene). */
export const journey = {
  progress: 0, // horizontal position, 0..1 across all stops
  active: false,
  brew: false,
  section: '' as '' | 'collection' | 'brew' | 'booth',
  local: [] as number[], // per-stop scene progress 0..1
  heroX: 0,
  heroY: 0, // how far the hero has scrolled up, in screens
  bg: '#2A0A12', // page colour behind the 3D scene
  picked: [] as number[], // cherries picked in exhibit 02 (survives remounts)
  peeled: 0, // layers peeled by tapping in exhibit 03
}

export type Stop = {
  plate: string // museum wall label line
  no: string
  title: string
  body: string
  meta: string
  bg: string
  fg: string
  accent: string
}

export const STOPS: Stop[] = [
  {
    plate: 'COFFEA ARABICA · FRUIT, TWO SEEDS · GUJI, ETHIOPIA',
    no: '01',
    title: 'The cherry.',
    body: 'Every bean starts as a seed. Usually two of them, flat sides pressed together, inside a red coffee cherry on a hillside in Guji.',
    meta: 'ALT. 1,950–2,200 M',
    bg: '#6E1F2F',
    fg: '#F6EFE4',
    accent: '#BCDDC4',
  },
  {
    plate: 'HAND-PICKED CHERRIES · WOVEN BASKET · OCTOBER TO JANUARY',
    no: '02',
    title: 'The picking.',
    body: 'Only the ripest cherries are picked, by hand, a few at a time. The rest are left another week to blush.',
    meta: 'HARVEST · OCT–JAN',
    bg: '#BCDDC4',
    fg: '#2A0A12',
    accent: '#6E1F2F',
  },
  {
    plate: 'CROSS-SECTION · SKIN, PULP, MUCILAGE, PARCHMENT, SILVERSKIN',
    no: '03',
    title: 'The process.',
    body: 'Natural process: the whole cherry dries around its seed. The fruit soaks in, which is where the blueberry comes from.',
    meta: 'NATURAL',
    bg: '#F6EFE4',
    fg: '#2A0A12',
    accent: '#6E1F2F',
  },
  {
    plate: 'CHERRIES ON A RAISED BED · SUN · 24 DAYS',
    no: '04',
    title: 'The drying.',
    body: 'Weeks on raised beds under the sun, turned by hand, until the seed goes from soft green to pale gold.',
    meta: 'RAISED BEDS · 3–4 WEEKS',
    bg: '#E9C46A',
    fg: '#2A0A12',
    accent: '#6E1F2F',
  },
  {
    plate: 'ROASTED SEED · HEAT, STEAM, PRESSURE · 196°C',
    no: '05',
    title: 'The roast.',
    body: 'Heat climbs. The last water inside the bean turns to steam, pressure builds, and somewhere around 196°C it pops. First crack.',
    meta: '≈196°C',
    bg: '#2A0A12',
    fg: '#F6EFE4',
    accent: '#BCDDC4',
  },
  {
    plate: 'CERAMIC MUG · COFFEE · ONE MORNING',
    no: '06',
    title: 'The cup.',
    body: 'A year on the tree, weeks in the sun, twelve minutes in the roaster. All of it ends up here, in a few quiet minutes of your morning. Your turn to brew it.',
    meta: 'NEXT · THE BREW BAR',
    bg: '#BCDDC4',
    fg: '#2A0A12',
    accent: '#6E1F2F',
  },
]
