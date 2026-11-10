Force Battles — cleaned project structure

Files
- index.html: page structure and file references
- css/style.css: visual styling
- js/characters.js: character roster and portrait file paths
- js/game.js: game state, rules, abilities, and interface rendering
- images/portraits/: character portraits; images/icons/: ability icons; images/mainmenu/: main menu tile art

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

CHARACTER OVERHAUL (Nov 1): NETVER is now '8'
- Board tiles no longer show character names (hover for a tooltip); only portrait plus HP/status.
- Jedi/Sith tags no longer give bonuses to allies: Bastila's Battle Meditation = Old Republic only; Satele's Resolve = Old Republic only; Grand Master Luke's Guidance = New Republic only; Mother Talzin's Magick Infusion = Night only; Darth Bane's Rule of Two needs exactly one other Sith ally who is not One Sith.
  * Satele's Grand Master's Resolve had no code behind it before; it is now implemented ("engaged" = adjacent to an enemy).
  * Still keyed on Jedi/Sith (not requested, untouched): Grand Inquisitor, Mace Windu, The Stranger, Grievous, Bastila (Fallen).
- Jolee Bindo: Jedi tag removed, Old Republic added.
- Ahsoka (Padawan): whenever an Anakin Skywalker ally uses Tempered Rage she gets a free basic Attack (her normal dice, enemy in her range, Taunt applies) before Anakin's attacks, even if she already acted. Folded into her passive; no free move.
- Cade: Dark Transfer is now an Epic (no passive left). Returns a defeated ally at 4 Health on an empty square adjacent to Cade (player picks ally if several, then the square). The ally cannot activate until next round, keeps spent Epics/once-per-game flags. Ben's "one with the Force" and Ezra's Purrgil victims are not revivable.
- Ezra: Blaster Hybrid Strike replaced by Epic Call of the Purrgil: a Stunned enemy within 4 and Ezra are both defeated. This bypasses survival effects (Lord of Pain, Essence Transfer, Ben) and the victims cannot be revived. If the target was the last enemy, Ezra's side wins.
- Kyle Katarn: Force Absorb is now a passive: when he would be Stunned, the Stun is negated and he gains +1d6 Defense until his next turn (off while Severed). He now has two passives.
- Rey: All the Jedi is now an automatic Epic: the first time she would be Stunned (once per game) the Stun is negated and she gets +2d6 Attack and Defense for the round.
- Barriss (Fallen): added Action Healer's Touch (self or ally within 2 recovers 3 Health). Saber Disarm was later removed, so she now has Betrayer's Guile and Healer's Touch.
- Count Dooku: Force Push replaced by Force Lightning (3d6 Attack, range 3, Stuns on damage).
- Darth Vader: All Too Easy replaced by Force Choke (enemy within 3 takes 2 unblockable damage and is Stunned).
- Sith Eternal Emperor: Essence Transfer rewritten. When he is defeated and any character is within 2 spaces, his player may take over one (friend or enemy) or decline. The host keeps its Health and abilities, joins his team and keeps its status/used flags. If the host's name contains Palpatine or Sidious, or it has the Clone trait, it also gains SEE's abilities (including the Epics, tracked per Epic). Taking an enemy can end the game if it was their last unit. Enemies that are immune (Jolee), binary or in Orbalisk Armor cannot be taken. The prompt is answered by SEE's owner even on the opponent's turn (see ctrl() in game.js and net.js).

VS COMPUTER (Nov 1) - js/ai.js
- Main menu > VS Computer: pick Light or Dark and a squad; the computer gets a random squad for the other side. "New game" returns to that setup screen.
- The computer plays through the same input functions as a click (cell, doAtk, doAb, finish, ...), one step every 0.65 s (AI_DELAY), so all rules, logs and effects are shared with normal play. Your clicks are blocked on its turn (clicking a unit still shows its info).
- How it chooses: for each ready unit it tries every reachable square and scores the best action from there: expected damage and kill chance from the dice (aDice/dDice), bonuses for Stuns, heals of missing Health and buffs/Taunts near enemies. Epics need a clearly good moment. It does not look ahead to your reply.
- Tested headless: 60 computer-vs-computer games finished with no errors; it won 138 of 150 games against a simple player that never moves and just attacks.
- Online play is unchanged (no NETVER bump needed).

