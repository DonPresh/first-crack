# First Crack · A Museum of the Bean

Interactive coffee experience. Chapter 0: loader → admission gate → bag opens → beans spill → one bean falls into the page → hero.

## Run
```
npm install
npm run dev        # http://localhost:3000
```
Jump straight to a stage while designing: `/?phase=gate` or `/?phase=entered`

## Deploy (Vercel)
Push this folder to a GitHub repo, then Vercel → Add New Project → import it. No settings needed (Next.js is auto-detected).

## Where things live
- `components/Loader.tsx` · counter + rotating fun facts (`lib/facts.ts`)
- `components/Gate.tsx` · "Admission: one deep breath. Smell that?"
- `components/Experience.tsx` · 3D scene + the whole intro timeline (GSAP)
- `components/Beans.tsx` · physics bean spill (Rapier, instanced)
- `lib/bean.ts` · procedural bean model + material
- `lib/bagLabel.ts` · bag shape + printed label (canvas, edit copy here)
- `app/globals.css` · colours, type, grain

Stack: Next.js 15, React Three Fiber, drei, Rapier, postprocessing, GSAP.
Fonts: Unbounded (display), Instrument Serif, JetBrains Mono.
