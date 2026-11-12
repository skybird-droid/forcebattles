// VS Computer mode: the computer plays one side of a local game.
// It acts only through the same input functions a player's clicks use (cell, doAtk, doAb, ...),
// one step at a time with a short pause, so every rule and animation works exactly as for a human.
// Choices come from a simple estimate: expected damage and kill chance from the dice, plus rough
// values for stuns, heals, buffs and Epics. It does not look ahead to the opponent's reply.
let AI = null, AI_ME = 0;   // AI: {side, timer, acting, busy, plan, tgt, steps}; AI_ME: the side the player picked
const AI_DELAY = 650;
const aiOn = () => !!AI && !NET && (LOBBY.mode == 'ai' || LOBBY.mode == 'camp');   // 'camp': campaign battles (js/campaign.js)
const aiTurn = () => aiOn() && !!G && G.win == null && ctrl() == AI.side;

// ---- setup screen ----
function aiMenu(){ LOBBY.mode = 'ai'; AI = null; render() }
function aiSide(t){ AI_ME = t; render() }
function aiRandom(){ P[AI_ME] = randSquad(AI_ME ? 'D' : 'L'); render() }
function aiStart(){
  if (squadCost(P[AI_ME]) != SQUAD_SIZE) return;
  if (AI && AI.timer) clearTimeout(AI.timer);
  P[1 - AI_ME] = randSquad(AI_ME ? 'L' : 'D');
  AI = {side:1 - AI_ME, timer:null, acting:0, busy:0, plan:null, tgt:null, steps:0};
  start();
}

