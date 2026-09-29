# Deployment

Live game: https://apex-gp-racing.pages.dev

Cloudflare Pages production deployment: https://dbe436f0.apex-gp-racing.pages.dev

Deployed with `npm run deploy` (`wrangler pages deploy dist --project-name=apex-gp-racing --branch=main`) to Cloudflare Pages.

Verified the pages.dev production HTML, JavaScript, CSS and favicon each match the local production build byte for byte.

Earlier Workers deployment: https://apex-gp-racing.shivamcod2.workers.dev

Verified the production build, HTTPS 200 responses, same-origin game scripts, immutable bundle caching, desktop rendering, 390 × 844 touch layout with no horizontal overflow, trusted pointer input, keyboard acceleration/steering/braking/boost, chase/cockpit switching, pause with frozen race time, and resume. A complete local race showed classification and stored the best lap; the deployed final build was observed through lap 3 without browser console errors. Desktop measurements on this machine were approximately 120 FPS; phone layout was tested through browser emulation, not physical phone hardware.

Source archive: `../apex-gp-source.zip`

## Steering correction

Fixed reversed lateral input by matching the steering sign to the circuit normal. All eight camera-projection regression tests pass, covering WASD/arrow bindings and eight circuit positions in both chase and cockpit views. Browser checks confirmed each keyboard direction, held trusted pointer input on both touch steering buttons in both views, acceleration and braking. Both live URLs serve the tested production HTML and JavaScript byte for byte.

Workers version: `df8d4c39-e390-4576-a801-56c98216a6aa`

## Control information

Removed control hints from the menu and race HUD. The header info button opens an accessible keyboard diagram with shortcuts in a native dialog. Verified opening, Escape/button dismissal, race pause/resume, mobile fit at 390 × 844, and matching deployed HTML/CSS/JavaScript on both URLs.

Workers version: `1e49074a-3b55-4539-a909-a9e10761216f`
