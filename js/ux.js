// Player feedback layer: floating damage numbers, dice card, battle log, sounds, how-to-play guide and touch helpers.
// Everything here is cosmetic. It never changes the game state or uses the game's random number generator,
// so it cannot make the two online players' games drift apart.
const UX = {silent:false, mute:false, fx:[], active:[], last:null, rollId:0, seen:0, g:null, lastTurn:null, lastWin:null, armed:null, step:0, guideOpen:false};
try { UX.mute = localStorage.getItem('fb-mute') == '1' } catch (e) {}
const uxSeenGuide = () => { try { return localStorage.getItem('fb-guide') == '1' } catch (e) { return true } };

// ---- events queued by the game rules ----
function uxFx(type, u, n){
  if (UX.silent || !G) return;
  UX.fx.push({t:type, x:u ? u.x : -1, y:u ? u.y : -1, n:n || 0, side:u ? u.team : 0});
  if (UX.fx.length > 40) UX.fx.shift();
}
function uxRoll(a, d, ar, dr, sa, sd, dm){
  if (UX.silent) return;
  UX.last = {id:++UX.rollId, a:a.d.n, as:a.team, d:d.d.n, ds:d.team, ar:ar.slice(), dr:dr.slice(), sa, sd, dm};
  if (!dm) uxFx('block', d);
}
// ---- sound (synthesised, no files) ----
let _ac = null;
const ac = () => { if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } return _ac };
function tone(f, t0, dur, type, vol, f2){
  const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol || .12, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
function noise(t0, dur, vol){
  const a = ac(); if (!a) return; const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; g.gain.value = vol || .2; s.connect(g); g.connect(a.destination); s.start(a.currentTime + t0);
}
function uxSound(n){
  if (UX.mute || UX.silent) return; const a = ac(); if (!a) return; if (a.state == 'suspended') a.resume();
  if (n == 'dmg') { noise(0, .12, .22); tone(140, 0, .18, 'square', .1, 60) }
  else if (n == 'block') { tone(900, 0, .1, 'triangle', .1, 1400); tone(1400, .06, .1, 'triangle', .07) }
  else if (n == 'stun') tone(700, 0, .35, 'sawtooth', .07, 180);
  else if (n == 'heal') [523, 659, 784].forEach((f, i) => tone(f, i * .09, .2, 'sine', .1));
  else if (n == 'turn') { tone(660, 0, .12, 'sine', .1); tone(880, .12, .18, 'sine', .1) }
  else if (n == 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .13, .3, 'triangle', .13));
  else if (n == 'lose') [392, 330, 262, 196].forEach((f, i) => tone(f, i * .18, .35, 'sawtooth', .08));
  else if (n == 'dead') tone(220, 0, .5, 'sawtooth', .1, 50);
}
function uxMute(){ UX.mute = !UX.mute; try { localStorage.setItem('fb-mute', UX.mute ? '1' : '0') } catch (e) {} uxBar(); if (!UX.mute) uxSound('turn') }