// ---- estimates ----
const aiCdf = z => 1 / (1 + Math.exp(-1.702 * z)), aiPdf = z => Math.exp(-z * z / 2) / 2.5066;
const aiWorth = t => 2 + t.d.a + ((t.d.cost || 1) > 1 ? 3 : 0);
// n Attack dice against t: expected damage (capped at its Health), chance to deal any, chance to defeat it
function aiHit(u, t, n){
  if (t.st.orb) return {ed:0, hit:0, kill:0};
  const dd = dDice(t, u), m = 3.5 * (n - dd), sd = Math.sqrt(2.92 * (n + dd)) || 1, z = m / sd;
  if (trayaSafe(t)) return {ed:0, hit:0, kill:0};
  return {ed:Math.min(t.hp, Math.max(0, sd * aiPdf(z) + m * aiCdf(z))), hit:1 - aiCdf((.5 - m) / sd), kill:1 - aiCdf((t.hp - .5 - m) / sd)};
}
function aiAtkScore(u, t, n, desc){
  if (t.team == u.team) return -aiHit(u, t, n).ed * 2;
  const h = aiHit(u, t, n);
  return h.ed + h.kill * aiWorth(t) + (/Stun/.test(desc || '') && !t.st.stun ? h.hit * 2 : 0);
}
// rough worth of support Epics that deal no damage themselves (before the save-your-Epic penalty)
const aiReady = u => live(u.team).filter(v => v !== u && !v.used && !v.st.stun);
const AI_EPV = {
  e_shat: (u, t) => aiReady(u).filter(v => dist(v, t) <= 4).length * 1.5 + t.d.d,   // allies can still pile on
  e_precog: (u, t) => t.used ? 0 : 1.5 + t.d.a,
  e_sever: (u, t) => t.used ? .5 : 2 + t.d.a * .5 + (t.d.abs.some(a => a.type == 'Epic' && a.key && !epDone(t, a.key)) ? 1.5 : 0),
  e_66: (u, t) => 1 + Math.max(0, ...al(t).filter(v => dist(t, v) <= 1).map(v => { const h = aiHit(t, v, t.d.a); return h.ed + h.kill * aiWorth(v) })),
  e_barrier: (u, t) => [u, t].filter(v => en(v).some(e => dist(e, v) <= 2)).length * 2.2,
  e_orb: u => 1 + en(u).filter(e => dist(e, u) <= 2).length * 1.5 + (u.hp <= u.d.h / 2 ? 2 : 0),
  a_bmcmd: (u, v) => Math.max(0, ...bmTg(v).map(t => aiAtkScore(v, t, 3, ''))),   // the commanded ally's free 3d6 Attack
  e_oneforce: u => live(u.team).reduce((x, v) => x + (v === u ? 0 : v.st.stun ? 2.5 : v.used ? 0 : 1.2), 0),
};
// best value and target of one Action/Epic ability, or null
function aiAbValue(u, a, A, T){
  const key = a.key, desc = a.desc || '', dice = +((A.l.match(/(\d)d6/) || [])[1]) || 0, nd = t => dice || aDice(u, t);
  let best = null; const pick = (t, s) => { if (!best || s > best.score) best = {t, score:s} };
  const foes = T.filter(t => t.team != u.team);
  if (key == 'e_transfer') { const L = fallen(u); if (L.length) pick(u, 4 + Math.max(...L.map(v => v.d.a))) }
  else if (key == 'e_purrgil') T.forEach(t => pick(t, 1 + t.hp + t.d.a - u.hp));
  else if (key == 'e_rage' || key == 'e_flurry') T.forEach(t => pick(t, 1.8 * aiAtkScore(u, t, aDice(u, t) + (key == 'e_flurry' ? 1 : 0), desc)));
  else if (key == 'e_surge') {
    const sc = foes.map(t => ({t, s:aiAtkScore(u, t, 3, desc)})).sort((x, y) => y.s - x.s), top = sc.slice(0, 2);
    if (top.length) pick(top[0].t, top.reduce((x, y) => x + y.s, 0));
  }
  else if (AI_EPV[key]) T.forEach(t => pick(t, AI_EPV[key](u, t)));
  else if (key == 'e_ruin') T.forEach(t => pick(t, aiAtkScore(u, t, 4, desc) + live().filter(v => v !== t && v !== u && dist(v, t) <= 1).reduce((x, v) => x + (v.team == u.team ? -1.5 : 1), 0)));   // the blast also hits everyone next to the target
  else if (A.atk && A.inst) pick(u, T.reduce((x, t) => x + aiAtkScore(u, t, nd(t), desc), 0));
  else if (A.atk) T.forEach(t => pick(t, aiAtkScore(u, t, nd(t), desc) + .5));
  else T.forEach(t => {
    if (t.team != u.team) {
      const dm = +((desc.match(/(\d+) (?:unblockable )?damage/) || [])[1]) || 0;
      let s = 2 + (dm ? Math.min(dm, t.hp) + (dm >= t.hp && !t.st.orb ? aiWorth(t) : 0) : 0);
      if (/Stun/.test(desc) && !t.st.stun) s += t.used ? 1.5 : 2.5;
      pick(t, s);
    } else if (/recover|heal/i.test(desc)) {
      const n = +((desc.match(/(?:recovers?|heals?)\D{0,24}(\d+)/i) || [])[1]) || 3;
      pick(t, Math.min(t.d.h - t.hp, n) * 1.2);
    } else pick(t, en(u).some(v => dist(v, t) <= 3) ? 1.2 : .4);   // buffs and Taunts: worth less than a solid attack, so nobody turtles forever
  });
  if (best && a.type == 'Epic' && key != 'e_transfer' && key != 'e_purrgil') best.score -= 2.5;   // save Epics for a strong moment
  return best;
}
// the best thing u can do from where it stands: {kind:'atk'|'ab'|'none', key, t, score}
function aiBest(u){
  let best = {kind:'none', score:0};
  const rng = atkRng(u);
  if (!u.n && !u.st.nopatk && !fxDis(u)) tf(u, en(u).filter(x => dist(u, x) <= rng)).forEach(t => {
    const s = aiAtkScore(u, t, aDice(u, t)); if (s > best.score) best = {kind:'atk', t, score:s};
  });
  if (en(u).some(v => k(v, 'manip') && dist(v, u) <= 1) || u.st.sever) return best;
  u.d.abs.forEach(a => {
    const A = a.key && AB[a.key];
    if (!A || (a.type == 'Epic' && epDone(u, a.key)) || cdLeft(u, a.key) || (u.st.nopatk && A.atk)) return;
    let T = A.tg(u); if (A.atk) T = tf(u, T); if (!T.length) return;
    const v = aiAbValue(u, a, A, T);
    if (v && v.score > best.score) best = {kind:'ab', key:a.key, t:v.t, score:v.score};
  });
  return best;
}
// where to stand: close to the enemy, but a badly hurt unit avoids standing next to several
function aiPos(u){
  const E = en(u); if (!E.length) return 0;
  const near = Math.min(...E.map(v => dist(u, v))), adjN = E.filter(v => dist(u, v) <= 1).length;
  return -.3 * near - (u.hp <= u.d.h * .35 ? .8 * adjN : 0);
}
// try every square u can reach and keep the best spot and action
function aiPlan(u){
  const ox = u.x, oy = u.y, sq = reach(u, u.d.mv || 4, (k(u, 'rgm') && !u.rgu) || k(u, 'assassin'));
  let best = null;
  try {
    sq.forEach(q => {
      const [x, y] = q.split(',').map(Number); u.x = x; u.y = y;
      const s = aiBest(u).score + aiPos(u);
      if (!best || s > best.score) best = {id:u.id, x, y, score:s};
    });
  } finally { u.x = ox; u.y = oy }
  return best;
}
function aiPickTarget(s, T){
  let best = null, bs = -Infinity;
  T.forEach(t => { const v = t.team != s.team ? aiAtkScore(s, t, aDice(s, t)) : t.d.h - t.hp; if (v > bs) { bs = v; best = t } });
  return best;
}
// a free square for a unit to step to after its action (Hit and Run, Dark Transfer): fewest enemies next to it
function aiSafeSpot(u, foesOf){
  let best = null, bs = Infinity;
  G.reach.forEach(q => {
    const [x, y] = q.split(',').map(Number), o = occ(x, y); if (o && o != u) return;
    const n = en(foesOf).filter(v => dist({x, y}, v) <= 1).length; if (n < bs) { bs = n; best = {x, y} }
  });
  return best;
}

