# Force Battles: handoff brief for another AI

Paste this together with the project zip (force-battles-project.zip). It says what the game is, how the code is organised, and the conventions that are easy to get wrong.

## 1. What it is
A static, no-build web game (plain HTML/CSS/JS, no framework, no backend). Two squads of four fight on an 8x8 grid: Light Side vs Dark Side, with Star Wars characters. It runs locally (hot-seat) or online between two browsers using PeerJS room codes. Open `index.html` over http(s) or `python -m http.server`.

Current state: 68 characters (34 per side), online protocol version `NETVER = '7'` (in `js/net.js`).

## 2. Rules in one page
- **Squads:** each side picks squad points that add up to exactly 4. Every character costs 1, except Darth Bane who costs 3 (so a Bane squad is Bane plus one other). Sides are fixed: Light picks Light characters, Dark picks Dark.
- **Setup:** units are placed at random in the two rows nearest their own edge. Which side goes first is random.
- **Turns and rounds:** players alternate activations. Each character activates once per round. When everyone has acted, a new round starts and per-round effects reset.
- **An activation:** pick an unused character, then Move (up to 4 squares, diagonals count, cannot pass through anyone), then Act (basic Attack, an Action, an Epic Action, or end). A character can also be deselected before it moves.
- **Engaged:** a character adjacent to an enemy cannot move (some passives ignore this).
- **Dice:** stats are dice counts (Attack 3d6 = roll three six-sided dice). The attacker's total minus the defender's total is damage, never below 0. Basic Attack hits an adjacent enemy (Bryar-type units have range 3, Darth Nihl range 2).
- **Abilities:** each character has exactly two: one Passive plus one Action or Epic. Epic Actions are once per game.
- **Stun:** skip the next activation. **Taunt:** enemies must target the Taunter with Attack actions if it is a valid target; it ends when the Taunter is next selected.
- **Win:** defeat every enemy character.

## 3. File map
| File | What it holds |
|---|---|
| `index.html` | Page shell and `<script>` tags. Plain global scripts, no modules, so everything shares one global scope. |
| `js/characters.js` | The roster array `R`, portrait map `IMG`, ability icon map `ABICON`, squad-cost helpers (`SQUAD_SIZE`, `SQUAD_COST`, `squadCost`, `randSquad`). |
| `js/squads.js` | Saved squads feature (stored in the browser, key `fb-squads`, by character name). |
| `js/net.js` | Main menu, online lobby, PeerJS lockstep networking, desync check, resume. |
| `js/ux.js` | Sound, visual effects, the "How to play" guide text. |
| `js/game.js` | Game state, all rules, the ability table `AB`, input functions, rendering. Biggest and densest file. |
| `css/style.css`, `portraits/`, `icons/` | Styling and art. |
| `README.txt` | Running log of every change and every rules ruling. Read it. |

## 4. How a character is defined (`js/characters.js`)
Short property names are intentional:
```js
{n:'Darth Nihl', s:'D', t:['Sith','One Sith','Force-Sensitive'], h:11, a:3, d:2,
 k:['longreach','a_exec'],
 x:`Passive Long-Handle Reach: ... Action Executioner's Strike: ...`}