// ---- HTML pieces used by render() ----
function uxCombatHtml(){
  const L = UX.last; if (!L) return '';
  const fresh = L.id !== UX.seen, chip = (v, side, i) => `<span class="die ${side ? 'D' : 'L'}${fresh ? ' roll' : ''}" style="animation-delay:${i * 70}ms">${v}</span>`;
  return `<div class="combat" aria-live="polite"><div class="combat-title">LAST ATTACK</div>
<div class="crow"><b>${esc(L.a)}</b><span class="dice">${L.ar.length ? L.ar.map((v, i) => chip(v, L.as, i)).join('') : '<i>no dice</i>'}</span><span class="tot">${L.sa}</span></div>
<div class="crow"><b>${esc(L.d)}</b><span class="dice">${L.dr.length ? L.dr.map((v, i) => chip(v, L.ds, i)).join('') : '<i>no Defense dice</i>'}</span><span class="tot">${L.sd}</span></div>
<div class="cres ${L.dm ? 'dmg' : 'blk'}">${L.dm ? L.dm + ' damage' : 'Blocked'}</div></div>`;
}
function uxLogHtml(){
  const cls = s => /^— Round/.test(s) ? 'round' : /💀/.test(s) ? 'dead' : /→ 0 dmg/.test(s) ? 'blk' : /→ \d+ dmg/.test(s) ? 'hit' : /💫|Stun/.test(s) ? 'stun' : /🎯/.test(s) ? 'taunt' : /[Hh]eal|recover|restor|Health/.test(s) ? 'heal' : '';
  return `<div class="log"><div class="log-title">BATTLE LOG</div>${G.log.map(s => `<div class="le ${cls(s)}">${esc(s)}</div>`).join('')}</div>`;
}
// ---- called after every render: animations, sounds, turn alerts ----
function uxAfterRender(){
  if (typeof document.getElementById != 'function') return;
  const now = Date.now(), board = document.querySelector('.board');
  const q = UX.fx.splice(0), snd = new Set();
  q.forEach(f => { if (f.x >= 0 || f.t == 'forfeit') UX.active.push(Object.assign({}, f, {start:now})); snd.add(f.t) });
  UX.active = UX.active.filter(f => now - f.start < 1500);
  if (board && G) UX.active.forEach(f => {
    const c = board.querySelector(`.c[data-x="${f.x}"][data-y="${f.y}"]`); if (!c) return;
    const dl = `animation-delay:-${now - f.start}ms`;
    if (f.t == 'dmg' || f.t == 'stun') c.classList.add(f.t == 'dmg' ? 'fxhit' : 'fxstun'), c.style.cssText += ';' + dl;
    const txt = f.t == 'dmg' ? '-' + f.n : f.t == 'heal' ? '+' + f.n : f.t == 'stun' ? '💫 Stun' : f.t == 'block' ? 'Blocked' : f.t == 'dead' ? '💀' : f.t == 'resist' ? 'Resisted' : '';
    if (!txt) return;
    const s = document.createElement('span'); s.className = 'fx fx-' + f.t; s.textContent = txt;
    s.style.cssText = `left:${c.offsetLeft + c.offsetWidth / 2}px;top:${c.offsetTop + c.offsetHeight * .3}px;${dl}`; board.appendChild(s);
  });
  ['dmg', 'block', 'stun', 'heal', 'dead'].forEach(t => { if (snd.has(t)) uxSound(t) });
  // turn / result alerts
  if (G) {
    if (UX.g !== G) { UX.g = G; UX.lastTurn = null; UX.lastWin = null }
    const t = G.turn, w = G.win, mineTurn = typeof NET == 'undefined' || !NET || mine();
    if (!UX.silent) {
      if (UX.lastTurn === null) uxToast(NET ? (mineTurn ? 'Battle begins. You go first!' : 'Battle begins. Opponent goes first.') : `Battle begins. ${t ? 'Dark' : 'Light'} Side goes first.`);
      else if (w != null && UX.lastWin == null) { const won = NET ? w == NET.me : true; uxToast(NET ? (won ? 'Victory!' : 'Defeat.') : `${w ? 'Dark' : 'Light'} Side wins!`, won ? 'win' : 'lose'); uxSound(won ? 'win' : 'lose') }
      else if (w == null && t !== UX.lastTurn) { uxToast(NET ? (mineTurn ? 'Your turn!' : "Opponent's turn") : `${t ? 'Dark' : 'Light'} Side's turn`, mineTurn ? 'mine' : ''); if (mineTurn) uxSound('turn') }
    }
    UX.lastTurn = t; UX.lastWin = w;
    document.title = (G.win == null && NET && mineTurn ? '● Your turn · ' : '') + 'Force Battles';
  } else { UX.g = null; UX.lastTurn = null; document.title = 'Force Battles' }
  UX.armed = null;
  const mark = () => { UX.seen = UX.last ? UX.last.id : 0 };
  typeof requestAnimationFrame == 'function' ? requestAnimationFrame(() => requestAnimationFrame(mark)) : mark();
  uxBar();
}
function uxToast(msg, kind){
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t) }
  t.textContent = msg; t.className = 'show ' + (kind || ''); clearTimeout(uxToast.h); uxToast.h = setTimeout(() => { t.className = '' }, 1800);
}
// after rebuilding a match from history: no sounds or alerts for old moves
function uxSync(){ UX.silent = false; UX.fx = []; UX.active = []; UX.last = null; UX.g = G; UX.lastTurn = G ? G.turn : null; UX.lastWin = G ? G.win : null }