// ---- one step of the computer's turn ----
function aiAct(){
  const s = G.sel;
  if (G.pend) {   // Essence Transfer: take over the strongest enemy in reach, or let him fade
    const e = (G.tg || []).filter(v => v.team != AI.side).sort((a, b) => b.hp - a.hp)[0];
    return e ? cell(e.x, e.y) : essPass();
  }
  if (!s) {
    if (fbk(AI.side) == 'dj' && G.djR[AI.side] != G.round) {   // Unpredictable Power: defend when the squad is badly hurt
      const L = live(AI.side), hp = L.reduce((x, v) => x + v.hp / v.d.h, 0) / (L.length || 1);
      return djPick(hp < .5 ? 'd' : 'a');
    }
    let best = null;
    live(AI.side).filter(u => !u.used && !u.st.stun).forEach(u => { const p = aiPlan(u); if (p && (!best || p.score > best.score)) best = p });
    if (!best) return;
    const u = G.u.find(v => v.id == best.id); AI.plan = best; AI.tgt = null; AI.steps = 0;
    return cell(u.x, u.y);
  }
  if (++AI.steps > 25) return finish();   // safety net: never get stuck inside one activation
  if (G.mode == 'move') {
    const p = AI.plan;
    if (p && p.id == s.id && (p.x != s.x || p.y != s.y) && G.reach.has(p.x + ',' + p.y)) return cell(p.x, p.y);
    return stay();
  }
  if (G.mode == 'act') {
    if (s.n >= 1) return finish();
    const b = aiBest(s); AI.tgt = b.t || null;
    if (b.kind == 'atk') return doAtk();
    if (b.kind == 'ab') return doAb(b.key);
    return finish();
  }
  if (G.mode == 'tg') {
    const T = G.tg || [];
    if (G.sq) {
      const c = T.filter(t => !G.sq.includes(t));
      if (G.sq.length < (G.sqKey == 'e_surge' ? 2 : 3) && c.length) { const t = aiPickTarget(s, c); return cell(t.x, t.y) }
      return resolveStorm();
    }
    if (!T.length) return s.n >= 1 ? finish() : back();
    const t = AI.tgt && T.includes(AI.tgt) ? AI.tgt : aiPickTarget(s, T); AI.tgt = null;
    return cell(t.x, t.y);
  }
  if (G.mode == 'split') return resolveSplit(G.sp.n || s.d.a);
  if (G.mode == 'quad') return resolveQuad(0);
  if (G.mode == 'rev') { const v = fallen(s).sort((a, b) => b.d.a - a.d.a)[0]; return v ? resolveRevive(v.id) : back() }
  if (G.mode == 'revspot') { const p = aiSafeSpot(null, s); return p ? cell(p.x, p.y) : back() }
  if (G.mode == 'amove') {
    const m = G.mv;
    if (m.team != s.team) {   // an enemy moved by Force Lightning & Control: drop it next to as many of our units as possible
      let bx = m.x, by = m.y, bs = -1;
      G.reach.forEach(q => { const [x, y] = q.split(',').map(Number), sc = al(s).concat(s).filter(v => Math.max(Math.abs(v.x - x), Math.abs(v.y - y)) <= 1).length; if (sc > bs) { bs = sc; bx = x; by = y } });
      return cell(bx, by);
    }
    if (!en(m).some(v => dist(m, v) <= 1)) return finish();
    const p = aiSafeSpot(m, m); return p ? cell(p.x, p.y) : finish();
  }
  return finish();
}
function aiStep(){
  AI.timer = null; if (!aiTurn()) return;
  AI.acting = 1;
  try { aiAct() } catch (e) { console.error('VS Computer:', e); try { if (G && G.sel) finish() } catch (_) {} }
  finally { AI.acting = 0 }
  aiTick();
}
function aiTick(){ if (aiTurn() && !AI.timer) AI.timer = setTimeout(aiStep, AI_DELAY) }