```
- `n` name, `s` side (`'L'`/`'D'`), `t` tags, `h` Health, `a` Attack dice, `d` Defense dice.
- `k` = implementation keys, in the same order as the abilities in `x`:
  - plain key (e.g. `'longreach'`) = a Passive. Its behaviour is hand-coded wherever the rule applies, by checking `k(unit,'longreach')`.
  - `a_...` = an Action, `e_...` = an Epic. These must exist as entries in the `AB` table in `game.js`. (A few Epics such as `e_ben`, `e_counter`, `e_iaj` are automatic triggers handled inside rules code, not clickable.)
- `x` = the card text. It is parsed by a regex that splits on `Passive|Action|Epic <Name>: `. **Do not write the capitalised words Passive, Action or Epic anywhere inside a description** (say "Attack action", lowercase) or the card will split wrongly.
- Every character needs: a roster record, an `IMG` entry (`portraits/<file>.png`), and an `ABICON` entry per ability keyed `"Character Name|Ability Name"` (icon categories: `multi` for abilities that make an attack, `attack` for the plain side-coloured attack icon, `atkup`, `atkdown`, `defup`, `defdown`, `heal`, `stun`, `taunt`, `move`, `o66`; the mapping is in `abIcon` and `CATICON` in `game.js`).

## 5. Engine concepts (`js/game.js`)
- **State** is one global `G`: `u` (units), `turn`, `round`, `mode`, `sel`, `win`, `log` (newest first), plus transient prompt fields. A unit holds `hp`, `x`, `y`, `team` (0 Light, 1 Dark), `d` (its roster record), `used`, and a status bag `st` (e.g. `stun`, `taunt`, `exp`, `orb`, `ofa`).
- **Helpers:** `live(team)`, `al(u)` (allies, excluding self), `en(u)` (enemies), `dist` (Chebyshev), `adj`, `occ`, `k(u,key)` (passive check; passives are switched off if the unit is Severed), `has(u,tag)`.
- **Combat:** `aDice(a,d)` and `dDice(d,a)` add up every passive bonus. `att(a,d,opts)` rolls and resolves one attack (`opts.n` fixed dice, `opts.ar` shared roll, `opts.st` stun on damage, `opts.lethal`). Also `hurt`, `heal`, `stun`, `debuff`, `pushAway`, `tf` (target filter: Taunt and concealment), `reach` (movement search), `adjFree` (landing square next to a target).
- **Ability table `AB`:** `key:{l:'Label', atk:1, inst:1, ep:1, tg:u=>[targets], go:(u,t)=>{...}}`. `atk` = it is an Attack (Taunt applies), `inst` = no target needed, `ep` = Epic. `go` returning `1` means "continue with another prompt" (second target, bonus move, split dice, etc.).
- **Turn state machine:** `G.mode` goes `null -> 'move' -> 'act' -> ('tg' | 'amove' | 'split' | 'quad') -> finish()`. Selecting a unit clears its own start-of-turn effects (Taunt etc.); `deselect()` restores them from a snapshot.
- **Round reset** (`nextTurn`) clears per-round statuses and applies start-of-round effects.

## 6. Networking rules you must not break (`js/net.js`)
- Online play is lockstep: both browsers run the same code with the same seeded RNG and exchange every input. Inputs are the global functions listed in `INPUTS` (`cell, doAtk, doAb, finish, resolveSplit, resolveQuad, resolveStorm, deselect, stay, back`). A new player-facing action must be added to that list.
- Rules code must be deterministic. Never use `Math.random()` in game logic; use the seeded helpers (`rnd`, `d6`, `rl`, `shuf`). Pre-game things such as random squads may use it.
- Any change to rules, roster or inputs requires bumping `NETVER` so mismatched builds refuse to connect.

## 7. Adding or changing a character: checklist
1. Add the record to `R` in `characters.js`, the `IMG` path, and `ABICON` entries; copy the portrait into `portraits/`.
2. Add `a_`/`e_` entries to `AB` in `game.js`. Implement passives by adding checks in the right place (`aDice`, `dDice`, `att`, `hurt`, `reach`, round reset, selection, etc.).
3. If it changes statuses, also update the status label list (`stTxt`) and the round-reset cleanup.
4. Run a syntax check on every JS file, then test behaviour (see below). Bump `NETVER`. Add notes to `README.txt`.

## 8. Testing approach used so far (not in the zip)
- A headless jsdom harness loads `characters.js, squads.js, net.js, ux.js, game.js` into one script scope and calls the game functions directly (selecting units, forcing dice via `opts.ar`, checking `G.log`). Rendering is stubbed for speed.
- A bot simulator plays full games with a one-turn lookahead (it tries movement squares and actions against random dice, using snapshot/restore) to measure win rates over thousands of games. It undervalues defensive and support characters, so treat those results with caution.
- If a new AI needs these scripts, ask for them to be bundled.

## 9. Balance status
- Over thousands of simulated games Dark wins about 68% and Light about 32%, so Light is generally behind; judge each character against their own side's average.
- Two balance passes have been applied (the second replaced the first). The owner decided the current numbers are good enough for now.
- Known open items (untested ideas, not applied): Kanan and the new Grand Master Luke and Cade Skywalker test strong; Bane, Seventh Sister, Barriss and Ben Skywalker test weak; Grievous is still the top Dark character.
- `README.txt` lists every ruling made when card text was ambiguous (for example Ventress "engaged", Cade's automatic Dark Transfer choice). Check there before reinterpreting a card.

## 10. Working style that has been used
- Make a backup copy of the project before a batch of changes, apply edits with exact-match find/replace scripts that fail loudly, syntax-check every file, run tests, then re-zip and hand back the whole project.
- When a card text is ambiguous or conflicts with how the game already works, pick the least surprising reading, document it in the README, and tell the owner.
