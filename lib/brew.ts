export type LayerKind = 'espresso' | 'crema' | 'americano' | 'milk' | 'foam' | 'water'

export const LAYER_COLOR: Record<LayerKind, string> = {
  espresso: '#3a1b0e',
  crema: '#b37a45',
  americano: '#5a2e17',
  water: '#c9b49a',
  milk: '#efe1cc',
  foam: '#fbf6ee',
}

export type Anim = 'grind' | 'tamp' | 'pull' | 'water' | 'steam' | 'pour' | 'serve'

export type Step = {
  key: Anim
  title: string
  guide: string
  action: string
  ms: number
  /** glass layers shown once this step finishes */
  layers: [LayerKind, number][]
}

export type Drink = {
  id: string
  name: string
  short: string
  note: string
  final: [LayerKind, number][]
  steps: Step[]
}

const grind = (g: number): Step => ({
  key: 'grind',
  title: 'Grind',
  guide: `Weigh ${g}g of beans and grind fine, close to table salt. Grind right before you brew; ground coffee goes stale in minutes.`,
  action: 'Grind beans',
  ms: 2600,
  layers: [],
})
const tamp: Step = {
  key: 'tamp',
  title: 'Dose & tamp',
  guide: 'Level the grounds in the basket, then press straight down with firm, even pressure. A flat puck means an even shot.',
  action: 'Tamp & lock in',
  ms: 1600,
  layers: [],
}
const pull = (inG: number, outG: number, layers: [LayerKind, number][]): Step => ({
  key: 'pull',
  title: 'Pull the shot',
  guide: `Aim for about ${outG}g of espresso from ${inG}g of coffee in 25–30 seconds. Too fast tastes sour, too slow tastes bitter.`,
  action: 'Pull shot',
  ms: 5200,
  layers,
})
const steam = (ml: number, foam: 'thick' | 'silky' | 'light', layers: [LayerKind, number][]): Step => ({
  key: 'steam',
  title: 'Steam the milk',
  guide: `Steam ${ml}ml of cold milk to 55–65°C. ${
    foam === 'thick'
      ? 'Keep the tip near the surface longer for a thick, airy foam.'
      : foam === 'silky'
        ? 'Stretch briefly, then sink the wand for glossy microfoam.'
        : 'Just a little air: you only need a spoonful of foam.'
  }`,
  action: 'Steam milk',
  ms: 3800,
  layers,
})
const serve: Step = {
  key: 'serve',
  title: 'Serve',
  guide: 'Pick a mug. Drink it while it’s warm, and before anyone asks you for a sip.',
  action: 'Choose a mug',
  ms: 600,
  layers: [],
}

export const DRINKS: Drink[] = [
  {
    id: 'espresso',
    name: 'Espresso',
    short: 'ESP',
    note: '9g in · 18g out · 28s',
    final: [['espresso', 0.2], ['crema', 0.05]],
    steps: [grind(9), tamp, pull(9, 18, [['espresso', 0.2], ['crema', 0.05]]), serve],
  },
  {
    id: 'double',
    name: 'Double Espresso',
    short: 'DBL',
    note: '18g in · 36g out · 28s',
    final: [['espresso', 0.32], ['crema', 0.06]],
    steps: [grind(18), tamp, pull(18, 36, [['espresso', 0.32], ['crema', 0.06]]), serve],
  },
  {
    id: 'americano',
    name: 'Americano',
    short: 'AME',
    note: 'Double shot over 150ml hot water',
    final: [['americano', 0.7], ['crema', 0.04]],
    steps: [
      grind(18),
      tamp,
      {
        key: 'water',
        title: 'Hot water first',
        guide: 'Pour about 150ml of hot water (around 90°C) into the cup first. Pulling the shot on top keeps the crema.',
        action: 'Add hot water',
        ms: 2600,
        layers: [['water', 0.5]],
      },
      pull(18, 36, [['americano', 0.7], ['crema', 0.04]]),
      serve,
    ],
  },
  {
    id: 'cappuccino',
    name: 'Cappuccino',
    short: 'CAP',
    note: 'Double · steamed milk · thick foam',
    final: [['espresso', 0.24], ['milk', 0.3], ['foam', 0.3]],
    steps: [
      grind(18),
      tamp,
      pull(18, 36, [['espresso', 0.24], ['crema', 0.04]]),
      steam(120, 'thick', [['espresso', 0.24], ['milk', 0.3], ['foam', 0.3]]),
      serve,
    ],
  },
  {
    id: 'latte',
    name: 'Latte',
    short: 'LAT',
    note: 'Double · lots of milk · thin foam',
    final: [['espresso', 0.2], ['milk', 0.56], ['foam', 0.1]],
    steps: [
      grind(18),
      tamp,
      pull(18, 36, [['espresso', 0.2], ['crema', 0.04]]),
      steam(200, 'silky', [['espresso', 0.2], ['milk', 0.56], ['foam', 0.1]]),
      serve,
    ],
  },
  {
    id: 'flatwhite',
    name: 'Flat White',
    short: 'FW',
    note: 'Double · velvety microfoam',
    final: [['espresso', 0.26], ['milk', 0.44], ['foam', 0.05]],
    steps: [
      grind(18),
      tamp,
      pull(18, 36, [['espresso', 0.26], ['crema', 0.04]]),
      steam(110, 'silky', [['espresso', 0.26], ['milk', 0.44], ['foam', 0.05]]),
      serve,
    ],
  },
  {
    id: 'macchiato',
    name: 'Macchiato',
    short: 'MAC',
    note: 'Espresso · a spoon of foam',
    final: [['espresso', 0.22], ['foam', 0.09]],
    steps: [
      grind(9),
      tamp,
      pull(9, 18, [['espresso', 0.22], ['crema', 0.04]]),
      steam(60, 'light', [['espresso', 0.22], ['foam', 0.09]]),
      serve,
    ],
  },
  {
    id: 'cortado',
    name: 'Cortado',
    short: 'COR',
    note: 'Double · equal warm milk',
    final: [['espresso', 0.3], ['milk', 0.3], ['foam', 0.04]],
    steps: [
      grind(18),
      tamp,
      pull(18, 36, [['espresso', 0.3], ['crema', 0.04]]),
      steam(60, 'silky', [['espresso', 0.3], ['milk', 0.3], ['foam', 0.04]]),
      serve,
    ],
  },
]

