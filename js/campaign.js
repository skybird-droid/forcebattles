// Single-player campaign: the World Between Worlds (Light Side path).
// Missions run on the normal battle engine with the computer (js/ai.js) playing the enemy side.
// Campaign-only rules (waves, survival, hazards, captives, projections) are layered on through small
// wrappers around render/hurt/die/stun, and only act while a campaign battle is running.
// Levels 1-2 unlock a character's abilities: a unit's character data is copied with locked abilities removed.
// Level 3 adds the campaign-only Portal Vet passive (+1 Attack die, +1 Defense die, +2 Health). The roster R is never modified.
const CP_XP = [0, 60, 160], CP_BOSS_NEED = 12, CP_LASTKEY = 'fb-campaign-side';
// Each side is its own campaign with its own save, missions, echoes and final boss.
const CP_SIDES = {
  L:{key:'fb-campaign', name:'LIGHT SIDE', foe:'D', missions:() => CP_MISSIONS, boss:() => CP_BOSS, unit:() => CP_SON, echo:() => CP_ECHO,
     who:'heroes', got:'rescued', Got:'Rescued', echoes:'Random Dark Side echoes', echoOf:'An echo of a Sith you defeated', bossWin:'Victory over the Dark Side.',
     title:'Rescue the Jedi', blurb:'Begin with one random Light Side hero. Explore a new, randomized map each campaign, recruit up to {n} heroes, and confront the Son, the embodiment of the Dark Side.',
     intro:'Every hero you rescue joins your roster.', roster:'Your rescued heroes.', final:'✦ The Son is defeated. The World Between Worlds is safe, for now. Your campaign continues: rescue every remaining hero.'},
  D:{key:'fb-campaign-dark', name:'DARK SIDE', foe:'L', missions:() => CP_MISSIONS_D, boss:() => CP_BOSS_D, unit:() => CP_DAUGHTER, echo:() => CP_ECHO_D,
     who:'warriors', got:'recruited', Got:'Recruited', echoes:'Random Light Side echoes', echoOf:'An echo of a Jedi you defeated', bossWin:'Victory over the Light Side.',
     title:'Rise of the Sith', blurb:'Begin with one random Dark Side warrior. Explore a new, randomized map each campaign, recruit up to {n} Sith and Dark Side warriors, and confront the Daughter, the embodiment of the Light Side.',
     intro:'Every warrior who wins a battle beside you joins your roster.', roster:'Your Dark Side warriors.', final:'✦ The Daughter is defeated. The World Between Worlds falls into shadow. Your campaign continues: recruit every remaining warrior.'},
};
let CPS = 'L';                                             // side being played
const cpSide = () => CP_SIDES[CPS];
let CP = null;                                             // saved campaign for that side
let CPV = {view:'home', node:null, squad:[], confirm:0};   // campaign screen state
let CPB = null;                                            // running campaign battle
parseAbs(CP_SON); parseAbs(CP_DAUGHTER);

function cpPeek(side){ try { const s = JSON.parse(localStorage.getItem(CP_SIDES[side].key) || 'null'); return s && s.v == 1 ? s : null } catch (e) { return null } }
function cpLoad(side = CPS){ CPS = side; CP = cpPeek(side); if (CP) { CP.side = side; cpHideRemoved(); cpAddMissing() } }
// portals for hidden missions are cut off from older maps (node ids stay put, so progress is untouched)
function cpHideRemoved(){
  CP.nodes.forEach(n => { if (n.t != 'mission' || !(cpMission(n.m) || {hidden:1}).hidden) return;
    n.l.forEach(id => { const b = CP.nodes[id]; b.l = b.l.filter(x => x != n.id) }); n.l = []; n.gone = 1 });
}
// missions added after a campaign began get a portal in the largest gap of their tier's column
function cpAddMissing(){
  const N = CP.nodes, have = new Set(N.map(n => n.m)), byY = (L, y) => L.slice().sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y));
  cpSide().missions().filter(m => !m.locked && !have.has(m.id)).forEach(m => {
    const ci = Math.min(4, (m.tier - 1) * 2), col = N.filter(n => n.col === ci).sort((a, b) => a.y - b.y);
    const ys = [10, ...col.map(n => n.y), 590]; let y = 300, gap = 0;
    for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > gap) { gap = ys[i] - ys[i - 1]; y = Math.round((ys[i] + ys[i - 1]) / 2) }
    const n = {id:N.length, t:'mission', m:m.id, col:ci, x:200 + ci * 140, y, l:[]}; N.push(n);
    const link = b => { if (!n.l.includes(b.id)) { n.l.push(b.id); b.l.push(n.id) } };
    if (ci == 0) link(N[0]); else link(byY(N.filter(b => b.col === ci - 1), y)[0]);
    const nxt = byY(N.filter(b => b.col === ci + 1 && !b.locked), y)[0]; if (nxt) link(nxt);
  });
  cpSave();
}
function cpSave(){ try { localStorage.setItem(cpSide().key, JSON.stringify(CP)); localStorage.setItem(CP_LASTKEY, CPS) } catch (e) {} }
const cpRec = n => R.find(r => r.n == n);
const cpMission = id => { const S = cpSide(); return id == S.boss().id ? S.boss() : id == 'echo' ? S.echo() : S.missions().find(m => m.id == id) };
const cpLevel = n => { const x = (CP.roster[n] || {}).xp || 0; return x >= CP_XP[2] ? 3 : x >= CP_XP[1] ? 2 : 1 };
const cpShort = n => n.replace(/ \(.*\)/, '');
const cpCleared = () => CP.nodes.filter(n => n.t == 'mission' && CP.done[n.id]).length;
const cpRecruitable = (side = CPS, cp = CP) => new Set([...(cp ? [cp.start] : []), ...CP_SIDES[side].missions().filter(m => !m.locked && !m.hidden).flatMap(m => m.recruit)]).size;
const cpLive = () => !!CPB && !!G && CPB.g === G;