WORLD BETWEEN WORLDS CAMPAIGN (Nov 3) - js/campaign-data.js, js/campaign.js, css/campaign.css
- Main menu > World Between Worlds. Light Side path only for now (the Dark Side card says "coming later"). Saved in localStorage under "fb-campaign"; a battle in progress is not saved, so refreshing mid-mission loses that attempt.
- Start: one random Light Side character. Map: 5 columns of portals between the Gateway and the Son, shuffled each campaign (easier tiers sit nearer the start). A portal opens when a neighbouring portal is cleared; unknown neighbours show as "???". Purple portals are optional Echo battles (XP only).
- Missions live in CP_MISSIONS (campaign-data.js): recruit, guests, slots, tier, waves (hp/lvl/skip per enemy), win (survive), protect, rules, special text, optional objectives. Guests fight at full power; recruits join the roster at Level 1.
- Levels: XP 60 = Level 2, 160 = Level 3; each level unlocks the next ability in the character text order. cpData() copies the roster entry with locked abilities removed; Health/Attack/Defense are never touched and R is never modified. Win = 60 XP (+25 per optional objective), Echo = 40, defeat = 20.
- Rules built on existing mechanics: waves, survive N rounds, protect, Force projection (no damage), floor (cannot drop below 1 Health), last stand (once), laser gate, hazard tiles, captives drained by Malak, timed events (Malak betrayal, Senate pods). Implemented as wrappers around render/hurt/die/vanish/stun/onlineBar that only act during a campaign battle.
- The Son is campaign-only (CP_SON), built from existing ability code (Intimidation, Force Lightning, Force Storm); unlocks after 12 cleared portals. Ben Skywalker vs Darth Caedus is a sealed portal until Caedus exists; Ben is still recruitable through "Grand Master". Rey has no mission and can only be a starting hero. Episode III Sidious missions use "Darth Sidious (The Phantom Menace)"; the throne room uses "Emperor Palpatine".
- Balance was checked by having the computer play both sides in headless Chrome (win rates per mission with Level 1-3 squads); see the commit/conversation for numbers.
- "The Awakening" (id starkiller): Rey alone vs a wounded Kylo Ren (9 Health, lvl:0 so no abilities), protect Rey, no optional objectives. slots:0 means no roster heroes may join (the briefing shows "must face this alone"). Rey is now recruitable through it.
- Saves made before a mission existed get its portal added on load (cpAddMissing): it goes in the biggest gap of its tier's column and links to the nearest portal on each side.
- Level 3 = Portal Vet (CP_VET, campaign-only passive): cpHero() gives the unit +1 Attack die, +1 Defense die and +2 Health on top of both abilities. Every Light Side character has two abilities, so it is always the third slot. Guests and enemies never get it.
- The Son uses portraits/theson.png; his ability icons (and Portal Vet's) are added to ABICON in campaign-data.js.
- Ben vs Caedus is flagged hidden:1: new maps leave it out, and cpHideRemoved() unlinks it from older saved maps (node ids are kept so progress isn't disturbed). Remove the flag to bring the portal back.

DARK SIDE CAMPAIGN (Nov 4)
- js/campaign-dark.js holds CP_MISSIONS_D (27 missions), CP_ECHO_D (Light Side echoes), CP_DAUGHTER (campaign-only final boss: Light of Mortis = Size Matters Not, Mortis Wave = Force Wave, Blinding Radiance = Battle Precognition; portrait portraits/thedaughter.png) and CP_BOSS_D.
- campaign.js is side-aware through CP_SIDES / CPS: each side has its own save (fb-campaign = Light, fb-campaign-dark = Dark), and fb-campaign-side remembers the last side played. The campaign menu shows both paths.
- New mission fields: waves {from:[...], label} (random enemy from a list, no repeats per battle), rules.arrive (enemy joins at a round, or early once the rest of its side falls), captives.free (team that frees captives), guestHp (a guest's Health in that mission only), opts killBy and drained.
- Darth Krayt: d_krayt (Obi-Wan, then Grand Master Luke and Ben Skywalker), thematic matchup; every Dark Side character is now recruitable.
- Mara Jade (Emperor's Hand): her +2d6 vs Luke was only matching Luke (Jedi Knight), because isLuke() checked startsWith('Luke'). isLuke() now matches any name containing 'Luke'.
- Balance (computer plays both sides, Level 1 squads, 40-50 games each): most missions 55-100%, tier 3 missions 55-80%. The Daughter: 63% with a Level 2 squad, 100% at Level 3 (Portal Vet).

NEW CHARACTERS 4 + ABILITY AUDIT (Nov 4): 72 characters
- Nomi Sunrider (L): 'nomi' aura (Old Republic or Jedi allies within 3 get +1d6 Defense, not herself), a_nsever (3d6 range 2; on damage: st.nopas = passives off this round, plus Stun). k() treats st.nopas like st.sever for passives only.
- Exar Kun (D): 'dblade' (+1d6 per adjacent enemy beyond the first, adjacent targets only), e_ruin (4d6 range 2, then 1 unblockable to every other character next to the target, friend or foe, not Exar).
- Kyp Durron (L): 'rawpow' (two or more 6s on an Attack roll = +2 unblockable damage, in att()), e_shadow (3 unblockable, push 2, Stun, range 2).
- Luuke Skywalker (D, Clone): 'luuke' (does NOT count as Luke; when he dies, every living unit with 'mara' (Mara Jade, Emperor's Hand) heals 4, handled in die()), a_clone (4d6 adjacent; st.cdef +1d6 Defense until his next turn if 2+ enemies were adjacent).
- Campaign: Light 'sithwar' (Nomi vs Exar 18 HP, 1 slot, ~80%) and 'academy' (Kyp vs Exar 14 HP, 1 slot, ~80%); Dark 'd_exar' (Nomi 8, then Kyp 8 + GM Luke 9, 2 slots, ~63%) and 'd_wayland' (Luuke vs Luke JK + Mara Jade Skywalker, 2 slots, ~75%).
- Audit: every Action/Epic was exercised in 400 random AI battles and direct tests. Fixes: isLuke (above); Order 66 now skips Jolee ('immune'); Ki-Adi's counter status text said 1 damage (it deals 2).
- AI: AI_EPV in ai.js scores the support Epics the computer never chose before (Shatterpoint, Battle Precognition, Sever Force, Order 66, Force Barrier, Orbalisk Armor Surge, One with the Force). e_ruin is scored with its splash.

COOLDOWNS (Nov 4)
- game.js: CD2 lists Actions that Stun or Taunt (cooldown 2); every other Action has cooldown 1; abCd(key) gives it. Using an Action sets u.cd[key] = round + cooldown + 1, so it skips that many following rounds. cdLeft(u,key) gives the rounds left (shown as a number on the button), and doAb refuses while it is above 0. back() restores u.cd from G.abSnap.
- Epic Actions (AB entries with ep) stay once per game and are locked until Round EPIC_READY (3). Automatic Epics (I Am a Jedi, All the Jedi, Snips' Counter, More Powerful Than You Can Imagine) and passives are not affected.
- The AI skips abilities on cooldown (aiBest). How to play explains the rule.
- Grand Master ('legends'): the second phase is now Exar Kun (12 HP, "the spirit haunting the Jedi academy") instead of the Nihilus stand-in.
- Rebalanced after cooldowns and the AI Epic change (100 sims each): jedha Vader 19 (~63%), legacy Talon/Nihl 11 and Krayt 14 (~54%), d_purge survivors 9 then 6 (~60%), d_malachor Kanan 9 / Ezra 8 / Ahsoka 12 (~66%). The Daughter is ~20-35% with a Level 2 squad and ~95-100% at Level 3.

DARK CAMPAIGN SIDE LABELS (Nov 4)
- In the campaign the player is always team 0. sideOf(t) in game.js flips team -> side when cpLive() && CPS=='D', so the turn/win bars and toasts say "Dark Side" for the player in the Dark campaign. Everywhere else sideOf(t) == t.
- Jedi tag restored (Nov 4): Bastila 'medit' (Old Republic OR Jedi), Satele 'resolve' (Old Republic OR Jedi), GM Luke 'guidance' (New Republic OR Jedi). Card text updated.

QEL-DROMA BROTHERS (Nov 9)
- Cay Qel-Droma (L): 'cay' passive handled in die() via caySacrifice(u, HITBY). HITBY is set only around the hurt() inside att(), so only attack kills trigger it. Killer is Stunned; an enemy 'Ulic Qel-Droma' switches team, gets a copied u.d with s:'L' and Jedi tag (Sith/Sith Empire/Dark Jedi removed), heals 4. If that empties his old team, Cay's team wins. In the campaign a team-0 (player) Ulic never converts.
  a_parry = Defensive Stance mechanics (Taunt + 1d6 Def until next turn), cooldown 2.
- Ulic Qel-Droma (D): 'passion' +1d6 Attack if 2+ adjacent enemies or Exar Kun on his team. a_bstrike = Sith Sorcery Smash mechanics (4d6 adjacent, Stun on 3+ dmg), cooldown 2.
- Campaign: 'sithwar' now recruits Nomi + Cay vs Exar 16 + Ulic 10 (~71% L1). New Dark 'd_ossus' "Brother Against Brother": Ulic (+1 slot) vs Cay 10 + Nomi 8 (~64% L1, ~78% L2). New opt condition c.notBy {n, t}: t died to a blow not landed by n.

HOLOTABLE UI (Nov 9)
- New theme layer appended at the end of css/style.css (overrides the older layers above it). Display font: Chakra Petch from Google Fonts (index.html), falls back to system fonts offline.
- Turn banner markup is now .bar.turnbar > .tb-side / .tb-round / .tb-hint (game.js render()).
- Phones (<=700px): board is edge to edge, .actionbar is a sticky bottom dock, .selection-actions is a fixed bottom dock (body:has(.selection-actions) adds bottom padding).
- Gotcha: never use the `background` shorthand on board cells that can hold a unit (.c.U); it resets the portrait's size. Highlight styles use :not(.U).

MAIN MENU TILES + IMAGES FOLDER (Nov 9)
- Portraits and icons moved to images/portraits/ and images/icons/; every path in characters.js, campaign-data.js, campaign-dark.js and iconSrc() in game.js points there.
- The main menu is a grid of mode tiles (MENU_MODES in net.js) plus a sidebar (Updates + Games in Progress placeholder). Tile art loads automatically from images/mainmenu/<id>.jpg, then .png, then .webp: lobbies, online, local, computer, campaign, squads. Best size 1280x720 (16:9), subject centred (phones crop to a narrow strip).
- Public Lobbies is a disabled "Coming soon" tile. Online Battle opens LOBBY.mode='online' with phase '' (the create/join screen); netHost/netJoin take it from there.

PUBLIC LOBBIES (Nov 9) - js/lobby.js
- No server of our own: a public host keeps its normal room (PeerJS id forcebattles-<CODE>) and also claims a beacon id forcebattles-pub<NETVER>-<0..15>. The lobby list connects to all 16 beacon ids; each live beacon replies {t:'pub', v, code, name, status:'open'|'picking'|'playing', round} and hangs up. Join = netJoin(code), so all room/resume logic is shared.
- NETVER is part of the beacon id, so bump NETVER whenever gameplay or characters change (now '10'); old and new versions never list each other.
- Scanning runs only while the main menu or Public Lobbies screen is open (every 20s / 10s) and only updates #gp-list / #pub-list, never a full render, so typing a name isn't interrupted.
- Beacon replies come from other browsers: pubClean() validates code/name/status before anything is shown.

JORUUS C'BAOTH + KYLE KATARN (BATTLEMASTER) (Nov 9)
- Joruus: 'cmad' in hurt() (adjacent enemies take 1 unblockable, guarded against loops by u.cmadOn); a_cbaoth = 3d6 range 2 with stun-on-damage, then G.mode='amove' on the ENEMY target with reach(t,1,1). ai.js handles an enemy G.mv by dropping it next to its own units.
- Kyle (Battlemaster): 'instr' in aDice (+1d6 for New Republic/Jedi allies within 2, not himself); a_bmcmd picks an NR/Jedi ally within 2 that can attack (bmTg: not Stunned / nopatk), then that ally makes a fixed 3d6 attack.
- Campaign: d_wayland recruits Luuke + Joruus (both fight as guests, slots 1). valley recruits Kyle + Kyle (Battlemaster) with guests:['Kyle Katarn'], so only young Kyle fights.

FACTION OVERHAUL (Nov 9) - js/factions.js (loaded right after characters.js)
- FACTIONS lists every faction with its tier (origin / broad / main / sub), icon (images/icons/factionicons/<icon>.png) and 4-unit bonus. Tags on every card are sorted at load: Origins, Broad (Jedi/Sith/Dark Jedi), Main, Sub. New factions just need a FACTIONS row.
- Force-Sensitive removed; Grievous is Non-Force Sensitive (origin). Sith Eternal removed (Emperor is Clone + Sith). Kylo Ren is First Order only. Luuke/Joruus: Imperial Remnant (sub) replaces Imperial. Barriss Offee (Fallen) is Dark Jedi.
- squadBonus(): a full squad (cost 4) whose members ALL share a faction; searched Sub > Main > Broad > Origin (FB_ORDER). start() stores it in G.fb[team] (campaign battles never call start(), so they have no bonus). fbk(team) = bonus key; fbU(u,key) = the unit's faction passive (off while Severed).
- Hooks: aDice/dDice (inq, or, sep, fo, merc bounty, sith + u.rage, dj, gr, jedi, salv, spark, st.cmd, st.dd), tf() (jedi ignores Taunt), stun() (nfs), hurt() (res spark, triv drain while G.abKey is set), fbDie() from die() (remnant, sith rage, clone respawn queue), fbRound() at round start (clone respawns at u.home, nr heal + cleanse), abCd(key,u) (imp), att() (onesith st.cmd, sithemp st.dd), doAtk (rebel Hit and Run via amove, once per round in G.hr), finish() (night respite after an Action).
- Dark Jedi: djPick('a'|'d') is a network INPUT; prompt shows on that side's turn until chosen each round (last choice carries over). AI picks Defense below half Health.
- Mercenary: the enemy with the most Health is marked automatically at the start (G.bounty).
- Darth Traya: cost 2 (SQUAD_COST). Passive 'lsab': spawnSabers() (called from start() and cpAdd) puts 3 LSABER tokens (d.token, 2 HP, 2d6, 1d6, mv 2, owner = Traya's id) next to her; aDice gives each token +1d6 per living saber (off while Traya is severed); trayaSafe() at the top of hurt() blocks all damage to her while any remain (aiHit returns 0). Tokens never go into G.dead (no revive), can't be Essence hosts, and dropTokens() kills them when Traya dies. reach() defaults to u.d.mv||4.
- Squad builders (local, online, saved squads) show fbPreview(); battle shows the bonus as a third passive (cls 'pas fac').
