// Online play: room codes over PeerJS (WebRTC), so no game server is needed.
// Both browsers run the same game code with the same random seed, and every input made by the
// active player is sent to the other browser, so both boards stay identical.
const NETVER = '7', ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', PEERPFX = 'forcebattles-';
const INPUTS = ['cell','doAtk','doAb','finish','resolveSplit','resolveQuad','resolveStorm','deselect','stay','back'];
let NET = null;   // {role:'host'|'guest', peer, conn, code, me:0 (Light) | 1 (Dark), remote, busy, gone}
const LOBBY = {mode:'menu', phase:'', msg:'', picks:[], ready:false, oppReady:false, oppPicks:null};
const mine = () => !NET || (NET.me != null && G.turn == NET.me);
const netSend = m => { try { if (NET && NET.conn && NET.conn.open) NET.conn.send(m) } catch (e) {} };
const PC = () => typeof Peer != 'undefined' ? Peer : (globalThis.peerjs && globalThis.peerjs.Peer);
function lobbyReset(){ LOBBY.picks = []; LOBBY.ready = false; LOBBY.oppReady = false; LOBBY.oppPicks = null }
function netErr(e){
  if (e.type == 'peer-unavailable') return 'Room not found. Check the code and try again.';
  if (['network','server-error','socket-error','socket-closed'].includes(e.type)) return 'Could not reach the matchmaking server. Check your internet connection (online play does not work inside the claude.ai preview).';
  return 'Connection error: ' + (e.type || e.message || e);
}
const NETERR = ['network','server-error','socket-error','socket-closed'];
const randCode = () => Array.from({length:5}, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join('');
const rtok = () => Array.from({length:12}, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join('');

// ---- saved match, so a refresh or dropped connection can be resumed ----
const SESSKEY = 'fb-session', SESSMAX = 6 * 3600e3;
function saveSess(){ try { if (NET && NET.start && G && G.win == null) localStorage.setItem(SESSKEY, JSON.stringify({role:NET.role, code:NET.code, me:NET.me, tok:NET.tok, gtok:NET.gtok || null, start:NET.start, hist:NET.hist, t:Date.now()})) } catch (e) {} }
function clearSess(){ try { localStorage.removeItem(SESSKEY) } catch (e) {} }
function loadSess(){ try { const s = JSON.parse(localStorage.getItem(SESSKEY) || 'null'); if (s && s.start && Array.isArray(s.hist) && Date.now() - s.t < SESSMAX) return s } catch (e) {} return null }
// a short fingerprint of the board; sent with every move so a desync is caught immediately
function stateHash(){
  const s = JSON.stringify([G.turn, G.round, G.win, G.u.map(u => [u.d.n, u.x, u.y, u.hp, u.dead ? 1 : 0, u.used, u.ep])]); let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0;
}
function applyEntry(e){
  if (!Array.isArray(e)) return; const n = e[0], a = e[1];
  if (n == '__ff') return applyForfeit(a[0]);
  if (INPUTS.includes(n) && Array.isArray(a)) { const was = NET.remote; NET.remote = 1; try { globalThis[n](...a) } finally { NET.remote = was } }
}
function applyForfeit(side){ if (!G || G.win != null) return; G.win = 1 - side; log(`🏳 ${side ? 'Dark' : 'Light'} Side forfeits`); render() }
function ffClick(){
  if (!NET || !G || G.win != null) return;
  if (!NET.ff) { NET.ff = 1; render(); setTimeout(() => { if (NET && NET.ff) { NET.ff = 0; render() } }, 4000); return }
  NET.ff = 0; applyForfeit(NET.me); NET.hist.push(['__ff', [NET.me]]); netSend({t:'ff', side:NET.me}); clearSess(); render();
}
function netDesync(){ NET.desync = 1; LOBBY.msg = 'The two games went out of sync (different game versions?). Please leave and start a new match.'; render() }

function netLeave(msg){
  if (NET) { try { NET.peer.destroy() } catch (e) {} }
  NET = null; G = null; lobbyReset(); LOBBY.mode = 'menu'; LOBBY.phase = ''; LOBBY.msg = msg || ''; render();
}
function netAttach(c){
  NET.conn = c;
  c.on('data', m => { if (NET && NET.conn === c) netMsg(m) });
  c.on('close', () => {
    if (!NET || NET.conn !== c) return;
    NET.gone = 1;
    if (G && G.win == null) { LOBBY.msg = 'Your opponent disconnected. Waiting for them to come back…'; if (NET.role == 'guest') guestRetry() } else LOBBY.msg = 'Your opponent disconnected.';
    render();
  });
  c.on('error', () => {});
}
// host: owns the room code (the PeerJS id). fresh = a new room (pick another code if taken); otherwise resuming the same code
function hostPeer(code, tries, fresh){
  const peer = new (PC())(PEERPFX + code); NET.peer = peer; NET.code = code;
  peer.on('open', () => { if (NET && NET.peer === peer) render() });
  peer.on('disconnected', () => { if (NET && NET.peer === peer) { try { peer.reconnect() } catch (e) {} } });
  peer.on('connection', c => {
    if (!NET || NET.peer !== peer) return;
    if (NET.conn && !NET.gone) { c.on('open', () => { c.send({t:'full'}); setTimeout(() => c.close(), 400) }); return }
    netAttach(c);
  });
  peer.on('error', e => {
    if (!NET || NET.peer !== peer) return;
    if (e.type == 'unavailable-id' && fresh && tries < 5) { try { peer.destroy() } catch (x) {} hostPeer(randCode(), tries + 1, true) }
    else if (e.type == 'unavailable-id' && !fresh && tries < 30) { try { peer.destroy() } catch (x) {} setTimeout(() => { if (NET && NET.peer === peer) hostPeer(code, tries + 1, false) }, 3000) }
    else netLeave(netErr(e));
  });
}
function netHost(){
  if (!PC()) return netLeave('The PeerJS library did not load, so online play is unavailable.');
  LOBBY.mode = 'online'; LOBBY.phase = 'wait'; LOBBY.msg = ''; lobbyReset();
  NET = {role:'host', peer:null, conn:null, code:'', me:null, remote:0, busy:0, tok:rtok(), gtok:null, hist:[], start:null};
  hostPeer(randCode(), 0, true); render();
}
// guest: connect to the host's room. retry = reconnecting to a match that is already running
function guestConnect(retry){
  const peer = new (PC())(); NET.peer = peer;
  peer.on('open', () => {
    const c = peer.connect(PEERPFX + NET.code, {reliable:true, serialization:'json'}); netAttach(c);
    c.on('open', () => c.send(retry ? {t:'sync', ver:NETVER, len:NET.hist.length, tok:NET.tok} : {t:'hi', ver:NETVER, tok:NET.tok}));
  });
  peer.on('error', e => {
    if (!NET || NET.peer !== peer) return;
    if (retry && (e.type == 'peer-unavailable' || NETERR.includes(e.type)) && NET.tries < 40) { try { peer.destroy() } catch (x) {} NET.tries++; setTimeout(() => { if (NET && NET.peer === peer && NET.gone) guestConnect(1) }, 3000) }
    else netLeave(netErr(e));
  });
}
function guestRetry(){ NET.tries = 0; setTimeout(() => { if (NET && NET.gone && G && G.win == null) { try { NET.peer.destroy() } catch (e) {} guestConnect(1) } }, 1500) }
function netJoin(code){
  code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length != 5) { LOBBY.msg = 'Enter the 5-character room code.'; return render() }
  if (!PC()) return netLeave('The PeerJS library did not load, so online play is unavailable.');
  LOBBY.mode = 'online'; LOBBY.phase = 'joining'; LOBBY.msg = ''; lobbyReset();
  NET = {role:'guest', peer:null, conn:null, code, me:null, remote:0, busy:0, tok:rtok(), hist:[], start:null, tries:0};
  guestConnect(0); const mine0 = NET.peer;
  setTimeout(() => { if (NET && NET.peer === mine0 && LOBBY.phase == 'joining') netLeave('Timed out connecting to the room.') }, 15000);
  render();
}
// rebuild the board from the saved start + move list, then reconnect to the other player
function rebuild(st, hist){
  const idx = l => l.map(n => R.findIndex(r => r.n == n));
  UX.silent = true; seedRng(st.seed); P = [idx(st.p0), idx(st.p1)]; start(); NET.remote = 1;
  try { hist.forEach(e => { if (G.win == null) applyEntry(e) }) } finally { NET.remote = 0 }
  NET.hist = hist.slice(); uxSync();
}
function netResume(){
  const s = loadSess(); if (!s || !PC()) return netLeave('Online play is unavailable right now.');
  LOBBY.mode = 'online'; LOBBY.phase = 'game'; LOBBY.msg = 'Reconnecting to your match…';
  NET = {role:s.role, peer:null, conn:null, code:s.code, me:s.me, remote:0, busy:0, tok:s.tok, gtok:s.gtok, hist:[], start:s.start, gone:1, tries:0};
  rebuild(s.start, s.hist);
  if (s.role == 'host') hostPeer(s.code, 0, false); else guestConnect(1);
  render();
}
function resumeCard(){
  const s = loadSess(); if (!s || NET) return '';
  return `<div class="resume-card"><div><div class="panel-eyebrow">MATCH IN PROGRESS</div><b>Room ${esc(s.code)} · you are ${s.me ? 'Dark' : 'Light'} Side</b><div class="resume-sub">Your opponent's game is waiting for you.</div></div><div class="resume-actions"><button class="btn-primary" onclick="netResume()">Resume match</button><button onclick="clearSess();render()">Abandon</button></div></div>`;
}
function netMsg(m){
  if (!m || typeof m != 'object') return;
  if (m.t == 'hi' && NET.role == 'host') {
    if (m.ver != NETVER) { netSend({t:'badver'}); return }
    if (G || NET.start) { netSend({t:'full'}); return }   // a match is already running: only the original guest can rejoin
    NET.gtok = m.tok; NET.gone = 0; LOBBY.msg = '';
    NET.me = Math.floor(Math.random() * 2); lobbyReset(); LOBBY.phase = 'pick';   // random side for the host; the guest gets the other
    netSend({t:'welcome', ver:NETVER, hostSide:NET.me}); render();
  } else if (m.t == 'welcome' && NET.role == 'guest') {
    if (m.ver != NETVER) return netLeave('Game versions differ. Both players need the same version.');
    NET.me = 1 - m.hostSide; G = null; NET.start = null; NET.hist = []; lobbyReset(); LOBBY.phase = 'pick'; LOBBY.msg = ''; render();
  } else if (m.t == 'full') netLeave('That room is already full.');
  else if (m.t == 'badver') netLeave('Game versions differ. Both players need the same version.');
  else if (m.t == 'sync') {
    if (m.ver != NETVER) return netLeave('Game versions differ. Both players need the same version.');
    if (NET.role == 'host' && (!NET.gtok || m.tok !== NET.gtok)) { netSend({t:'full'}); return }
    NET.gone = 0; NET.tries = 0; LOBBY.msg = ''; const L = NET.hist.length;
    if (L > m.len) netSend({t:'tail', from:m.len, h:NET.hist.slice(m.len)});
    if (NET.role == 'host') netSend({t:'sync', ver:NETVER, len:L});
    render();
  } else if (m.t == 'tail' && G && Array.isArray(m.h) && Number.isInteger(m.from) && m.from <= NET.hist.length) {
    m.h.slice(NET.hist.length - m.from).forEach(e => { if (G.win == null) { applyEntry(e); NET.hist.push(e) } });
    saveSess(); if (G.win != null) clearSess(); render();
  } else if (m.t == 'picks' && Array.isArray(m.names) && NET.me != null) {
    if (costOfNames(m.names) != SQUAD_SIZE || new Set(m.names).size != m.names.length || !m.names.every(n => R.some(r => r.n == n && r.s == (NET.me ? 'L' : 'D')))) return;
    LOBBY.oppReady = true; LOBBY.oppPicks = m.names; maybeStart(); render();
  } else if (m.t == 'start' && NET.role == 'guest' && LOBBY.ready) onlineStart(m.seed, m.p0, m.p1);
  else if (m.t == 'again' && NET.role == 'host') doRematch();
  else if (m.t == 'ff' && G && G.win == null && m.side === 1 - NET.me) { applyForfeit(m.side); NET.hist.push(['__ff', [m.side]]); clearSess() }
  else if (m.t == 'in' && G && G.win == null && G.turn != NET.me && INPUTS.includes(m.n) && Array.isArray(m.a)) {
    applyEntry([m.n, m.a]); NET.hist.push([m.n, m.a]);
    if (m.h != null && m.h !== stateHash()) netDesync();
    saveSess(); if (G.win != null) clearSess();
  }
}
function maybeStart(){
  if (NET.role != 'host' || !LOBBY.ready || !LOBBY.oppReady || G) return;
  const my = LOBBY.picks.map(i => R[i].n), opp = LOBBY.oppPicks, p0 = NET.me == 0 ? my : opp, p1 = NET.me == 0 ? opp : my;
  const seed = Math.floor(Math.random() * 4294967296);
  netSend({t:'start', seed, p0, p1}); onlineStart(seed, p0, p1);
}
function onlineStart(seed, p0, p1){
  const idx = l => Array.isArray(l) ? l.map(n => R.findIndex(r => r.n == n)) : [-1];
  const a = idx(p0), b = idx(p1);
  if (a.includes(-1) || b.includes(-1) || squadCost(a) != SQUAD_SIZE || squadCost(b) != SQUAD_SIZE) return netLeave('Invalid teams received.');
  NET.start = {seed, p0, p1}; NET.hist = []; NET.ff = 0;
  seedRng(seed); P = [a, b]; LOBBY.phase = 'game'; LOBBY.msg = ''; start(); saveSess();
}
function doRematch(){
  NET.me = Math.floor(Math.random() * 2); G = null; NET.start = null; NET.hist = []; clearSess(); lobbyReset(); LOBBY.phase = 'pick'; LOBBY.msg = '';
  netSend({t:'welcome', ver:NETVER, hostSide:NET.me}); render();
}
function lpk(i){ if (LOBBY.ready) return; const a = LOBBY.picks, j = a.indexOf(i); if (j >= 0) a.splice(j, 1); else if (squadCost(a) + R[i].cost <= SQUAD_SIZE) a.push(i); render() }
function lobbyRandom(){ if (LOBBY.ready) return; const s = NET.me ? 'D' : 'L'; LOBBY.picks = randSquad(s); render() }
function lobbyReady(){ if (squadCost(LOBBY.picks) != SQUAD_SIZE || LOBBY.ready) return; LOBBY.ready = true; netSend({t:'picks', names:LOBBY.picks.map(i => R[i].n)}); maybeStart(); render() }
function onlineBar(){
  if (!NET) return '';
  const over = G.win != null;
  const st = LOBBY.msg ? `<span class="err">${esc(LOBBY.msg)}</span>` : over ? (G.win == NET.me ? '<b>You win!</b>' : '<b>You lose.</b>') : (mine() ? '<b class="yourturn">Your turn</b>' : "Opponent's turn…");
  const btns = over ? '<button class="btn-ghost" onclick="netLeave()">Leave room</button>' : `<button class="btn-ghost" onclick="ffClick()">${NET.ff ? 'Click again to forfeit' : 'Forfeit'}</button><button class="btn-ghost" onclick="netLeave()">Leave</button>`;
  return `<div class="card online-bar${!over && !LOBBY.msg && mine() ? ' myturn' : ''}"><span>Room <b>${NET.code}</b> · You are <b>${NET.me ? 'Dark' : 'Light'} Side</b> · ${st}</span><span class="ob-actions">${btns}</span></div>`;
}
const cardHtml = (r, i, on, fn) => `<div class="card pick-card ${on?'picked':''}" role="button" tabindex="0" aria-pressed="${on}" onclick="${fn}" onkeydown="if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${fn}}"><div class="pick-card-top"><div class="pick-portrait" style="border-color:var(--${r.s});background-image:${r.img?`url('${r.img}')`:'none'}"></div><div class="pick-details"><b>${esc(r.n)}</b><div class="pick-stats">♥ ${r.h} HP · ⚔ ${r.a}d6 · 🛡 ${r.d}d6${r.cost>1?' · counts as '+r.cost:''}</div><small>${r.t.map(esc).join(' · ')}</small></div><span class="pick-check" aria-hidden="true">${on?'✓':'+'}</span></div><div class="pick-tags">${r.t.slice(0,3).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>${homeBar(r)}${on?'<div class="selected-caption">SELECTED · CLICK TO REMOVE</div>':''}</div>`;
function lobbyScreen(){
  let h = '';
  if (LOBBY.mode == 'menu') {
    if (LOBBY.msg) h += `<div class="card err">${esc(LOBBY.msg)}</div>`;
    h += resumeCard();
    h += `<section class="hero">
      <div class="hero-kicker"><span class="status-dot"></span> TACTICAL DUEL · 2 PLAYERS</div>
      <h2>Choose your side.<br><span>Change the galaxy.</span></h2>
      <p class="hero-copy">Build a squad of four legendary warriors and outthink your opponent in a turn-based Star Wars-inspired duel.</p>
      <div class="hero-stats"><div><strong>4v4</strong><span>SQUAD BATTLES</span></div><div><strong>d6</strong><span>DICE COMBAT</span></div><div><strong>1v1</strong><span>ONLINE DUELS</span></div></div>
    </section>
    <section class="menu-grid">
      <div class="menu-panel online-panel">
        <div class="panel-icon">⌁</div><div class="panel-eyebrow">PLAY WITH A FRIEND</div>
        <h3>Online Battle</h3><p>Create a private room or join a friend's match with a room code.</p>
        <button class="btn-primary btn-wide" onclick="netHost()">＋ Create room</button>
        <div class="join-row"><label for="joinCode">HAVE A ROOM CODE?</label><div class="join-controls"><input id="joinCode" maxlength="5" placeholder="ABCDE" aria-label="Room code" autocomplete="off" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')"> <button class="btn-secondary" onclick="netJoin(document.getElementById('joinCode').value)">Join room <span aria-hidden="true">→</span></button></div></div>
      </div>
      <div class="menu-panel local-panel">
        <div class="panel-icon">⚔</div><div class="panel-eyebrow">ONE DEVICE · TWO PLAYERS</div>
        <h3>Local Skirmish</h3><p>Take turns on the same device. Perfect for learning the rules or playing side by side.</p>
        <button class="btn-secondary btn-wide" onclick="LOBBY.mode='local';render()">Play locally <span aria-hidden="true">→</span></button>
        <div class="mode-note"><span class="mode-dot"></span> No room code required</div>
      </div>
    </section>
    <section class="menu-panel squads-panel">
      <div class="panel-icon">★</div><div class="panel-eyebrow">YOUR SQUADS · SAVED IN THIS BROWSER</div>
      <h3>Saved Squads</h3><p>Build a squad once, then load it in a click for local and online battles.</p>
      <button class="btn-secondary btn-wide" onclick="LOBBY.mode='squads';render()">Manage squads (${sqList().length}) <span aria-hidden="true">→</span></button>
    </section>
    <p class="menu-footnote">SELECT YOUR CHARACTERS · PLAN YOUR MOVES · MASTER THE FORCE</p>`;
  } else if (LOBBY.phase == 'wait') {
    const ok = NET && NET.peer.open;
    h += `<div class="card"><b>Room code: <span style="font-size:28px;letter-spacing:4px">${ok ? NET.code : '…'}</span></b><br>${ok ? 'Send this code to your opponent. Waiting for them to join…' : 'Creating room…'}<br><br><button onclick="netLeave()">Cancel</button></div>`;
  } else if (LOBBY.phase == 'joining') {
    h += `<div class="card">Connecting to room ${NET ? NET.code : ''}…<br><br><button onclick="netLeave()">Cancel</button></div>`;
  } else if (LOBBY.phase == 'pick') {
    const t = NET.me, side = t ? 'Dark' : 'Light';
    h += `<div class="bar ${t ? 'D' : 'L'}">Room ${NET.code} · You are ${side} Side (picked at random)</div>`;
    if (LOBBY.msg) h += `<div class="card err">${esc(LOBBY.msg)} <button onclick="netLeave()">Leave</button></div>`;
    h += `<div class="selection-header"><div><div class="panel-eyebrow">ONLINE SQUAD BUILDER</div><h2>Choose your champions</h2><p>Pick four ${side} Side characters (Darth Bane counts as three). Click a selected character again to remove them. Your opponent is picking too.</p></div><div class="online-pick-actions"><button onclick="lobbyRandom()" ${LOBBY.ready?'disabled':''}>🎲 Random team</button><button class="btn-primary" ${squadCost(LOBBY.picks) == SQUAD_SIZE && !LOBBY.ready ? '' : 'disabled'} onclick="lobbyReady()">${LOBBY.ready ? 'Ready ✓' : 'Ready · '+squadCost(LOBBY.picks)+'/4'}</button><button onclick="netLeave()">Leave room</button></div></div><div class="pick-toolbar"><label class="pick-search"><span aria-hidden="true">⌕</span><input aria-label="Search characters" placeholder="Search characters or traits…" value="${esc(PICK_SEARCH)}" oninput="setPickSearch(this.value)" ${LOBBY.ready?'disabled':''}></label><label class="pick-filter"><span>FACTION / TRAIT</span><select aria-label="Filter by faction or trait" onchange="setPickFaction(this.value)" ${LOBBY.ready?'disabled':''}><option value="">All factions and traits</option>${[...new Set(R.flatMap(r=>r.t))].sort((a,b)=>a.localeCompare(b)).map(f=>`<option value="${esc(f)}" ${PICK_FACTION===f?'selected':''}>${esc(f)}</option>`).join('')}</select></label><button class="btn-secondary" onclick="PICK_SEARCH='';PICK_FACTION='';render()" ${LOBBY.ready?'disabled':''}>Clear filters</button><span class="online-pick-status">${squadCost(LOBBY.picks)}/4 picked · Opponent: ${LOBBY.oppReady ? 'ready' : 'picking…'}</span></div>${sqStrip(t ? 'D' : 'L', id => `lobbySquad('${id}')`, LOBBY.picks, LOBBY.ready, 'lobbySaveSquad()', squadCost(LOBBY.picks) == SQUAD_SIZE, false)}<div class="pickgrid online-pick-grid">`;
    let shown = 0;
    R.forEach((r, i) => { if (r.s == (t ? 'D' : 'L') && (!PICK_SEARCH || (r.n+' '+r.t.join(' ')).toLowerCase().includes(PICK_SEARCH.toLowerCase())) && (!PICK_FACTION || r.t.includes(PICK_FACTION))) { h += cardHtml(r, i, LOBBY.picks.includes(i), `lpk(${i})`); shown++; } });
    if (!shown) h += '<div class="empty-picks">No characters match these filters.</div>';
    h += '</div>';
  }
  $('#app').innerHTML = h;
}
// Wrap every input so that it is blocked when it is not your turn, and sent to your opponent when it is.
function netInit(){
  INPUTS.forEach(n => {
    const f = globalThis[n];
    globalThis[n] = function(...a){
      if (!NET || NET.busy || NET.remote) return f.apply(this, a);
      if (NET.me == null || !G || G.turn != NET.me || G.win != null || NET.desync) { if (n == 'cell' && G) { const u = occ(a[0], a[1]); G.insp = u || null; render() } return }
      let r; NET.busy = 1;
      try { r = f.apply(this, a) } finally { NET.busy = 0 }
      NET.hist.push([n, a]); netSend({t:'in', n, a, h:G ? stateHash() : null}); saveSess(); if (G && G.win != null) clearSess();
      return r;
    };
  });
}
