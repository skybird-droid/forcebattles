// Factions: the order tags are shown in, their icons, and the 4-unit faction bonuses.
// Tag order on every card: Origins, Broad Faction, Main Faction, Sub-Faction.
// A squad whose members ALL share a faction gets that faction's bonus as an extra passive.
// Bonuses are searched Sub-Faction first, then Main, then Broad, then Origins, so the most specific wins
// (Inquisitorius beats Imperial, Rebel Alliance beats Jedi). Only Local, Online and VS Computer battles use them.
const FTIER = {origin:0, broad:1, main:2, sub:3};
const FACTIONS = [
  // Sub-Factions (checked first)
  {n:'Inquisitorius', tier:'sub', icon:'inquisitor', key:'inq', bonus:'Hunting Pack', desc:'All allies gain +1d6 Attack against targets that are Stunned or holding Taunt.'},
  {n:'Imperial Remnant', tier:'sub', icon:'empire', key:'remnant', bonus:'Desperate Salvage', desc:'When an ally is reduced to 0 Health, all surviving allies immediately recover 2 Health and gain +1d6 Defense for the rest of the round.'},
  {n:'Sith Triumvirate', tier:'sub', icon:'sith', key:'triv', bonus:'Triumvirate Drain', desc:'Whenever an enemy takes damage from one of your Actions or Epic Actions, all allies recover 1 Health.'},
  // Main Factions
  {n:'Galactic Republic', tier:'main', icon:'galacticrepublic', key:'gr', bonus:'Disciplined Defense', desc:'All allies gain +1d6 Defense while engaged with an enemy.'},
  {n:'Imperial', tier:'main', icon:'empire', key:'imp', bonus:'Tactical Supremacy', desc:'All Action cooldowns are reduced by 1 round (to a minimum of 1 round).'},
  {n:'New Republic', tier:'main', icon:'newrepublic', key:'nr', bonus:'Reconstruction Focus', desc:'At the start of each round, the ally with the lowest current Health recovers 2 Health and loses all negative status effects (including Stun).'},
  {n:'Old Republic', tier:'main', icon:'oldrepublic', key:'or', bonus:'Legacy of the Force', desc:'All allies roll an additional +1d6 on all Attack and Defense rolls during the first round of the match.'},
  {n:'Rebel Alliance', tier:'main', icon:'rebel', key:'rebel', bonus:'Hit and Run', desc:'Once per round, after an ally makes an Attack against an adjacent (engaged) enemy, they may immediately move 1 space, ignoring engagement.'},
  {n:'Resistance', tier:'main', icon:'rebel', key:'res', bonus:'Spark of Hope', desc:'Whenever an ally is reduced to 4 Health or below, they gain +1d6 Attack and +1d6 Defense for the rest of the match.'},
  {n:'Separatist', tier:'main', icon:'separatist', key:'sep', bonus:'Overwhelming Numbers', desc:'All allies add +1d6 Attack when attacking an enemy that is already engaged with at least one other ally.'},
  {n:'First Order', tier:'main', icon:'firstorder', key:'fo', bonus:'Aggressive Order', desc:'All allies gain +1d6 Attack on their first Attack each round.'},
  {n:'One Sith', tier:'main', icon:'onesith', key:'onesith', bonus:'Absolute Command', desc:'Whenever an ally deals 3 or more damage in a single attack, all other allies gain +1d6 Attack on their next attack that round.'},
  {n:'Sith Empire', tier:'main', icon:'sithempire', key:'sithemp', bonus:'Dark Dominion', desc:'Whenever an enemy takes damage from your attack, that enemy rolls -1d6 Defense against the next attack made against them that round.'},
  {n:'Mercenary', tier:'main', icon:'merc', key:'merc', bonus:'Cutthroat Contracts', desc:'At the start of the match, the enemy with the most Health is marked. All allies gain +1d6 Attack against the marked target until it is defeated.'},
  // Broad Factions
  {n:'Jedi', tier:'broad', icon:'jedi', key:'jedi', bonus:'Harmonious Will', desc:'All allies add +1d6 Defense. In addition, all allies are immune to enemy Taunt effects.'},
  {n:'Sith', tier:'broad', icon:'sith', key:'sith', bonus:'Dark Side Rage', desc:'All allies add +1d6 Attack. Whenever a Sith ally is defeated, all surviving Sith allies gain an additional +1d6 Attack for the rest of the match.'},
  {n:'Dark Jedi', tier:'broad', icon:'darkjedi', key:'dj', bonus:'Unpredictable Power', desc:'At the start of each round, choose +1d6 Attack or +1d6 Defense for all allies until the end of that round.'},
  // Origins (checked last)
  {n:'Clone', tier:'origin', icon:'clone', key:'clone', bonus:'Batch Respawn', desc:'The first time a Clone ally is defeated, they respawn at their starting space with 4 Health at the start of the next round.'},
  {n:'Night', tier:'origin', icon:'nightsisters', key:'night', bonus:"Sisters' Respite", desc:'Whenever an ally uses an Action, they deal 1 unblockable damage to every adjacent enemy and recover 1 Health.'},
  {n:'Non-Force Sensitive', tier:'origin', icon:'', key:'nfs', bonus:'Anti-Force', desc:'All allies are immune to Stun.'},
];
const FAC = Object.fromEntries(FACTIONS.map((f, i) => [f.n, Object.assign({i}, f)]));
const tagRank = t => FAC[t] ? FTIER[FAC[t].tier] * 100 + FAC[t].i : 999;
const tagSort = l => l.slice().sort((a, b) => tagRank(a) - tagRank(b));
R.forEach(r => { r.t = tagSort(r.t) });
// bonus search order: Sub-Faction, Main, Broad, Origins (master-list order inside each tier)
const FB_ORDER = FACTIONS.slice().sort((a, b) => FTIER[b.tier] - FTIER[a.tier] || FAC[a.n].i - FAC[b.n].i);
const fbShared = ds => ds.length ? FB_ORDER.find(f => ds.every(d => d.t.includes(f.n))) || null : null;
// the bonus a full squad (character data list) earns, or null
const squadBonus = ds => ds.reduce((s, d) => s + (d.cost || 1), 0) == SQUAD_SIZE ? fbShared(ds) : null;