// ---- levels: a copy of the character data with only the unlocked abilities ----
function cpData(r, lvl, skip = []){
  const abs = r.abs, keep = abs.slice(0, Math.min(lvl, abs.length)).filter(a => !skip.includes(a.name));
  const pas = abs.filter(a => a.type == 'Passive'), pk = r.k.filter(q => !/^[ae]_/.test(q));
  const own = a => { const i = pas.indexOf(a); return pas.length == 1 ? pk : i < pas.length - 1 ? [pk[i]] : pk.slice(i) };   // passive keys, in order
  const ks = new Set(); keep.forEach(a => { if (a.type == 'Passive') own(a).forEach(q => ks.add(q)); else if (a.key) ks.add(a.key) });
  const d = Object.assign({}, r, {k:r.k.filter(q => ks.has(q)), x:keep.map(a => `${a.type} ${a.name}: ${a.desc}`).join(' ')});
  parseAbs(d); return d;
}
// Level 3: Portal Vet, a campaign-only passive (every Light Side hero has two abilities, so it is always the third)
const CP_VET = {type:'Passive', name:'Portal Vet', src:'World Between Worlds', desc:'+1d6 Attack, +1d6 Defense and +2 Health. Earned by reaching Level 3 in the World Between Worlds.'};
const cpAbs = n => [...cpRec(n).abs, CP_VET];
function cpHero(n){
  const lvl = cpLevel(n), d = cpData(cpRec(n), lvl);
  if (lvl < 3) return d;
  return Object.assign(d, {h:d.h + 2, a:d.a + 1, d:d.d + 1, abs:[...d.abs, CP_VET]});
}

// ---- map: columns of portals between the Gateway and the Son ----
function cpNewMap(){
  const order = cpSide().missions().filter(m => !m.locked && !m.hidden).map(m => ({id:m.id, s:m.tier + Math.random() * 1.6})).sort((a, b) => a.s - b.s);
  const C = [[], [], [], [], []], per = order.length / 5;
  order.forEach((o, i) => C[Math.min(4, Math.floor(i / per))].push({t:'mission', m:o.id}));
  C.forEach(c => c.push({t:'echo', m:'echo'}));
  C[1 + Math.floor(Math.random() * 3)].push({t:'echo', m:'echo'});
  cpSide().missions().filter(m => m.locked && !m.hidden).forEach(m => C[4].push({t:'mission', m:m.id, locked:1}));
  const nodes = [{id:0, t:'start', x:70, y:300, l:[]}];
  C.forEach((c, ci) => {
    shuf(c); const gap = 520 / Math.max(1, c.length - 1);   // keep portals and their labels apart
    c.forEach((n, i) => nodes.push(Object.assign(n, {id:nodes.length, col:ci, x:200 + ci * 140 + Math.round(Math.random() * 30 - 15), y:Math.round(c.length == 1 ? 300 : 40 + i * gap + Math.random() * 10 - 5), l:[]})));
  });
  const boss = {id:nodes.length, t:'boss', m:cpSide().boss().id, x:930, y:300, l:[]}; nodes.push(boss);
  const link = (a, b) => { if (a !== b && !a.l.includes(b.id)) { a.l.push(b.id); b.l.push(a.id) } };
  const col = i => nodes.filter(n => n.col === i), byY = (L, y) => L.slice().sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y));
  byY(col(0), 300).slice(0, 3).forEach(n => link(nodes[0], n));
  for (let i = 0; i < 4; i++) {
    const A = col(i), B = col(i + 1);
    A.forEach(a => { const s = byY(B, a.y); link(a, s[0]); if (Math.random() < .45 && s[1]) link(a, s[1]) });
    B.forEach(b => { if (!b.l.some(id => nodes[id].col === i)) link(b, byY(A, b.y)[0]) });
  }
  for (let i = 0; i < 5; i++) { const L = col(i).sort((a, b) => a.y - b.y); for (let j = 1; j < L.length; j++) if (Math.random() < .3) link(L[j - 1], L[j]) }
  byY(col(4).filter(n => !n.locked), 300).slice(0, 3).forEach(n => link(boss, n));
  // every open portal must be reachable without passing through a sealed one
  for (;;) {
    const seen = new Set([0]), q = [0];
    while (q.length) { const n = nodes[q.shift()]; if (n.locked || n.t == 'boss') continue; n.l.forEach(id => { if (!seen.has(id)) { seen.add(id); q.push(id) } }) }
    const miss = nodes.find(n => !seen.has(n.id)); if (!miss) break;
    const ok = nodes.filter(n => seen.has(n.id) && !n.locked && n.t != 'boss' && (n.col ?? -1) < (miss.col ?? 5));
    link(miss, byY(ok.length ? ok : [nodes[0]], miss.y)[0]);
  }
  return nodes;
}
// done / open / seen (a mystery portal next to an open one) / hidden
function cpStatus(){
  const st = {}, N = CP.nodes, done = n => n.t == 'start' || CP.done[n.id];
  N.forEach(n => {
    if (done(n)) st[n.id] = 'done';
    else if (n.l.some(id => done(N[id]))) st[n.id] = n.locked ? 'locked' : n.t == 'boss' && cpCleared() < CP_BOSS_NEED ? 'sealed' : 'open';
  });
  N.forEach(n => { if (!st[n.id]) st[n.id] = n.t == 'boss' ? 'far' : n.l.some(id => st[id] == 'open' || st[id] == 'done') ? 'seen' : 'hidden' });
  return st;
}

