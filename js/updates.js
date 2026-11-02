// What's New panel on the main menu (rendered in js/net.js).
// To announce a change, add a new entry at the TOP of this list. The newest entry
// shows on the menu, and players who haven't seen it yet get a "NEW" badge.
const UPDATES = [
  {date:'Nov 1, 2026', title:'Character Overhaul', items:[
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
