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
