// What's New panel on the main menu (rendered in js/net.js).
// To announce a change, add a new entry at the TOP of this list. The newest entry
// shows on the menu, and players who haven't seen it yet get a "NEW" badge.
const UPDATES = [
  {date:'Nov 9, 2026', title:'Faction Bonuses, Public Lobbies and New Characters', items:[
    'Faction Bonuses: when all 4 members of your squad share a faction, they get an extra bonus passive. The squad builder shows which bonus your squad will get.',
    'The most specific faction wins: Sub-Factions first, then Main Factions, then Jedi, Sith or Dark Jedi, then Origins. Inquisitorius beats Imperial, and Rebel Alliance beats Jedi.',
    'Every faction has a bonus ready, even the ones that need more characters before you can field a full squad. Faction bonuses are not used in the Campaign.',
    'Faction tags now have icons and always show in the same order: Origin, Jedi/Sith/Dark Jedi, Main Faction, then Sub-Faction.',
    'Force-Sensitive is no longer a tag. General Grievous is now Non-Force Sensitive, and Barriss Offee (Fallen) is now a Dark Jedi.',
    'Sith Eternal is no longer a faction, and the Sith Eternal Emperor is now a Clone. Kylo Ren is no longer Sith. Luuke and Joruus are now Imperial Remnant instead of Imperial.',
    "Taron Malecos's Sith Sorcery Smash is now called Night Sorcery Smash.",
    "Darth Traya now counts as 2 in your squad. Telekinetic Saber Storm is replaced by a new passive, Floating Lightsabers: she starts every battle with 3 lightsabers beside her (2 Health, 2d6 Attack, no Defense, move 2), and she can't be defeated until all 3 are destroyed.",
    'Public Lobbies: host a game anyone can join, or browse open games and jump in. Games in Progress on the main menu shows who is waiting, picking squads or in battle.',
    "New Dark Side: Joruus C'baoth. New Light Side: Kyle Katarn (Battlemaster). 76 characters are now available.",
    "Joruus's Cloned Madness deals 1 damage to every adjacent enemy whenever he is hurt. His Force Lightning & Control Stuns and lets you move the target 1 space.",
    "Kyle (Battlemaster) gives nearby New Republic and Jedi allies +1d6 Attack, and his Battlemaster Command lets one of them make a free 3d6 Attack.",
    "Campaign: Joruus C'baoth fights beside Luuke on Wayland and joins you when you win. Winning the Valley of the Jedi also unlocks Kyle Katarn (Battlemaster).",
    'New holotable look: a glowing tactical grid board, war-room panels, sharper buttons and a new title font.',
    'New main menu: every mode now has its own tile (Public Lobbies, Online Battle, Local Skirmish, VS Computer, Campaign and Saved Squads), with Updates and Games in Progress on the side.',
    'Online Battle now opens its own screen where you create a private room or join one with a code.',    'Better on phones: the board fills the screen width, the turn banner is shorter, your unit\'s actions dock to the bottom of the screen, and Start battle stays docked at the bottom while you pick your squad.',
    'New Light Side: Cay Qel-Droma. New Dark Side: Ulic Qel-Droma. 74 characters are now available.',
    "Cay's Brotherly Sacrifice: when an enemy attack defeats him, his killer is Stunned, and an enemy Ulic is redeemed. Ulic turns to the Light Side, joins Cay's team as a Jedi and heals 4.",
    'Ulic gets +1d6 Attack when 2 or more enemies surround him or when Exar Kun is on his team. His Sith Brotherhood Strike Stuns on 3 or more damage.',
    'The Sith War: Cay Qel-Droma now fights beside Nomi Sunrider, and Ulic Qel-Droma stands with Exar Kun. If Cay falls while Ulic still fights, Ulic joins your side.',
    "New Dark Side mission, Brother Against Brother: Ulic faces Cay and Nomi on Ossus. Bonus objective: don't let Ulic land the final blow on his brother.",
    "In the campaign, your own Ulic never switches sides when Cay falls.",
  ]},
  {date:'Nov 4, 2026', title:'Cooldowns, New Characters and the Dark Side Campaign', items:[
    'Ability cooldowns: an Action that Stuns or Taunts recharges for 2 rounds after use, and every other Action for 1 round. A number on the button shows the rounds left.',
    'Epic Actions are still once per game, but they can only be used from Round 3. Passives, Attacks and automatic Epics have no cooldown.',
    'New Light Side: Nomi Sunrider and Kyp Durron. New Dark Side: Exar Kun and Luuke Skywalker. 72 characters are now available.',
    'New Dark Side path in the World Between Worlds: start with one random Sith or Dark Side warrior and recruit 35 more.',
    '27 new missions from the Dark Side point of view, from Duel of the Fates and the Arrest to Malachor, Exegol and the Star Forge.',
    'Darth Krayt gets his own mission: defeat Obi-Wan Kenobi, then Grand Master Luke and Ben Skywalker.',
    'Exar Kun faces Nomi Sunrider, then Kyp Durron and Grand Master Luke. Luuke fights Luke and Mara Jade on Wayland.',
    'New Light Side missions: Nomi Sunrider leads the Jedi against Exar Kun, and Kyp Durron confronts the Sith spirit that corrupted him.',
    'Grand Master: the spirit of Exar Kun now haunts the Jedi academy in the second phase, replacing Darth Nihilus.',
    'Campaign balance for the new rules: Vader has 19 Health on Jedha, Talon, Nihl and Krayt are weaker in The One Sith, the Purge survivors have 9 then 6 Health, and the Jedi on Malachor have less Health.',
    'New twists: Jedi who arrive mid-battle, random Order 66 survivors and Jedi voices, and Malak draining captive Jedi for Health.',
    'The Dark Side final boss is the Daughter, the embodiment of the Light Side from Mortis, now with her own portrait.',
    'The Light and Dark campaigns are saved separately, so you can play both.',
    "Fix: Mara Jade (Emperor's Hand) now gets her +2d6 Attack and 4-Health recovery against Grand Master Luke and Jedi Master Luke, not just Luke (Jedi Knight).",
    'The computer now uses Shatterpoint, Battle Precognition, Sever Force, Execute Order 66, Force Barrier, Orbalisk Armor Surge and One with the Force.',
    "Luuke Skywalker: Genetic Identity now works differently. When Luuke is defeated, Mara Jade (Emperor's Hand) recovers 4 Health. He no longer counts as Luke Skywalker.",
    "Jedi allies count again for Bastila's Battle Meditation, Satele's Grand Master's Resolve and Grand Master Luke's Grand Master's Guidance, alongside their own faction.",
    "Dark Side campaign: the turn banner now says Dark Side's turn on your turns and Light Side's turn on the enemy's, instead of the other way round.",
    "Execute Order 66 can no longer target Jolee Bindo, who is immune to enemy abilities. Ki-Adi-Mundi's Defensive Counter status now shows the correct 2 damage.",
  ]},
  {date:'Nov 3, 2026', title:'World Between Worlds Campaign', items:[
    'New single-player Light Side campaign: explore a randomized map of portals in the World Between Worlds.',
    'Start with one random Light Side hero and rescue 33 more by reliving iconic duels, from the Duel of the Fates to the Star Forge.',
    'Missions have waves, survival objectives, hazards, captives to free, scripted moments and optional objectives for bonus experience.',
    "Heroes level up to Level 3. Levels 1 and 2 unlock their abilities, and Level 3 grants Portal Vet: +1d6 Attack, +1d6 Defense and +2 Health. Multiplayer isn't affected.",
    'Clear 12 portals to open the way to the final boss: the Son, now with his own portrait and ability icons.',
    'New campaign mission, The Awakening: Rey faces a wounded Kylo Ren alone on Starkiller Base. Win to add Rey to your roster.',
    "Ben Skywalker's sealed portal has been removed from the map for now. You can still rescue Ben in Grand Master.",
  ]},
  {date:'Nov 1, 2026', title:'VS Computer and Character Overhaul', items:[
    'New VS Computer mode: pick a side and a squad, then battle a computer opponent with a random squad.',
    "Barriss Offee (Fallen) loses Saber Disarm; she keeps Betrayer's Guile and Healer's Touch.",
    "Automatic Epics (like Rey's All the Jedi and Ahsoka's Snips' Counter) now have gold borders.",
    'Board tiles show only portraits, Health and status. Hover a tile to see its name.',
    'Jedi and Sith tags no longer power ally bonuses. Bastila, Satele, Grand Master Luke, Talzin and Bane now boost their own faction.',
    'Ahsoka (Padawan) makes a free attack whenever an allied Anakin uses Tempered Rage.',
    "Cade's Dark Transfer is now an Epic that brings a defeated ally back with 4 Health.",
    'Ezra gains Epic Call of the Purrgil: he and a Stunned enemy within 4 are both defeated.',
    'Kyle Katarn: Force Absorb is now a passive that blocks Stuns.',
    'Rey: All the Jedi now triggers automatically the first time she would be Stunned.',
    'Count Dooku gets Force Lightning, and Darth Vader gets Force Choke.',
    'Sith Eternal Emperor: Essence Transfer can take over a nearby friend or enemy when he falls.',
  ]},
  {date:'Oct 26, 2026', title:'New Republic and One Sith', items:[
    'New Light Side: Grand Master Luke Skywalker, Mara Jade Skywalker, Cade Skywalker, Ben Skywalker.',
    'New Dark Side: Darth Krayt, Darth Nihl, Darth Wyyrlok III, Darth Stryfe.',
    '68 characters are now available.',
  ]},
  {date:'Oct 25, 2026', title:'Saved Squads and Balance', items:[
    'Saved Squads: build and name squads, then load them in one click before a battle.',
    'Click your selected character again to deselect them. A new Stay in place button keeps them where they are.',
    'Backing out of an Epic Action no longer uses it up.',
    'Big balance pass: Bastila, Cal, Anakin and Grievous were nerfed, and many Light and Dark characters were buffed.',
  ]},
  {date:'Oct 24, 2026', title:'New Characters', items:[
    'New Light Side: Padawan Obi-Wan, Depa Billaba, Rey, Jedi Master Luke.',
    'New Dark Side: Sith Eternal Emperor, Kylo Ren, Darth Talon, Darth Bane (counts as three squad slots).',
    'Damage numbers, dice cards, sounds, a colour-coded battle log and a How to play guide.',
    'Refreshed or dropped online matches can be resumed.',
  ]},
];