// ---- starting, opening and leaving ----
// opens on the side played last; the campaign menu lets you switch sides
function cpOpen(){ let s = 'L'; try { s = localStorage.getItem(CP_LASTKEY) == 'D' ? 'D' : 'L' } catch (e) {} cpLoad(s); LOBBY.mode = 'camp'; CPV = {view:CP ? 'map' : 'home', node:null, squad:[], confirm:0}; render() }
function cpHome(){ CPV.view = 'home'; CPV.confirm = 0; render() }
function cpContinue(side){ cpLoad(side); cpSave(); CPV.confirm = 0; cpView(CP ? 'map' : 'home') }
function cpNew(side = CPS){
  if (cpPeek(side) && CPV.confirm !== side) { CPV.confirm = side; render(); return }
  CPS = side;
  const L = R.filter(r => r.s == side), s = L[Math.floor(Math.random() * L.length)];
  CP = {v:1, side, start:s.n, roster:{[s.n]:{xp:0}}, order:[s.n], nodes:cpNewMap(), done:{}, best:{}, beaten:[], won:0, last:null, squad:[]};
  cpSave(); CPV = {view:'intro', node:null, squad:[], confirm:0}; render();
}
function cpView(v){ CPV.view = v; if (v != 'map') CPV.node = null; render() }
function cpPick(id){
  const st = cpStatus()[id]; if (!['open', 'done', 'locked', 'sealed'].includes(st) || CP.nodes[id].t == 'start') return;
  CPV.node = id; const m = cpMission(CP.nodes[id].m);
  const free = n => CP.roster[n] && !(m.guests || m.recruit || []).includes(n);
  CPV.squad = (CP.squad || []).filter(free).slice(0, m.slots);
  if (!CPV.squad.length) CPV.squad = CP.order.filter(free).slice(0, m.slots);
  render(); const b = document.getElementById('cp-brief'); if (b && b.scrollIntoView) b.scrollIntoView({behavior:'smooth', block:'start'});
}
function cpToggle(k){
  const n = CP.order[k], m = cpMission(CP.nodes[CPV.node].m), i = CPV.squad.indexOf(n);
  if (i >= 0) CPV.squad.splice(i, 1); else if (CPV.squad.length < m.slots) CPV.squad.push(n);
  render();
}

// ---- building a battle ----
function cpWaves(m){
  const foes = R.filter(r => r.s == cpSide().foe && r.cost < 3).map(r => r.n), pool = CP.beaten.filter(n => foes.includes(n));
  const pick = (L, used) => { L = L.filter(n => !used.includes(n)); return L[Math.floor(Math.random() * L.length)] };
  const pickEcho = used => pick(pool.some(n => !used.includes(n)) ? pool : foes, used);
  if (m.id == 'echo') { const used = []; for (let i = 0; i < 1 + Math.min(2, Math.floor(cpCleared() / 5)); i++) used.push(pickEcho(used)); return [used.map(n => ({n}))] }
  const used = m.waves.flat().filter(s => s.n).map(s => s.n);
  return m.waves.map(w => w.map(s => {
    if (s.echo) { const n = pickEcho(used); used.push(n); return {n, as:'an echo'} }
    if (s.from) { const n = pick(s.from, used) || pick(s.from, []); used.push(n); return Object.assign({}, s, {n, as:s.as || `a random ${s.label || 'foe'}`}) }
    return s;
  }));
}
// at least one of your own heroes must go, unless every hero you own is already fighting as a guest
function cpCanGo(m, guests){
  const free = CP.order.filter(n => !guests.includes(n)).length, n = CPV.squad.length;
  return n >= Math.min(m.minSquad || 1, free, m.slots) &&(n > 0 || (guests.length > 0 && !m.minSquad)) && n <= m.slots;
}
function cpUnitData(s){ let d = s.son || s.boss ? cpSide().unit() : cpRec(s.n); if (s.lvl != null || s.skip) d = cpData(d, s.lvl ?? 3, s.skip); return s.hp ? Object.assign({}, d, {h:s.hp}) : d }
function cpFree(rows){ const a = []; rows.forEach(y => { for (let x = 0; x < 8; x++) if (!occ(x, y)) a.push([x, y]) }); return shuf(a) }
function cpAdd(d, team, c, lvl){
  const u = {d, team, x:c[0], y:c[1], hp:d.h, st:{}, used:0, ep:0, id:G.u.length, cp:{lvl}}, r = CPB.m.rules || {};
  if ((r.proj || []).includes(d.n)) u.cp.proj = 1;
  if ((r.floor || []).includes(d.n)) u.cp.floor = 1;
  if ((r.lastStand || []).includes(d.n)) u.cp.last = 1;
  G.u.push(u); return u;
}
function cpSpawn(i){
  const spots = cpFree([0, 1]).concat(cpFree([2, 3]));
  CPB.waves[i].forEach(s => { const u = cpAdd(cpUnitData(s), 1, spots.shift()); if (s.as) log(`🌀 ${u.d.n} appears (${s.as})`) });
}
// rules.arrive: an enemy joins mid-battle, at its round or as soon as the rest of the enemy side is down
function cpArrive(early){
  const due = CPB.arrive.filter(a => early || a.round <= CPB.round); if (!due.length) return 0;
  CPB.arrive = CPB.arrive.filter(a => !due.includes(a));
  const spots = cpFree([0, 1]).concat(cpFree([2, 3]));
  due.forEach(a => { log((early && a.early) || a.text || `🌀 ${a.n} arrives!`); cpAdd(cpUnitData(a), 1, spots.shift()); CPB.waves[CPB.wave].push(a) });
  enforcerTaunt(); return 1;
}
function cpStart(){
  const node = CP.nodes[CPV.node], m = cpMission(node.m), guests = (m.guests || m.recruit || []).filter(n => cpRec(n));
  if (!cpCanGo(m, guests)) return;
  CP.squad = CPV.squad.slice(); cpSave();
  prng = Math.random;
  G = {u:[], dead:[], log:[], turn:0, round:1, sel:null, mode:null, win:null, ben:[0, 0]};
  CPB = {g:G, m, node, squad:CPV.squad.slice(), waves:cpWaves(m), wave:0, round:0, deaths:[], stun:0, hazHit:0, haz:[], caps:[], freed:0, waveRound:[], done:0, why:'', busy:0, rq:0, arrive:((m.rules || {}).arrive || []).slice(), drained:0};
  const home = cpFree([7, 6]);
  guests.forEach(n => { const d = cpRec(n), h = (m.guestHp || {})[n]; cpAdd(h ? Object.assign({}, d, {h}) : d, 0, home.shift(), 3) });
  CPB.squad.forEach(n => cpAdd(cpHero(n), 0, home.shift(), cpLevel(n)));
  cpSpawn(0);
  AI = {side:1, timer:null, acting:0, busy:0, plan:null, tgt:null, steps:0};
  log(`🌀 ${m.title}: ${m.main}`);
  enforcerTaunt(); CPV.view = 'battle'; render();
}

