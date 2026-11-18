export type Phase =
  | 'loading' // loader screen, scene warming up behind it
  | 'gate' // admission line + Open the bag
  | 'opening' // strip tears, bag tilts
  | 'spilling' // beans pour out (physics)
  | 'falling' // the chosen bean falls into the page
  | 'ritual' // part one: the pour-over ritual
  | 'entered' // hero / main page

export const COLORS = {
  ink: '#14120F',
  cream: '#EFE3D0',
  paper: '#F6EFE4',
  mint: '#BCDDC4',
  butter: '#F4CD5D',
  burgundy: '#6E1F2F',
  wine: '#2A0A12',
  roast: '#4A2716',
}
