# Random-Games

## GLOBAL CLASH — World Combat Simulator

A standalone 3D neon browser arena game with four procedural character classes, animated fighters, special abilities, multiple arenas and private multiplayer rooms.

- **Play:** [Open Global Clash](global-clash/index.html)
- **3D:** real-time Three.js/WebGL arena, bespoke procedural 3D models for Striker, Guardian, Runner and Technician, animated movement, class gear, effects, pickups and a rotating Loadout preview.
- **Features:** responsive arenas, training bots, WASD movement, energy pulses, dash, shield, class ultimates, scoreboard and private room codes.
- **Multiplayer:** peer-to-peer browser connection via WebRTC/PeerJS. All players need an internet connection; direct connectivity can depend on their network/NAT configuration.
- **No accounts or downloads** are required. The game is a fictional, non-graphic arcade simulator.

The game is a static HTML page and can be hosted with GitHub Pages.


The 3D renderer is in `global-clash/arena3d.js`. Three.js is loaded from a CDN; WebGL is required for 3D, with the original 2D arena retained as a fallback.


### Third-person view and custom outfits
- Over-the-shoulder follow camera, on-screen reticle, camera-relative WASD movement and Shift sprint.
- Outfit Lab: create original skins with custom names, armour colours, energy accents and four armour silhouette styles.
- Custom outfits persist in the local browser profile and are included in private-room match data so friends can see the equipped look.
