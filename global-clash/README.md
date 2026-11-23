# GLOBAL CLASH — World Arena

A neon-styled, fictional, non-graphic browser arena game inside the Random Games collection.

## Open the game

- GitHub Pages: https://stikerpo-spec.github.io/Random-Games/global-clash/
- Source: `global-clash/index.html`, `global-clash/styles.css`, `global-clash/app.js`

## Included in this build

### Arena modes
- **Training Lab** — solo practice against a bot.
- **Tournament Circuit** — beat three solo challengers in sequence.
- **Survival** — survive escalating bot waves.
- **Duel** — private online 1v1.
- **Team Clash** — private online team match, two teams.
- **Free For All** — private online match for up to four players.
- **King of the Arena** — hold the central control zone against bots.
- **Capture the Core** — team-based central-zone objective in a private online room.

### Fighters and customization
- Four selectable classes: Striker, Guardian, Runner and Technician.
- Class differences affect health, movement speed, energy and regeneration.
- Four arena maps: Neon Harbor, Sky Grid, Frostline and Ember Plaza.
- Class-specific ultimate abilities charged through combat.
- Pickups: repair cells, energy cells and ultimate charge.
- Arena cover blocks stop player movement and energy pulses.
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
- Class ultimate: `Q` (charge it through combat)
- Mobile: on-screen movement and action controls

## Local run
Open this folder through a local static server (for example `python -m http.server 8080`) or use GitHub Pages. No build step or package install is required.

## Important scope notes

This repository is hosted as a static GitHub Pages site. In this build:
- Player profile, progress, friends list, cosmetics and records are stored in the current browser using local storage.
- Friend codes are locally saved labels; they do not yet resolve a remote account or show live presence.
- The ranking page is a **local personal-record list**, not a worldwide verified leaderboard.
- Online matchmaking is **private room-code matchmaking**, not an automatic public queue.
- Account sign-in is provided by the optional Supabase Auth connection. It becomes active only after the project URL and publishable key are configured in `global-clash/backend-config.js`.
- Player progress, cosmetics and records still remain local to each browser in this version; account login does not yet cloud-sync game progress.
- Email update announcements are sent only to confirmed accounts that explicitly opt in, and are triggered when a GitHub Release is published (or by manually running the notification workflow).
- Spectator mode, public tournament brackets and verified global rankings are not included.

The game is still a static GitHub Pages site. Supabase supplies account identity and email confirmation; GitHub Actions and the Resend API deliver update announcements. The backend connection and provider secrets must be configured before real emails can be sent.

## Technical notes
- The room host simulates the match and sends snapshots to connected guests.
- This is a lightweight community prototype, not an anti-cheat competitive server.
- Progress is stored locally and can be reset by clearing this site's browser storage.
- No email, phone number or real-world name is required.


## 3D character and arena renderer

The match view now uses a real-time Three.js/WebGL renderer. Fighters are constructed from 3D meshes at runtime, with distinct class silhouettes and equipment for Striker, Guardian, Runner and Technician. Walk cycles, hover motion, shields, ultimate rings, projectiles, pickups, arena obstacles and the rotating Loadout preview are rendered in 3D.

No external character model downloads are required: the character geometry is generated in global-clash/arena3d.js. Three.js is loaded from a CDN, so the first load requires an internet connection and a browser with WebGL enabled. If WebGL is unavailable, the earlier 2D renderer remains as a fallback.

The existing gameplay simulation, keyboard/touch controls, game modes, private PeerJS rooms, and local profile progression remain in app.js. The multiplayer/network caveats described above still apply.


## Third-person camera and original skins

The 3D match now uses an over-the-shoulder third-person follow camera with a screen reticle, camera-relative WASD movement and Shift sprint. The player remains visible in front of the camera; mouse/touch aim is projected into the 3D arena.

The Outfit Lab lets players create original custom cosmetics with a name, main armour colour, energy accent colour and one of four silhouette themes (Vanguard, Runner, Tech or Shadow). Custom outfits are stored in the local browser profile and are sent to friends when joining a private match, so everyone sees each player's selected look. They are purely visual and do not change class stats.

These are original stylised game characters and outfits, not Fortnite models, logos, maps, or copied skins. The camera perspective is a general third-person action-game style.


### Free mouse look
The match captures the mouse pointer on desktop to provide continuous 360-degree third-person camera look. Mouse movement rotates the camera and the centre reticle aims into the arena. Press Escape to release the pointer and pause the local match; use Resume Match to capture it again. Touchscreen devices keep direct touch aiming and do not require pointer lock.

The Settings page adds a persistent mouse-sensitivity slider (0.5×–2.5×), optional inverted vertical look and an SFX toggle. Control settings are stored locally in the browser and can be reset with one button.


## Real accounts and email announcements

### 1. Connect Supabase Auth

1. Create a Supabase project.
2. Copy its **Project URL** and **publishable key** into `global-clash/backend-config.js`. The publishable key is intended for browser use; never place a Supabase `service_role` or secret key in this file.
3. In Supabase Authentication settings, enable email/password sign-up and **Confirm email**.
4. Set the Site URL to `https://stikerpo-spec.github.io/Random-Games/global-clash/` and add that same address as an allowed redirect URL.
5. Configure a custom SMTP provider for Auth confirmation and password-reset emails. Supabase's built-in sender is for testing: it only sends to pre-authorized team addresses and is limited to 2 messages per hour. A custom SMTP provider is required for normal users.

The Account button opens sign-up/sign-in, sends the email confirmation request, supports password reset and keeps the Auth session in the browser. Update announcements are opt-in and can be switched off again in Settings. Only verified email accounts are eligible.

### 2. Configure update announcements

1. Set up Resend and verify a sending domain. Use a sender address from that verified domain.
2. In GitHub repository **Settings → Secrets and variables → Actions**, add these repository secrets:
   - `SUPABASE_URL` — the same Supabase Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — the server-only service-role key. It is used only by GitHub Actions and must never go into browser code.
   - `RESEND_API_KEY` — the Resend API key.
   - `GLOBAL_CLASH_FROM` — for example, `GLOBAL CLASH <updates@your-verified-domain.example>`.
3. Publish a GitHub Release to send an announcement to all confirmed users who enabled **Email me about new updates**. You can also run **Actions → Email Global Clash update subscribers → Run workflow** and enter a title and notes for a manual announcement.

The workflow sends one email per eligible subscriber, avoids unverified accounts, does not expose recipient lists to other players, and reports sending failures in the GitHub Actions run. Users can turn future update emails off in Settings. The workflow does not email anyone until the provider secrets are configured.

### Security and data notes

- The browser receives only the Supabase publishable key. Admin keys and the Resend API key belong in GitHub Actions secrets only.
- Account creation collects an email address and password. Do not put passwords, verification links, or provider secrets into game chat or public repository files.
- Ask a parent or guardian to help with provider setup and review privacy requirements before making account registration available to other players.