// in battle: G.fb[team] is that side's bonus (campaign battles have none)
const fbk = t => typeof G != 'undefined' && G && G.fb && G.fb[t] ? G.fb[t].key : '';
const fbU = (u, key) => fbk(u.team) == key && !(u.st && (u.st.sever || u.st.nopas));   // a unit's faction passive (Sever Force turns it off)

// ---- display ----
const facIconSrc = t => FAC[t] && FAC[t].icon ? 'images/icons/factionicons/' + FAC[t].icon + '.png' : '';
const facIcon = t => facIconSrc(t) ? `<img class="fac-ic" src="${facIconSrc(t)}" alt="" onerror="this.remove()">` : '';
const tagChips = r => r.t.map(t => `<span>${facIcon(t)}${esc(t)}</span>`).join('');
// squad builder hint: which faction bonus this squad will get
function fbPreview(idx){
  const ds = idx.map(i => R[i]), cost = squadCost(idx), f = fbShared(ds);
  const box = (cls, ic, html) => `<div class="fb-preview ${cls}">${ic ? `<img src="${ic}" alt="" onerror="this.remove()">` : '<span class="fb-glyph" aria-hidden="true">⚑</span>'}<div>${html}</div></div>`;
  if (!ds.length) return box('', '', '<span class="fb-label">FACTION BONUS</span>Pick 4 characters who share a faction to add a bonus passive to your squad.');
  if (!f) return box('none', '', `<span class="fb-label">FACTION BONUS</span>None: these characters don't all share a faction.`);
  const what = `<b>${esc(f.bonus)}</b> <i>(${esc(f.n)})</i>: ${esc(f.desc)}`;
  if (cost < SQUAD_SIZE) return box('maybe', facIconSrc(f.n), `<span class="fb-label">FACTION BONUS IF THE REST ARE ${esc(f.n.toUpperCase())}</span>${what}`);
  return box('on', facIconSrc(f.n), `<span class="fb-label">FACTION BONUS</span>${what}`);
}

// ---- Darth Traya's Floating Lightsaber token (not a pickable character) ----
const LSABER = {n:'Floating Lightsaber', s:'D', t:[], h:2, a:2, d:0, mv:2, k:[], x:'', abs:[], img:'images/portraits/traya_lightsaber.png', token:1, cost:0};
