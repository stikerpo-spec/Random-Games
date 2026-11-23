# GLOBAL CLASH — World Arena

A neon-styled, fictional, non-graphic browser arena game inside the Random Games collection.

## Open the game

- GitHub Pages: https://stikerpo-spec.github.io/Random-Games/global-clash/
- Source: `global-clash/index.html`, `global-clash/styles.css`, `global-clash/app.js`

## Included in this build

### Arena modes
- **Training Lab** — solo practice against a bot.
- **Tournament Circuit** — beat three solo challengers in sequence.\n- **Survival** — survive escalating bot waves.
- **Duel** — private online 1v1.
- **Team Clash** — private online team match, two teams.
- **Free For All** — private online match for up to four players.
- **King of the Arena** — hold the central control zone against bots.
- **Capture the Core** — team-based central-zone objective in a private online room.

### Fighters and customization
- Four selectable classes: Striker, Guardian, Runner and Technician.
- Class differences affect health, movement speed, energy and regeneration.
- Four arena maps: Neon Harbor, Sky Grid, Frostline and Ember Plaza.\n- Class-specific ultimate abilities charged through combat.\n- Pickups: repair cells, energy cells and ultimate charge.\n- Arena cover blocks stop player movement and energy pulses.
- Cosmetic visual styles that can be unlocked with earned coins.
- Daily objectives, XP, levels, coins, local rank tiers and achievements.

### Playing online with friends
1. Select Duel, Team Clash, Free For All or Capture the Core.
2. Open the private room lobby and choose **Create Private Room**.
3. Share the six-character room code or invite link with your friends.
4. Friends open the same game page, enter the code and join.
5. The host starts the match when at least two players are connected.

The browser-to-browser connection uses PeerJS/WebRTC. The free PeerJS Cloud service brokers the initial connection; the match state is then exchanged between players. Internet connectivity, browser permissions and network/NAT configuration can affect whether a direct connection succeeds. A TURN relay or self-hosted signaling service may be required for some networks.

### Controls
- Move: `W A S D` or arrow keys
- Aim: mouse
- Energy pulse: `J` or click
- Dash: `Space`
- Shield: `E`
- Mobile: on-screen movement and action controls

## Local run
Open this folder through a local static server (for example `python -m http.server 8080`) or use GitHub Pages. No build step or package install is required.

## Important scope notes

This repository is hosted as a static GitHub Pages site. In this build:
- Player profile, progress, friends list, cosmetics and records are stored in the current browser using local storage.
- Friend codes are locally saved labels; they do not yet resolve a remote account or show live presence.
- The ranking page is a **local personal-record list**, not a worldwide verified leaderboard.
- Online matchmaking is **private room-code matchmaking**, not an automatic public queue.
- There is no login, spectator mode, public tournament bracket or cross-device cloud save yet.

Those global services require a persistent backend (and, for robust competitive play, server-side match validation). They are intentionally not represented as active features in this static-only deployment.

## Technical notes
- The room host simulates the match and sends snapshots to connected guests.
- This is a lightweight community prototype, not an anti-cheat competitive server.
- Progress is stored locally and can be reset by clearing this site's browser storage.
- No email, phone number or real-world name is required.