export type Origin = {
  id: string
  no: string
  name: string
  short: string
  notes: string
  process: string
  altitude: string
  roast: number // 1..5
  story: string
  bag: string
  ink: string
  label: string
  tile: string
}

export const ORIGINS: Origin[] = [
  {
    id: 'guji', no: '001', name: 'Guji, Ethiopia', short: 'GUJI · ETHIOPIA',
    notes: 'Blueberry · jasmine · cacao', process: 'Natural', altitude: '1,950–2,200 M', roast: 2,
    story: 'Dried whole in the cherry on raised beds. The fruit soaks in, so it tastes like blueberries before it tastes like coffee.',
    bag: '#BCDDC4', ink: '#6E1F2F', label: '#F6EFE4', tile: '#DCEDE0',
  },
  {
    id: 'huila', no: '002', name: 'Huila, Colombia', short: 'HUILA · COLOMBIA',
    notes: 'Caramel · red apple · cocoa', process: 'Washed', altitude: '1,500–1,900 M', roast: 3,
    story: 'Small family farms in the Andes, washed clean of fruit before drying. Sweet, round, easy to love.',
    bag: '#F2D67A', ink: '#2A0A12', label: '#F6EFE4', tile: '#F8EAB8',
  },
  {
    id: 'huehue', no: '003', name: 'Huehuetenango, Guatemala', short: 'HUEHUE · GUATEMALA',
    notes: 'Milk chocolate · orange · almond', process: 'Washed', altitude: '1,500–2,000 M', roast: 3,
    story: 'Grown high in the Cuchumatanes, where dry winds keep frost away. Chocolatey with a bright orange edge.',
    bag: '#6E1F2F', ink: '#BCDDC4', label: '#EDB8B8', tile: '#E6C3C6',
  },
  {
    id: 'kirinyaga', no: '004', name: 'Kirinyaga, Kenya', short: 'KIRINYAGA · KENYA',
    notes: 'Blackcurrant · grapefruit · cane sugar', process: 'Washed', altitude: '1,600–1,800 M', roast: 2,
    story: 'Red volcanic soil on the slopes of Mount Kenya. Juicy and loud, the one that wakes you up.',
    bag: '#93B7DD', ink: '#2A0A12', label: '#F6EFE4', tile: '#D3E2F1',
  },
  {
    id: 'cerrado', no: '005', name: 'Cerrado Mineiro, Brazil', short: 'CERRADO · BRAZIL',
    notes: 'Peanut · dark chocolate · brown sugar', process: 'Natural', altitude: '900–1,250 M', roast: 4,
    story: 'Wide, sunny plateaus and a long dry season. Low acidity, big body, made for milk.',
    bag: '#1E1A1B', ink: '#F2D67A', label: '#F6EFE4', tile: '#D8D2CC',
  },
  {
    id: 'mambilla', no: '006', name: 'Mambilla Plateau, Nigeria', short: 'MAMBILLA · NIGERIA',
    notes: 'Cocoa · plum · brown sugar', process: 'Natural', altitude: '1,500–1,800 M', roast: 3,
    story: 'Arabica from the cool highlands of Taraba State, close to home. Gentle fruit, cocoa finish.',
    bag: '#EDB8B8', ink: '#6E1F2F', label: '#F6EFE4', tile: '#F5DADA',
  },
]

export const MUGS = [
  { id: 'mint', color: '#BCDDC4', ink: '#2A0A12' },
  { id: 'burgundy', color: '#6E1F2F', ink: '#F6EFE4' },
  { id: 'butter', color: '#F2D67A', ink: '#2A0A12' },
  { id: 'blush', color: '#EDB8B8', ink: '#2A0A12' },
  { id: 'sky', color: '#93B7DD', ink: '#2A0A12' },
  { id: 'cream', color: '#F6EFE4', ink: '#6E1F2F' },
  { id: 'ink', color: '#1E1A1B', ink: '#BCDDC4' },
]
