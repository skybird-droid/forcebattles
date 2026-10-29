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


BALANCE PASS (Oct 25) - applied from the second Balance document (replaces the first attempt)
Nerfs: Bastila (Battle Meditation adds +1 to the total of the first Attack, not to every die), Cal (Stasis Slow needs two 6s), Anakin (Aggressive Assault also needs him to have taken damage this game), Grievous (Health 12, Attack 3d6, no longer immune to pushes, Quad Strike is 4d6 against one enemy or 4d6 split between two), Sith Eternal Emperor (now also tagged Sith Eternal; Essence Transfer revives at 3 Health and costs the ally 3; Bass Lightning Storm 3d6), Malgus (Health 13; Onslaught only against a target with lower current Health; Crushing Blow 3d6).
Light buffs: Depa (Attack 3d6; Mace's attack gives her +1d6 on ALL her attacks vs that target for the round), Ahsoka Fulcrum (one 6 = defender rolls -1d6 Defense), Ki-Adi-Mundi (Attack 3d6, immune to Stun, counter deals 2), Kanan (Attack 3d6, Force Sight vs all attacks), Visas (Attack 3d6; Healing Link also gives +1d6 Defense), Jolee (Health 11, Attack 3d6, heals 4), Grand Master Yoda (Health 8, Attack 3d6; Battle Focus lets the ally move), Hermit Yoda (Health 8, Attack 2d6, Defense 4d6, +1d6 Defense vs everyone; Do or Do Not also heals 3).
Dark buffs: Bane (Health 16; Rule of Two +2d6 Attack and +2d6 Defense), Talon (Health 11; Lethal Strike 4d6), Maul (Health 12; Sith Hatred on any damage; Pursuit makes a 3d6 Attack and Stuns), Ventress (Health 11; Twin Lightsabers also vs a target engaged with another of her allies), Talzin (Health 10; Magick Infusion also buffs Sith allies), Seventh Sister (Health 11), Eighth Brother (Health 10; Blade Throw 4d6), Traya (Health 11; Web is -1d6 Defense vs all attacks this round; Saber Storm 3d6 each), Barriss (Health 11; Saber Disarm also Stuns).
Rulings where the document was short: kept Talon's +2 damage when the defender rolls no 6s, Cal's Flurry +1d6, Ki-Adi's immunity to forced targeting, and Ahsoka's no-Defense on two 6s. "Engaged" for Ventress means the target is adjacent to another of her allies (otherwise every adjacent target would qualify).
NETVER is now '5'.


QUALITY OF LIFE (Oct 25)
- Click your selected character again to deselect it (before you move, or after pressing Stay in place without having moved). Deselecting restores anything selecting had cleared, such as your own Taunt, and removes the log lines it added.
- Because your own square used to mean "stay put", there is now a "Stay in place" button next to "Deselect" during the move step. The how-to-play text and hints say so.
- Back button fixes: backing out of an Epic Action no longer uses it up, and Back is hidden once an attack has been made (so Tempered Rage/Split Saber Flurry can't be backed out of for a free extra action).
- New online input "stay", so NETVER is now '6'.


SAVED SQUADS (Oct 25)
- New file js/squads.js (loaded after characters.js). Squads are stored in this browser's localStorage under "fb-squads", by character name, so they keep working if the roster changes. Up to 30 per side. Clearing site data removes them.
- Main menu > Saved Squads > Manage squads: pick a side, build a squad, name it, Save. Edit, update or delete (two clicks) saved squads. Saving a squad with an existing name on the same side overwrites it.
- Local picker and online lobby: a "Saved squads" strip for your side. Click a squad to load it in one click, then Start / Ready. "Save squad" stores the current four (Darth Bane + one counts as full). Squads for the other side are never shown or loaded.
- Online play needs no version bump: squads only fill in the picks you were already sending.


NEW CHARACTERS 3 (Oct 26): 68 characters now
- Light: Grand Master Luke Skywalker, Mara Jade Skywalker, Cade Skywalker, Ben Skywalker. Dark: Darth Krayt, Darth Nihl, Darth Wyyrlok III, Darth Stryfe. Portraits are in portraits/ and mapped in js/characters.js; ability code is in js/game.js. New tags: New Republic, Mercenary.
- Rulings made while implementing:
  * Grand Master's Guidance gives its bonus to other Jedi / New Republic allies within 2 spaces, not to Luke himself. One with the Force clears Stun, Defense and Attack penalties, Sever, "cannot attack" and the other negative marks; Taunt is not treated as negative.
  * Battle Bond counts any Luke (Luke Skywalker (Jedi Knight), Jedi Master Luke, Grand Master Luke) as "Luke".
  * Dark Transfer chooses automatically: whichever heals more (an adjacent ally +3, or Cade +2); a tie goes to the ally.
  * Force Concealment only hides Ben from Attack target choices (including abilities that make an Attack roll) when another valid target is in range. Area attacks and non-attack abilities can still pick him.
  * Long-Handle Reach gives Nihl's basic Attack and Executioner's Strike a range of 2 ("engaged" is read as within his reach).
  * Sith Sorcery Aura is checked when the enemy's activation starts, and takes one die from every Attack that turn, including fixed-dice abilities.
  * Dark Lightning Surge uses one shared 3d6 roll against both targets, like Bass Lightning Storm.
  * Brutal Enforcer also applies at the very start of the game.
- NETVER is now '7': both players must load this version to play online.
