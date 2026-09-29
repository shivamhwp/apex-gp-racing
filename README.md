# APEX GP

**Play:** https://apex-gp-racing.pages.dev/

A lightweight 3D open-wheel racing game built with Three.js and Vite, hosted on Cloudflare Pages.

## Play

Click the **ⓘ** button for the control diagram. Opening it during a race pauses the game; closing it resumes the race.

Three laps of the 1.60 km Riviera circuit against seven AI opponents. The circuit has steering assistance: use steering to choose your line and overtake, brake for sharp turns, and use hybrid boost on the straights. Grass, barriers and contact cost speed. Fastest completed-race laps are saved locally on your device.

- W / Up: accelerate
- S / Down: brake
- A / Left and D / Right: steer
- Space / Shift: hybrid boost (recharges when released)
- C: chase / cockpit camera
- Escape / P: pause
- R: recover to the center of the circuit
- Touch screens: use the on-screen buttons

## Develop and deploy

Requires Node.js 20.19+ (or 22.12+) and a Cloudflare-authenticated Wrangler CLI.

```sh
npm install
npm run dev
npm test
npm run build
wrangler pages deploy dist --project-name=apex-gp-racing --branch=main
```

All car meshes, track geometry, scenery and texture maps are generated locally. There are no remote model assets. Three.js is bundled with the game. Google Fonts supplies the optional Barlow typography; system fonts are used if unavailable.

Rendering uses merged geometry, instancing, a fixed 120 Hz simulation step, capped pixel density, and adaptive resolution. The performance preset also disables dynamic shadows. Measured frame rates depend on device, display and browser. WebGL 2 is required.

This is an original Formula-style arcade game, with original driver names and liveries.

`npm test` checks steering direction against camera-projected circuit coordinates for WASD, arrow-key and touch bindings in both camera views. `npm run deploy:worker` also updates the original workers.dev URL.
