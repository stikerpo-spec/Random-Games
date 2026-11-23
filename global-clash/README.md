# GLOBAL CLASH

A neon-styled, fictional arcade combat simulator built as a static browser game.

## Features
- Solo training mode against a lightweight bot.
- Private multiplayer rooms for up to four players.
- Six-character invite codes and shareable invite URLs.
- Browser-to-browser WebRTC networking via PeerJS.
- 120-second rounds, first to five knockouts wins.
- Energy pulse, dash, shield, respawns, scoreboard and combat feed.
- Responsive desktop and touch controls.
- No accounts, downloads, build step or server-side game state required.

## Controls
- Move: `WASD` or arrow keys
- Aim: mouse
- Energy pulse: `J` or click
- Dash: `Space`
- Shield: `E`

Touch controls are shown on smaller screens.

## Run locally
Open `index.html` through a static web server or host the folder with GitHub Pages. Peer-to-peer mode requires internet access to the PeerJS signaling service. Actual direct connectivity may depend on NAT/firewall settings; this prototype does not include a dedicated TURN relay or authoritative server.

## Multiplayer architecture
The host browser acts as the match coordinator and broadcasts the game state to connected guests. Guests send their input to the host over PeerJS/WebRTC. This is a lightweight prototype, not a cheat-resistant competitive networking architecture.

## Privacy
No account is created and the game does not send player profiles to a custom backend. A nickname is stored locally in the browser. PeerJS is used for matchmaking/signaling; network metadata may be processed by the networking service and peers as part of establishing a connection.