// ---- encounter rules, checked before every screen update ----
function cpCells(n, rows){ const a = cpFree(rows).filter(([x, y]) => !CPB.haz.some(h => h[0] == x && h[1] == y) && !CPB.caps.some(c => c[0] == x && c[1] == y)); return a.slice(0, n) }
function cpRoundStart(){
  const r = CPB.m.rules || {}, n = CPB.round, win = CPB.m.win || {};
  if (win.type == 'survive' && n > win.rounds) { G.win = 0; log(win.end || `🛡 You held out for ${win.rounds} rounds!`); return }
  if (win.type == 'survive') log(`⏳ Hold out: Round ${n} of ${win.rounds}`);
  if (r.gate) { const u = live(0).find(v => v.d.n == r.gate.n); if (u) { if (n <= r.gate.rounds) { u.used = 1; if (n == 1) log(`🚧 Laser gates hold ${u.d.n} back until Round ${r.gate.rounds + 1}`) } else if (n == r.gate.rounds + 1) log(`🚧 The laser gates open! ${u.d.n} rushes in`) } }
  if (r.hazard) {
    if (n > 1) CPB.haz.forEach(([x, y]) => { const u = occ(x, y); if (u && !u.dead) { log(`🔥 ${u.d.n} is caught in the ${r.hazard.label.toLowerCase()}`); if (u.team == 0) CPB.hazHit = 1; hurt(u, r.hazard.dmg) } });
    CPB.haz = []; CPB.haz = cpCells(r.hazard.n, [2, 3, 4, 5]);
  }
  if (r.captives) {
    if (n == 1) { CPB.caps = cpCells(r.captives.n, [2, 3, 4]); log(r.captives.text || `⛓ ${r.captives.n} captive Jedi are held near ${r.captives.by}. Move next to them to free them`) }
    else { const by = live().find(v => v.d.n == r.captives.by); if (by && CPB.caps.length) { CPB.caps.splice(Math.floor(Math.random() * CPB.caps.length), 1); CPB.drained++; heal(by, r.captives.heal); log(`🩸 ${by.d.n} drains the life of a captive Jedi (+${r.captives.heal} Health)`) } }
  }
  if (CPB.arrive.length) cpArrive(false);
  (r.events || []).filter(e => e.round == n).forEach(e => {
    if (e.hurt) { const u = live().find(v => v.d.n == e.hurt.n); if (u) { log(e.text); hurt(u, e.hurt.dmg); if (!u.dead && e.hurt.stun) stun(u) } }
    if (e.pod) {
      const y = live(0).find(v => v.d.n == e.pod), s = live(1)[0], t = live(0).filter(v => !v.cp.proj);
      if (y && s) { log(`🏛 Sidious hurls a Senate pod, but ${cpShort(y.d.n)} catches it and hurls it back!`); hurt(s, 3) }
      else if (t.length) { const v = t[Math.floor(Math.random() * t.length)]; log(`🏛 Sidious hurls a Senate pod at ${v.d.n}!`); hurt(v, 3) }
    }
  });
}
function cpCheck(){
  if (!cpLive() || CPB.busy) return; CPB.busy = 1;
  try {
    while (G.win == null && CPB.round < G.round) { CPB.round++; cpRoundStart() }
    if (CPB.caps.length) CPB.caps = CPB.caps.filter(c => { const u = live(((CPB.m.rules || {}).captives || {}).free || 0).find(v => dist(v, {x:c[0], y:c[1]}) <= 1); if (u) { CPB.freed++; log(`🔓 ${u.d.n} frees a captive Jedi`) } return !u });
    if (G.win == null) { const f = G.u.find(u => u.team == 0 && u.dead && (CPB.m.protect || []).includes(u.d.n)); if (f) { G.win = 1; CPB.why = `${f.d.n} has fallen.` } }
    if (G.win == null && G.u.some(u => u.cp.proj) && !live(0).some(u => !u.cp.proj)) { G.win = 1; CPB.why = 'The rest of your squad has fallen.' }
    if (G.win === 0 && CPB.arrive.length) { G.win = null; G.pend = null; cpArrive(true); if (G.sel) finish(); else if (!avail(G.turn)) nextTurn() }
    if (G.win === 0 && CPB.wave < CPB.waves.length - 1) {
      CPB.waveRound[CPB.wave] = G.round; CPB.wave++; G.win = null; G.pend = null;
      const t = ((CPB.m.rules || {}).waveText || [])[CPB.wave]; log(t || `🌀 Phase ${CPB.wave + 1} of ${CPB.waves.length}: new enemies emerge from the portal!`);
      cpSpawn(CPB.wave); enforcerTaunt();
      if (G.sel) finish(); else if (!avail(G.turn)) nextTurn();
    }
    if (G.win == null && !G.sel && !G.pend && !avail(G.turn)) nextTurn();
    if (G.win != null && !CPB.done) { CPB.done = 1; if (G.win === 0) CPB.waveRound[CPB.wave] = G.round; cpResult() }
  } finally { CPB.busy = 0 }
}
function cpMark(u){ if (!cpLive() || u.cpM) return; u.cpM = 1; CPB.deaths.push({n:u.d.n, team:u.team, by:G.sel && G.sel.d.n, wave:CPB.wave, round:G.round}) }
function cpOpt(c){
  const mine = n => G.u.find(u => u.team == 0 && u.d.n == n), foe = n => G.u.find(u => u.team == 1 && u.d.n == n);
  if (c.rounds) return G.round <= c.rounds;
  if (c.alive) return c.alive.every(n => { const u = mine(n); return u && !u.dead });
  if (c.noLoss) return !G.u.some(u => u.team == 0 && u.dead);
  if (c.finisher) return CPB.deaths.some(d => d.team == 1 && d.n == c.finisher.t && d.by == c.finisher.n);
  if (c.notBy) return CPB.deaths.some(d => d.team == 1 && d.n == c.notBy.t && d.by != c.notBy.n);
  if (c.noStun) return !CPB.stun;
  if (c.captives) return CPB.freed >= ((CPB.m.rules || {}).captives || {}).n;
  if (c.noHazard) return !CPB.hazHit;
  if (c.hpBelow) { const u = foe(c.hpBelow.n); return !!u && u.hp < u.d.h * c.hpBelow.frac }
  if (c.hpAbove) { const u = mine(c.hpAbove.n); return !!u && !u.dead && u.hp > u.d.h * c.hpAbove.frac }
  if (c.killBy) return CPB.deaths.some(d => d.team == 1 && d.n == c.killBy.n && d.round <= c.killBy.round);
  if (c.drained) return CPB.drained >= ((CPB.m.rules || {}).captives || {}).n;
  if (c.waveBy) return CPB.waveRound[c.waveBy.wave] != null && CPB.waveRound[c.waveBy.wave] <= c.waveBy.round;
  return false;
}
function cpResult(){
  const m = CPB.m, node = CPB.node, win = G.win === 0, res = {win, title:m.title, id:m.id, why:CPB.why, outro:win ? m.outro || '' : '', opts:[], xp:0, lv:[], recruits:[], final:0};
  if (win) {
    res.opts = (m.opts || []).map(o => ({t:o.t, ok:cpOpt(o.c)}));
    res.xp = (m.id == 'echo' ? 40 : 60) + 25 * res.opts.filter(o => o.ok).length;
    (m.recruit || []).forEach(n => { if (!CP.roster[n]) { CP.roster[n] = {xp:0}; CP.order.push(n); res.recruits.push(n) } });
    CP.done[node.id] = 1;
    const prev = CP.best[m.id] || []; CP.best[m.id] = res.opts.map((o, i) => o.ok || !!prev[i]);
    CPB.waves.flat().forEach(s => { if (s.n && !CP.beaten.includes(s.n)) CP.beaten.push(s.n) });
    if (m === cpSide().boss()) { CP.won = 1; res.final = 1 }
  } else { res.xp = 20; if (!res.why) res.why = 'Your squad has fallen.' }
  CPB.squad.forEach(n => { const b = cpLevel(n); CP.roster[n].xp += res.xp; const a = cpLevel(n); if (a > b) res.lv.push({n, lv:a}) });
  CP.last = res; cpSave();
  log(win ? '🏆 Mission complete!' : `✖ Mission failed: ${res.why}`);
}
function cpRetreat(){
  if (!cpLive() || G.win != null) return;
  if (!CPB.rq) { CPB.rq = 1; render(); setTimeout(() => { if (CPB && CPB.rq) { CPB.rq = 0; if (cpLive()) render() } }, 4000); return }
  G.win = 1; CPB.why = 'You retreated through the portal.'; render();
}