// ---- toolbar + how-to-play guide ----
function uxBar(){
  if (typeof document.getElementById != 'function') return;
  let b = document.getElementById('uxbar');
  if (!b) { b = document.createElement('div'); b.id = 'uxbar'; document.body.appendChild(b) }
  b.innerHTML = `<button class="ux-btn${uxSeenGuide() ? '' : ' pulse'}" onclick="uxGuide(0)" aria-label="How to play">? <span>How to play</span></button><button class="ux-btn" onclick="uxMute()" aria-label="${UX.mute ? 'Unmute sound' : 'Mute sound'}">${UX.mute ? '🔇' : '🔊'}</button>`;
}
const GUIDE = [
  ['The goal', `<p>Two squads of four fight on an 8×8 board: <b>Light Side</b> versus <b>Dark Side</b>. Defeat every enemy character to win.</p><p>Everyone starts in the two rows nearest their own edge, placed at random.</p>`],
  ['Your turn', `<p>Players take turns. On your turn, pick <b>one</b> of your characters that has not acted yet this round, then:</p><ol><li><b>Move</b> up to 4 squares (diagonals count). You can't walk through other characters. Press <b>Stay in place</b> to skip the move, or click your character again to deselect it and pick someone else.</li><li><b>Act</b>: use the Attack button, an Action, or an Epic Action. Or just end the activation.</li></ol><p>When every character has acted, a new round begins.</p>`],
  ['Fighting with dice', `<p>Each character has <b>Health</b>, an <b>Attack</b> number and a <b>Defense</b> number. Attack 3d6 means “roll three six-sided dice”.</p><p>When you attack, you roll your Attack dice and the target rolls its Defense dice. Compare the totals: the difference is <b>damage</b> (never below 0). A tie or a lower Attack total does nothing.</p><p>The basic Attack hits an <b>adjacent</b> enemy (touching, diagonals included). The “Last attack” card shows every roll.</p>`],
  ['Engaged', `<p>A character standing next to an enemy is <b>engaged</b> and <b>cannot move</b> on its turn. It can still attack or use abilities. Some abilities let a character slip away, push enemies, or ignore this rule.</p>`],
  ['Abilities and icons', `<p>Select a character to see its ability buttons. Hover over any button to read what it does (tap it on a phone, then tap again to use it).</p><ul><li><b>Red border:</b> basic Attack</li><li><b>Blue border:</b> Action, used in place of an attack</li><li><b>Gold border:</b> Epic Action, usable <b>once per game</b></li><li><b>Dashed grey, “P”:</b> Passive, always on and not clickable</li></ul><p>While you hover an Action, the board highlights the enemies it can reach.</p>`],
  ['Stun and Taunt', `<p><b>Stun:</b> a Stunned character skips its next activation, then recovers.</p><p><b>Taunt:</b> while a character has Taunt, enemies <b>must</b> attack it if it is a valid target. Taunt ends when the Taunting character is next selected. Characters with several Taunters nearby may choose between them.</p>`],
  ['Playing online', `<p>Choose <b>Online Battle</b>, create a room and send the 5-letter code to a friend. When they join, the game flips a coin to decide who is Light Side and who is Dark Side. Each of you picks four characters from your own side and clicks Ready.</p><p>If you lose connection or refresh the page, open the game again and choose <b>Resume match</b>. Your opponent's game waits for you.</p>`],
];
function uxGuide(step){
  UX.step = Math.max(0, Math.min(GUIDE.length - 1, step)); try { localStorage.setItem('fb-guide', '1') } catch (e) {}
  let o = document.getElementById('guide');
  if (!o) { o = document.createElement('div'); o.id = 'guide'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); document.body.appendChild(o) }
  const [t, body] = GUIDE[UX.step], last = UX.step == GUIDE.length - 1;
  o.className = 'open'; UX.guideOpen = true;
  o.innerHTML = `<div class="guide-card"><div class="panel-eyebrow">HOW TO PLAY · ${UX.step + 1}/${GUIDE.length}</div><h2>${t}</h2><div class="guide-body">${body}</div>
<div class="guide-dots">${GUIDE.map((_, i) => `<i class="${i == UX.step ? 'on' : ''}"></i>`).join('')}</div>
<div class="guide-nav"><button onclick="uxGuideClose()">Close</button><span></span><button ${UX.step ? '' : 'disabled'} onclick="uxGuide(${UX.step - 1})">← Back</button><button class="btn-primary" onclick="${last ? 'uxGuideClose()' : `uxGuide(${UX.step + 1})`}">${last ? 'Got it' : 'Next →'}</button></div></div>`;
  uxBar();
}
function uxGuideClose(){ const o = document.getElementById('guide'); if (o) o.className = ''; UX.guideOpen = false }

// ---- touch screens: first tap on a button shows its tooltip and range, second tap uses it ----
if (typeof document.addEventListener == 'function') {
  document.addEventListener('keydown', e => { if (e.key == 'Escape' && UX.guideOpen) uxGuideClose() });
  document.addEventListener('pointerdown', () => { const a = ac(); if (a && a.state == 'suspended') a.resume() }, {once:true});
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.ab.on'); if (!b || !matchMedia('(hover:none)').matches) return;
    const key = b.getAttribute('onclick');
    if (UX.armed !== key) {
      e.preventDefault(); e.stopImmediatePropagation(); UX.armed = key;
      const tip = document.getElementById('tip'), r = b.getBoundingClientRect();
      if (tip) { tip.innerHTML = TIPS[b.dataset.ti] || ''; tip.style.display = 'block'; tip.style.left = Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, r.left)) + 'px'; tip.style.top = Math.max(8, r.top - tip.offsetHeight - 8) + 'px' }
      b.focus();
    }
  }, true);
}