// ---- Evaluation bar (local and VS Computer only) ----
// Compares each side's total Health and the damage it can expect to deal per round (aiHit vs
// every enemy it can hurt), plus a small edge for the side to move. Weights were fitted by
// logistic regression on ~11k positions from AI-vs-AI games (83% of winners called correctly).
const EVAL_W = {hp:2.6, off:1.5, move:.13};
let EVAL_LAST = 50, EVAL_G = null;
const evalOn = () => !!G && !NET && (LOBBY.mode == 'local' || LOBBY.mode == 'ai');
function evalPow(t){
  const U = live(t), E = live(1 - t).filter(e => !trayaSafe(e));
  let hp = 0, off = 0;
  U.forEach(u => {
    hp += Math.max(0, u.hp);
    if (!E.length) return;
    const d = E.reduce((s, e) => s + aiHit(u, e, aDice(u, e)).ed, 0) / E.length;
    off += d * (u.st.stun ? .5 : 1) * (1 + .1 * u.d.abs.length);
  });
  return {hp, off};
}
function evalAdv(){
  const L = evalPow(0), D = evalPow(1);
  return EVAL_W.hp * Math.log((L.hp + .5) / (D.hp + .5)) + EVAL_W.off * Math.log((L.off + .5) / (D.off + .5)) + EVAL_W.move * (sideOf(G.turn) ? -1 : 1);
}
// Light Side's chance to win, 0-100
function evalPct(){
  if (G.win != null) return sideOf(G.win) ? 0 : 100;
  return 100 / (1 + Math.exp(-evalAdv()));
}
function evalBarHtml(){
  if (!evalOn()) return '';
  if (EVAL_G !== G) { EVAL_G = G; EVAL_LAST = 50 }   // a new battle starts the bar from even
  let p = evalPct(); p = Math.max(G.win != null ? 0 : 3, Math.min(G.win != null ? 100 : 97, p));
  const lead = p >= 50 ? 'L' : 'D', v = Math.round(lead == 'L' ? p : 100 - p);
  const txt = G.win != null ? 'Won' : v + '%', tip = G.win != null ? '' : `${lead == 'L' ? 'Light' : 'Dark'} Side ${v}% to win`;
  return `<div class="evalbar" role="img" aria-label="${tip || txt}" title="${tip}" data-to="${p.toFixed(1)}"><div class="eval-fill" style="height:${EVAL_LAST}%"></div><span class="eval-num ${lead}">${txt}</span></div>`;
}
function evalAnimate(){
  if (typeof document.querySelector != 'function') return;
  const b = document.querySelector('.evalbar');
  if (!b) return;
  const to = +b.dataset.to, f = b.firstElementChild;
  EVAL_LAST = to;
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.height = to + '%' }));
}

// Block the player's clicks during the computer's turn (clicking a unit still shows its info),
// and check after every screen update whether the computer should move.
(function aiInit(){
  INPUTS.forEach(n => {
    const f = globalThis[n];
    globalThis[n] = function(...a){
      if (!aiOn() || AI.acting || AI.busy) return f.apply(this, a);
      if (aiTurn()) { if (n == 'cell' && G) { G.insp = occ(a[0], a[1]) || null; render() } return }
      AI.busy = 1;   // inputs triggered from inside a player's click (e.g. finish after an attack) must go through
      try { return f.apply(this, a) } finally { AI.busy = 0 }
    };
  });
  const r = globalThis.render;
  globalThis.render = function(...a){ const v = r.apply(this, a); if (aiOn()) aiTick(); return v };
})();