// ---- battle banner (shown where the online bar would be) and board markers ----
function cpBanner(){
  const m = CPB.m, over = G.win != null, win = m.win || {};
  const phase = CPB.waves.length > 1 ? ` · Phase ${CPB.wave + 1} of ${CPB.waves.length}` : '', clock = win.type == 'survive' ? ` · Hold out: Round ${Math.min(G.round, win.rounds)} of ${win.rounds}` : '';
  const status = over ? (G.win === 0 ? '<b class="cp-good">Mission complete!</b>' : `<b class="cp-bad">Mission failed.</b> ${esc(CPB.why)}`) : mine() ? '<b class="yourturn">Your turn</b>' : 'The enemy is acting…';
  const opts = (m.opts || []).map(o => `<li>${esc(o.t)}</li>`).join('');
  return `<div class="card cp-banner"><div class="cp-banner-top"><span><span class="panel-eyebrow">WORLD BETWEEN WORLDS${phase}${clock}</span><br><b>${esc(m.title)}</b> · ${status}</span>${over ? '' : `<button class="btn-ghost" onclick="cpRetreat()">${CPB.rq ? 'Click again to retreat' : 'Retreat'}</button>`}</div>
    <div class="cp-banner-goal"><b>Objective:</b> ${esc(m.main)}</div>${opts ? `<details><summary>Optional objectives and rules</summary><ul>${opts}</ul><ul class="cp-rules">${(m.special || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>` : ''}</div>`;
}
function cpDecorate(){
  if (!cpLive() || typeof document.querySelector != 'function') return;
  const mark = (L, cls, tip) => L.forEach(([x, y]) => { const c = document.querySelector(`.board [data-x="${x}"][data-y="${y}"]`); if (c) { c.classList.add(cls); if (!occ(x, y)) c.title = tip } });
  const r = CPB.m.rules || {};
  if (r.hazard) mark(CPB.haz, 'cp-haz', `${r.hazard.label}: ${r.hazard.dmg} damage at the start of the next round`);
  mark(CPB.caps, 'cp-cap', (r.captives || {}).free ? `Captive Jedi: ${r.captives.by} drains one each round` : 'Captive Jedi: move next to them to free them');
}

// ---- screens ----
const cpPortrait = (n, cls = '') => { const r = n == CP_SON.n ? CP_SON : n == CP_DAUGHTER.n ? CP_DAUGHTER : cpRec(n); return `<span class="cp-face ${cls}" style="background-image:${r && r.img ? `url('${r.img}')` : 'none'}"></span>` };
function cpAbList(n, lvl){
  return cpAbs(n).map((a, i) => `<li class="${i < lvl ? '' : 'cp-lock'}"><b>${esc(a.name)}</b> <i>${a.type}</i>${i < lvl ? '' : ` · 🔒 Level ${i + 1}`}<br><span>${esc(a.desc)}</span></li>`).join('');
}
function cpHeader(sub){
  const side = CPV.view != 'home' && CP ? ` · ${cpSide().name}` : '';
  return `<div class="cp-head"><div><div class="panel-eyebrow">SINGLE PLAYER${side}</div><h2>World Between Worlds</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="cp-head-btns">${CP && CPV.view != 'map' && CPV.view != 'home' ? `<button onclick="cpView('map')">🗺 Map</button>` : ''}${CP && CPV.view != 'roster' && CPV.view != 'home' ? `<button onclick="cpView('roster')">★ Roster (${CP.order.length})</button>` : ''}${CPV.view != 'home' ? '<button onclick="cpHome()">Campaign menu</button>' : ''}<button onclick="LOBBY.mode='menu';render()">← Main menu</button></div></div>`;
}
function cpPathCard(side){
  const S = CP_SIDES[side], c = cpPeek(side), boss = S.boss().title, cleared = c ? c.nodes.filter(n => n.t == 'mission' && c.done[n.id]).length : 0;
  const name = side == 'L' ? 'Light Side' : 'Dark Side';
  return `<div class="menu-panel cp-path ${side}"><div class="panel-eyebrow">${S.name} CAMPAIGN</div><h3>${S.title}</h3><p>${S.blurb.replace('{n}', cpRecruitable(side, c))}</p>
      ${c ? `<button class="btn-primary btn-wide" onclick="cpContinue('${side}')">Continue campaign <span aria-hidden="true">→</span></button><div class="cp-progress">${c.order.length} ${c.order.length == 1 ? S.who.slice(0, -(S.who == 'heroes' ? 2 : 1)) : S.who} ${S.got} · ${cleared} portals cleared${c.won ? ` · ${boss} defeated ✦` : ''}</div><button class="btn-ghost btn-wide" onclick="cpNew('${side}')">${CPV.confirm === side ? 'Click again: this erases your current campaign' : 'Start a new campaign'}</button>` : `<button class="btn-primary btn-wide" onclick="cpNew('${side}')">Begin the ${name} campaign <span aria-hidden="true">→</span></button>`}</div>`;
}
function cpHomeHtml(){
  return cpHeader('A mysterious realm connecting every point in time and space. Travel its paths, relive famous duels, and choose a side: rescue the heroes of the Light, or gather the servants of the Dark.') +
    `<div class="cp-paths">${cpPathCard('L')}${cpPathCard('D')}</div>`;
}
function cpIntroHtml(){
  const n = CP.start;
  return cpHeader() + `<div class="menu-panel cp-intro">${cpPortrait(n, 'big')}<div><div class="panel-eyebrow">YOUR JOURNEY BEGINS</div><h3>${esc(n)} answers the call</h3><p>A portal opens in the World Between Worlds, and ${esc(cpShort(n))} steps through. ${cpSide().intro} Missions give experience that unlocks more of each character's abilities, up to Level 3.</p><ul class="cp-abs">${cpAbList(n, 1)}</ul><button class="btn-primary" onclick="cpView('map')">Enter the World Between Worlds <span aria-hidden="true">→</span></button></div></div>`;
}
function cpMapHtml(){
  const st = cpStatus(), N = CP.nodes, vis = n => st[n.id] != 'hidden';
  let svg = '<svg class="cp-svg" viewBox="0 0 1000 620" role="img" aria-label="World Between Worlds map"><defs><clipPath id="cpclip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath><radialGradient id="cpglow"><stop offset="0" stop-color="#9fe8ff" stop-opacity=".55"/><stop offset="1" stop-color="#9fe8ff" stop-opacity="0"/></radialGradient></defs>';
  N.forEach(a => a.l.forEach(id => { const b = N[id]; if (a.id < b.id && vis(a) && vis(b) && st[a.id] != 'far' && st[b.id] != 'far') svg += `<line class="cp-path-ln ${st[a.id] == 'done' && st[b.id] == 'done' ? 'lit' : st[a.id] == 'done' || st[b.id] == 'done' ? 'half' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>` }));
  N.forEach(n => {
    const s = st[n.id]; if (s == 'hidden') return;
    const m = n.m && cpMission(n.m), sel = CPV.node === n.id, rr = n.t == 'boss' ? 40 : n.t == 'start' ? 30 : 24;
    const face = n.t == 'start' ? cpRec(CP.start).img : n.t == 'boss' ? cpSide().unit().img : n.t == 'mission' && s != 'seen' ? (cpRec(m.recruit[0]) || {}).img : null;
    const label = n.t == 'start' ? 'Gateway' : s == 'seen' ? '???' : n.t == 'boss' ? cpSide().unit().n : n.t == 'echo' ? 'Echoes' : cpShort(m.recruit[0]) + (m.recruit.length > 1 ? ` +${m.recruit.length - 1}` : '');
    const click = ['open', 'done', 'locked', 'sealed'].includes(s) && n.t != 'start';
    svg += `<g class="cp-node ${s} ${n.t}${sel ? ' sel' : ''}" transform="translate(${n.x},${n.y})"${click ? ` tabindex="0" role="button" aria-label="${esc(label)}" onclick="cpPick(${n.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cpPick(${n.id})}"` : ''}>
      ${s == 'open' ? `<circle class="cp-halo" r="${rr + 16}" fill="url(#cpglow)"/>` : ''}<circle class="cp-ring" r="${rr + 4}"/>
      ${face ? `<image href="${esc(face)}" x="${-rr}" y="${-rr}" width="${rr * 2}" height="${rr * 2}" clip-path="url(#cpclip)" preserveAspectRatio="xMidYMin slice"/>` : `<circle class="cp-core" r="${rr}"/><text class="cp-glyph" dy=".35em">${n.t == 'echo' && s != 'seen' ? '◈' : n.t == 'boss' ? '☾' : '?'}</text>`}
      ${s == 'locked' || s == 'sealed' || s == 'far' ? `<text class="cp-lockico" dy=".35em">🔒</text>` : ''}${s == 'done' && n.t != 'start' ? `<text class="cp-check" x="${rr - 4}" y="${-rr + 6}">✓</text>` : ''}
      <text class="cp-label" y="${rr + 20}">${esc(label)}</text></g>`;
  });
  svg += '</svg>';
  const need = Math.max(0, CP_BOSS_NEED - cpCleared());
  const S = cpSide(), B = S.unit().n;
  return cpHeader() + `<div class="cp-stats"><span><b>${CP.order.length}</b> / ${cpRecruitable()} ${S.who} ${S.got}</span><span><b>${cpCleared()}</b> portals cleared</span><span>${CP.won ? `✦ ${B} has been defeated` : need ? `${B}'s portal opens after <b>${need}</b> more ${need == 1 ? 'portal' : 'portals'}` : `<b>${B}'s portal is open</b> (reach it on the map)`}</span></div>
    <div class="cp-map">${svg}</div><div class="cp-legend"><span><i class="lg open"></i>Open portal</span><span><i class="lg done"></i>Cleared (replay for experience)</span><span><i class="lg seen"></i>Unknown portal</span><span><i class="lg locked"></i>Sealed</span></div>` + (CPV.node != null ? cpBriefHtml() : '<p class="cp-hint">Select a glowing portal to see its mission.</p>');
}
function cpBriefHtml(){
  const node = CP.nodes[CPV.node], m = cpMission(node.m), st = cpStatus()[node.id], best = CP.best[m.id] || [];
  const guests = (m.guests || m.recruit || []).filter(n => cpRec(n)), blocked = st == 'locked' || st == 'sealed';
  const S = cpSide(), B = S.unit(), hp = s => s.hp ? ` <small>♥${s.hp}</small>` : '';
  const chip = s => s.son || s.boss ? `<div class="cp-chip">${cpPortrait(B.n)}${esc(s.label || B.n)}${hp(s)}</div>` : s.echo ? `<div class="cp-chip">${S.echoOf}</div>` :
    s.from ? `<div class="cp-chip">A random ${esc(s.label || 'foe')}${hp(s)}</div>` : `<div class="cp-chip">${cpPortrait(s.n)}${esc(cpShort(s.n))}${hp(s)}</div>`;
  const later = ((m.rules || {}).arrive || []).map(a => `<div class="cp-chip">${cpPortrait(a.n)}${esc(cpShort(a.n))}${hp(a)} <small>from Round ${a.round}</small></div>`).join('');
  const enemies = node.t == 'echo' ? `<div class="cp-chip">${S.echoes}</div>` :
    m.waves.map((w, i) => `<div class="cp-wave">${m.waves.length > 1 ? `<span class="cp-wave-n">Phase ${i + 1}</span>` : ''}${w.map(chip).join('')}${i == 0 ? later : ''}</div>`).join('');
  const reward = node.t == 'echo' ? 'Experience for your squad.' : node.t == 'boss' ? S.bossWin : m.recruit.map(n => CP.roster[n] ? `${esc(cpShort(n))} (already in your roster)` : `<b>${esc(n)}</b> joins your roster`).join(', ');
  const roster = CP.order.filter(n => !guests.includes(n)), full = CPV.squad.length >= m.slots;
  const canGo = !blocked && cpCanGo(m, guests);
  return `<section class="menu-panel cp-brief" id="cp-brief"><div class="cp-brief-top"><div><div class="panel-eyebrow">${esc(m.lore)}</div><h3>${esc(m.title)}</h3></div><button class="btn-ghost" onclick="CPV.node=null;render()">Close</button></div>
    <p>${esc(m.premise)}</p>
    ${m.locked ? `<div class="card cp-sealed">🔒 ${esc(m.locked)}</div>` : st == 'sealed' ? `<div class="card cp-sealed">🔒 Clear ${CP_BOSS_NEED - cpCleared()} more portals to open the way to ${B.n.replace(/^The /, 'the ')}.</div>` : ''}
    <div class="cp-cols"><div><h4>Main objective</h4><p class="cp-main">${esc(m.main)}</p>${(m.opts || []).length ? `<h4>Optional objectives <small>(+25 XP each)</small></h4><ul class="cp-opts">${m.opts.map((o, i) => `<li class="${best[i] ? 'got' : ''}">${best[i] ? '✓' : '○'} ${esc(o.t)}</li>`).join('')}</ul>` : ''}
      ${(m.special || []).length ? `<h4>Special rules</h4><ul class="cp-rules">${m.special.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}<h4>Reward</h4><p>${reward}${CP.done[node.id] ? ' · Replay for experience.' : ''}</p></div>
      <div><h4>Enemies</h4>${enemies || '<p>None</p>'}${guests.length ? `<h4>Fighting alongside you</h4><div class="cp-wave">${guests.map(n => `<div class="cp-chip">${cpPortrait(n)}${esc(cpShort(n))}</div>`).join('')}</div>` : ''}</div></div>
    ${blocked ? '' : !m.slots ? `<h4>Your squad</h4><p>${esc(guests.map(cpShort).join(' and '))} must face this alone.</p>
    <button class="btn-primary btn-wide" ${canGo ? '' : 'disabled'} onclick="cpStart()">Enter the portal</button>` : `<h4>Your squad <small>(choose up to ${m.slots}${m.minSquad ? `, at least ${m.minSquad}` : ''})</small></h4><div class="cp-squad">${roster.map(n => { const on = CPV.squad.includes(n), lv = cpLevel(n); return `<button class="cp-pick${on ? ' on' : ''}" ${!on && full ? 'disabled' : ''} aria-pressed="${on}" onclick="cpToggle(${CP.order.indexOf(n)})">${cpPortrait(n)}<span><b>${esc(cpShort(n))}</b><small>Level ${lv} · ${Math.min(lv, cpAbs(n).length)}/${cpAbs(n).length} abilities</small></span></button>` }).join('') || `<p>Every one of your ${S.who} is already fighting in this mission.</p>`}</div>
    <button class="btn-primary btn-wide" ${canGo ? '' : 'disabled'} onclick="cpStart()">Enter the portal · ${CPV.squad.length}/${m.slots}</button>`}</section>`;
}
function cpRosterHtml(){
  return cpHeader(`${cpSide().roster} Experience unlocks abilities, and Level 3 makes a character a Portal Vet.`) + `<div class="cp-roster">${CP.order.map(n => {
    const r = cpRec(n), xp = CP.roster[n].xp, lv = cpLevel(n), next = CP_XP[lv], pct = lv >= 3 ? 100 : Math.round((xp - CP_XP[lv - 1]) / (next - CP_XP[lv - 1]) * 100);
    return `<div class="menu-panel cp-hero"><div class="cp-hero-top">${cpPortrait(n, 'mid')}<div><b>${esc(n)}</b><div class="pick-stats">${(s => `♥ ${s.h} HP · ⚔ ${s.a}d6 · 🛡 ${s.d}d6`)(cpHero(n))}</div><div class="cp-lv">Level ${lv}${lv < 3 ? ` · ${xp}/${next} XP` : ' · Max level'}</div><div class="cp-bar"><i style="width:${pct}%"></i></div></div></div><ul class="cp-abs">${cpAbList(n, lv)}</ul></div>`;
  }).join('')}</div>`;
}
function cpResultHtml(){
  const r = CP.last;
  if (!r) { CPV.view = 'map'; return cpMapHtml() }
  return cpHeader() + `<section class="menu-panel cp-result ${r.win ? 'win' : 'lose'}"><div class="panel-eyebrow">${r.win ? 'MISSION COMPLETE' : 'MISSION FAILED'}</div><h3>${esc(r.title)}</h3>
    <p>${esc(r.win ? r.outro : r.why + ' The portal flickers. You can try again.')}</p>
    ${r.final ? `<div class="card cp-final">${cpSide().final}</div>` : ''}
    ${r.recruits.length ? `<h4>${cpSide().Got}</h4><div class="cp-wave">${r.recruits.map(n => `<div class="cp-chip big">${cpPortrait(n)}<b>${esc(n)}</b> joins your roster</div>`).join('')}</div>` : ''}
    ${r.opts.length ? `<h4>Optional objectives</h4><ul class="cp-opts">${r.opts.map(o => `<li class="${o.ok ? 'got' : ''}">${o.ok ? '✓' : '✗'} ${esc(o.t)}</li>`).join('')}</ul>` : ''}
    <p>Your squad gains <b>${r.xp} XP</b>.${r.lv.map(l => ` <b class="cp-good">${esc(cpShort(l.n))} reached Level ${l.lv}</b>, unlocking ${esc(cpAbs(l.n)[l.lv - 1].name)}!`).join('')}</p>
    <button class="btn-primary" onclick="CP.last=null;cpSave();cpView('map')">Continue <span aria-hidden="true">→</span></button></section>`;
}
function cpScreen(){
  if (CPB && !G) { CPB = null; AI = null; if (CP && CP.last) CPV.view = 'result'; else if (CPV.view == 'battle') CPV.view = 'map' }
  if (!CP && CPV.view != 'home') CPV.view = 'home';
  const v = CPV.view, h = v == 'intro' ? cpIntroHtml() : v == 'map' ? cpMapHtml() : v == 'roster' ? cpRosterHtml() : v == 'result' ? cpResultHtml() : cpHomeHtml();
  $('#app').innerHTML = `<div class="cp">${h}</div>`;
}

// ---- hooks into the battle engine (inactive outside campaign battles) ----
(function cpInit(){
  const R0 = globalThis.render;
  globalThis.render = function(...a){ if (cpLive()) cpCheck(); const v = R0.apply(this, a); cpDecorate(); return v };
  const H0 = globalThis.hurt;
  globalThis.hurt = function(u, n){
    if (cpLive() && u.cp && n > 0) {
      if (u.cp.proj) { log(`👻 The attack passes straight through ${u.d.n}'s projection`); uxFx('resist', u); return }
      if (u.cp.floor && u.hp - n < 1) { n = u.hp - 1; if (n <= 0) { log(`${u.d.n} refuses to fall`); return } }
      else if (u.cp.last && !u.cp.lastUsed && u.hp - n <= 0) { u.cp.lastUsed = 1; n = u.hp - 1; log(`💪 ${u.d.n} refuses to fall and stays standing at 1 Health!`); if (n <= 0) return }
    }
    const was = u.dead, v = H0.call(this, u, n); if (!was && u.dead) cpMark(u); return v;
  };
  ['die', 'vanish'].forEach(f => { const F = globalThis[f]; globalThis[f] = function(u, ...a){ const v = F.call(this, u, ...a); if (u.dead) cpMark(u); return v } });
  const S0 = globalThis.stun;
  globalThis.stun = function(u){ const v = S0.call(this, u); if (cpLive() && u.team == 0 && u.st.stun) CPB.stun = 1; return v };
  const B0 = globalThis.onlineBar;
  globalThis.onlineBar = function(){ return cpLive() ? cpBanner() : B0.apply(this, arguments) };
})();
