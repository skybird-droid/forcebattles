Force Battles — cleaned project structure

Files
- index.html: page structure and file references
- css/style.css: visual styling
- js/characters.js: character roster and portrait file paths
- js/game.js: game state, rules, abilities, and interface rendering
- portraits/: extracted character portraits

How to run
1. Keep the folder structure intact.
2. Open index.html in a modern browser.
3. If your browser restricts local files, run a simple local web server from this folder (for example, `python -m http.server`) and open the local address it prints.

Notes
- This refactor keeps the game as a static site; no framework or backend is required.
- Character data still uses the original short property names to avoid changing the game logic during this cleanup.
- JavaScript syntax was checked with Node.js. Please play through a battle to verify behavior in your browser.


ONLINE PLAY (room codes)
- js/net.js adds Create room / Join room. It uses PeerJS (js/peerjs.min.js, MIT licence) over WebRTC with the free public PeerJS matchmaking server, so a plain static site is enough.
- Sides are assigned at random when two players are in a room; each player picks 4 characters of their side and clicks Ready.
- Both browsers run the same game with the same random seed and exchange every input, so the game code in game.js must be identical for both players (NETVER in net.js is checked when joining; bump it if you change rules).
- The page must be served over https:// (or http://localhost) for WebRTC. Opening index.html from a file may also work, but https hosting is the reliable way.
- To use your own matchmaking server instead of the public one, pass {host, port, path} as the second argument to new Peer(...) in net.js.


UI update notes
---------------
- Character selection now includes a live name/trait search and faction/trait filter.
- Selected characters have a gold outline, check mark, and a clear “selected — click to remove” label.
- Clicking a selected character again removes it from the squad in local and online squad selection.
- During battle, hover or keyboard-focus an Attack/Action/Epic ability icon to preview its valid target units on the board. Valid target units glow gold. Selecting the ability still shows the game's normal target highlights and confirms the action.
- The range preview highlights units the ability can target, based on the existing game rules; it does not change ability range or combat behavior.


PLAYER FEEDBACK, SOUND AND HELP (js/ux.js)
- Floating damage/heal/stun numbers on the board, a dice card showing the last attack, a colour-coded battle log, and turn alerts (toast, sound, and "Your turn" in the browser tab title).
- Sounds are synthesised in the browser (no audio files). The speaker button mutes them and the choice is remembered.
- The "How to play" button opens a short guide; it pulses until it has been opened once.
- On touch screens, tap an ability once to read it and see its range, tap again to use it.
- ux.js only draws things: it never changes game state or touches the random number generator, so it cannot cause online desyncs.

RECONNECTING AND FORFEIT (js/net.js)
- Every move is saved with the match in the browser. If a player refreshes or loses connection, the other player's game waits. Reopen the game and click "Resume match" (guests also reconnect automatically after a short drop).
- Only the original opponent can rejoin a running match (a secret token is checked), so a stranger cannot take over by guessing the room code.
- Each move carries a fingerprint of the board; if the two games ever disagree, both players are told straight away.
- Forfeit asks for a second click to confirm. NETVER is now '2'; bump it whenever you change rules or the message format.


NEW CHARACTERS (Oct 24 batch)
- Light: Padawan Obi-Wan, Depa Billaba, Rey, Jedi Master Luke. Dark: Sith Eternal Emperor, Kylo Ren, Darth Talon, Darth Bane. Portraits are in portraits/ and mapped in js/characters.js; ability code is in js/game.js.
- Squad cost: Darth Bane counts as 3 characters, so a Bane squad is Bane plus one other character (2 units on the board). Costs live in SQUAD_COST in js/characters.js; the squad pickers (local and online) now count cost instead of heads.
- Rule of Two works when Bane has exactly one living Sith ally; the bonus ends when that ally falls.
- Rulings made while implementing (change them in js/game.js if you meant something else):
  * Force Projection: a square next to Luke can be entered, but entering it ends the enemy's movement (they cannot pass through his reach). Ability jumps (Pursuit, Dash, Charge, Stealth Strike) cannot land next to Luke unless the unit already started next to him.
  * Dyad Echo triggers on enemy Action abilities and Epic Actions used within 3 spaces of Rey.
  * Essence Transfer picks the healthiest allied unit within 3 spaces automatically, and it is not limited to once per game.
  * Lethal Strike: "engaged" means adjacent to Talon; the +2 bonus only applies if the attack already deals damage.
  * Orbalisk Armor Surge: Taunt and immunity both end at the end of the round.
  * Force Freeze's +1d6 lasts until Kylo is next selected (or dies).
- NETVER is now '3': both players must load this version to play online.