const UPD_KEY = 'fb-updates-seen';
let UPD_ALL = false;
const updId = u => u.date + '|' + u.title;
function updSeen() { try { return localStorage.getItem(UPD_KEY) == updId(UPDATES[0]); } catch (e) { return true; } }
function updToggle() {
  UPD_ALL = !UPD_ALL;
  try { localStorage.setItem(UPD_KEY, updId(UPDATES[0])); } catch (e) {}
  render();
}
function updEntry(u) {
  return `<div class="upd-entry"><div class="upd-head"><b>${esc(u.title)}</b><span>${esc(u.date)}</span></div><ul>${u.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
}
function updatesPanel() {
  if (!UPDATES.length) return '';
  const fresh = !updSeen(), list = UPD_ALL ? UPDATES : UPDATES.slice(0, 1);
  return `<section class="menu-panel updates-panel">
      <div class="panel-icon">✦</div><div class="panel-eyebrow">WHAT'S NEW${fresh ? ' <span class="upd-new">NEW</span>' : ''}</div>
      <h3>Updates</h3>${list.map(updEntry).join('')}
      ${UPDATES.length > 1 ? `<button class="btn-secondary btn-wide" onclick="updToggle()">${UPD_ALL ? 'Show latest only' : `See all updates (${UPDATES.length})`} <span aria-hidden="true">${UPD_ALL ? '↑' : '↓'}</span></button>` : ''}
    </section>`;
}
