// Online play: room codes over PeerJS (WebRTC), so no game server is needed.
// Both browsers run the same game code with the same random seed, and every input made by the
// active player is sent to the other browser, so both boards stay identical.
const NETVER = '1', ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', PEERPFX = 'forcebattles-';
const INPUTS = ['cell','doAtk','doAb','finish','resolveSplit','resolveQuad','resolveStorm','deselect','back'];
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
function netLeave(msg){
  if (NET) { try { NET.peer.destroy() } catch (e) {} }
  NET = null; G = null; lobbyReset(); LOBBY.mode = 'menu'; LOBBY.phase = ''; LOBBY.msg = msg || ''; render();
}
function netAttach(c){
  NET.conn = c;
  c.on('data', m => { if (NET && NET.conn === c) netMsg(m) });
  c.on('close', () => { if (NET && NET.conn === c) { NET.gone = 1; LOBBY.msg = 'Your opponent disconnected.'; render() } });
  c.on('error', () => {});
}
function netHost(){
  if (!PC()) return netLeave('The PeerJS library did not load, so online play is unavailable.');
  LOBBY.mode = 'online'; LOBBY.phase = 'wait'; LOBBY.msg = ''; lobbyReset();
  const open = tries => {
    const code = Array.from({length:5}, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join(''), peer = new (PC())(PEERPFX + code);
    NET = {role:'host', peer, conn:null, code, me:null, remote:0, busy:0};
    peer.on('open', () => { if (NET && NET.peer === peer) render() });
    peer.on('connection', c => {
      if (!NET || NET.peer !== peer) return;
      if (NET.conn && !NET.gone) { c.on('open', () => { c.send({t:'full'}); setTimeout(() => c.close(), 400) }); return }
      NET.gone = 0; LOBBY.msg = ''; netAttach(c);
    });
    peer.on('error', e => {
      if (!NET || NET.peer !== peer) return;
      if (e.type == 'unavailable-id' && tries < 5) { try { peer.destroy() } catch (x) {} open(tries + 1) } else netLeave(netErr(e));
    });
  };
  open(0); render();
}
function netJoin(code){
  code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length != 5) { LOBBY.msg = 'Enter the 5-character room code.'; return render() }
  if (!PC()) return netLeave('The PeerJS library did not load, so online play is unavailable.');
  LOBBY.mode = 'online'; LOBBY.phase = 'joining'; LOBBY.msg = ''; lobbyReset();
  const peer = new (PC())();
  NET = {role:'guest', peer, conn:null, code, me:null, remote:0, busy:0};
  peer.on('open', () => { const c = peer.connect(PEERPFX + code, {reliable:true, serialization:'json'}); netAttach(c); c.on('open', () => c.send({t:'hi', ver:NETVER})) });
  peer.on('error', e => { if (NET && NET.peer === peer) netLeave(netErr(e)) });
  setTimeout(() => { if (NET && NET.peer === peer && LOBBY.phase == 'joining') netLeave('Timed out connecting to the room.') }, 15000);
  render();
}
function netMsg(m){
  if (!m || typeof m != 'object') return;
  if (m.t == 'hi' && NET.role == 'host') {
    if (m.ver != NETVER) { netSend({t:'badver'}); return }
    NET.me = Math.floor(Math.random() * 2); G = null; lobbyReset(); LOBBY.phase = 'pick';   // random side for the host; the guest gets the other
    netSend({t:'welcome', ver:NETVER, hostSide:NET.me}); render();
  } else if (m.t == 'welcome' && NET.role == 'guest') {
    if (m.ver != NETVER) return netLeave('Game versions differ. Both players need the same version.');
    NET.me = 1 - m.hostSide; G = null; lobbyReset(); LOBBY.phase = 'pick'; LOBBY.msg = ''; render();
  } else if (m.t == 'full') netLeave('That room is already full.');
  else if (m.t == 'badver') netLeave('Game versions differ. Both players need the same version.');
  else if (m.t == 'picks' && Array.isArray(m.names) && NET.me != null) {
    if (m.names.length != 4 || !m.names.every(n => R.some(r => r.n == n && r.s == (NET.me ? 'L' : 'D')))) return;
    LOBBY.oppReady = true; LOBBY.oppPicks = m.names; maybeStart(); render();
  } else if (m.t == 'start' && NET.role == 'guest' && LOBBY.ready) onlineStart(m.seed, m.p0, m.p1);
  else if (m.t == 'again' && NET.role == 'host') doRematch();
  else if (m.t == 'in' && G && G.turn != NET.me && INPUTS.includes(m.n) && Array.isArray(m.a)) {
    NET.remote = 1; try { globalThis[m.n](...m.a) } finally { NET.remote = 0 }
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
  if (a.length != 4 || b.length != 4 || a.concat(b).includes(-1)) return netLeave('Invalid teams received.');
  seedRng(seed); P = [a, b]; LOBBY.phase = 'game'; LOBBY.msg = ''; start();
}
function doRematch(){
  NET.me = Math.floor(Math.random() * 2); G = null; lobbyReset(); LOBBY.phase = 'pick'; LOBBY.msg = '';
  netSend({t:'welcome', ver:NETVER, hostSide:NET.me}); render();
}
function lpk(i){ if (LOBBY.ready) return; const a = LOBBY.picks, j = a.indexOf(i); if (j >= 0) a.splice(j, 1); else if (a.length < 4) a.push(i); render() }
function lobbyRandom(){ if (LOBBY.ready) return; const s = NET.me ? 'D' : 'L'; LOBBY.picks = R.map((r, i) => i).filter(i => R[i].s == s).sort(() => Math.random() - .5).slice(0, 4); render() }
function lobbyReady(){ if (LOBBY.picks.length != 4 || LOBBY.ready) return; LOBBY.ready = true; netSend({t:'picks', names:LOBBY.picks.map(i => R[i].n)}); maybeStart(); render() }
function onlineBar(){
  if (!NET) return '';
  const st = LOBBY.msg ? `<span class="err">${esc(LOBBY.msg)}</span> <button onclick="netLeave()">Leave</button>` : (G.win != null ? (G.win == NET.me ? 'You win!' : 'You lose.') : (mine() ? '<b>Your turn</b>' : "Opponent's turn…"));
  return `<div class="card">Room <b>${NET.code}</b> · You are <b>${NET.me ? 'Dark' : 'Light'} Side</b> · ${st}</div>`;
}
const cardHtml = (r, i, on, fn) => `<div class="card" style="cursor:pointer;border:3px solid ${on ? '#e8b923' : 'var(--ln)'}" onclick="${fn}"><div style="display:flex;gap:8px;align-items:center"><div style="width:56px;height:56px;flex:none;border:3px solid var(--${r.s}); border-radius:6px;background:#888 ${r.img ? `url('${r.img}')` : ''} center/cover"></div><div><b>${r.n}</b><br>HP ${r.h} · ${r.a}d6 / ${r.d}d6<br><small>${r.t.join(' • ')}</small></div></div>${homeBar(r)}</div>`;
function lobbyScreen(){
  let h = '';
  if (LOBBY.mode == 'menu') {
    if (LOBBY.msg) h += `<div class="card err">${esc(LOBBY.msg)}</div>`;
    h += `<p>A 4v4 duel: one player is Light Side and the other is Dark Side. In a room, the sides are assigned at random.</p>
<div class="card"><b>Play online with a room code</b><br><br><button onclick="netHost()">Create room</button><br><br>
<input id="joinCode" maxlength="5" placeholder="ROOM CODE" style="text-transform:uppercase;width:120px;padding:6px"> <button onclick="netJoin(document.getElementById('joinCode').value)">Join room</button></div>
<div class="card"><b>Same device</b><br><br><button onclick="LOBBY.mode='local';render()">Play locally (pass-and-play)</button></div>`;
  } else if (LOBBY.phase == 'wait') {
    const ok = NET && NET.peer.open;
    h += `<div class="card"><b>Room code: <span style="font-size:28px;letter-spacing:4px">${ok ? NET.code : '…'}</span></b><br>${ok ? 'Send this code to your opponent. Waiting for them to join…' : 'Creating room…'}<br><br><button onclick="netLeave()">Cancel</button></div>`;
  } else if (LOBBY.phase == 'joining') {
    h += `<div class="card">Connecting to room ${NET ? NET.code : ''}…<br><br><button onclick="netLeave()">Cancel</button></div>`;
  } else if (LOBBY.phase == 'pick') {
    const t = NET.me, side = t ? 'Dark' : 'Light';
    h += `<div class="bar ${t ? 'D' : 'L'}">Room ${NET.code} · You are ${side} Side (picked at random)</div>`;
    if (LOBBY.msg) h += `<div class="card err">${esc(LOBBY.msg)} <button onclick="netLeave()">Leave</button></div>`;
    h += `<p>Pick 4 ${side} Side characters. Your opponent is picking too, and teams are revealed when you are both ready.</p><button onclick="lobbyRandom()">🎲 Random team</button> <button ${LOBBY.picks.length == 4 && !LOBBY.ready ? '' : 'disabled'} onclick="lobbyReady()">${LOBBY.ready ? 'Ready ✓' : 'Ready'}</button> <button onclick="netLeave()">Leave room</button> <span>${LOBBY.picks.length}/4 picked · Opponent: ${LOBBY.oppReady ? 'ready' : 'picking…'}</span><div class="pickgrid">`;
    R.forEach((r, i) => { if (r.s == (t ? 'D' : 'L')) h += cardHtml(r, i, LOBBY.picks.includes(i), `lpk(${i})`) });
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
      if (NET.me == null || G.turn != NET.me || G.win != null || NET.gone) { if (n == 'cell') { const u = occ(a[0], a[1]); G.insp = u || null; render() } return }
      netSend({t:'in', n, a}); NET.busy = 1;
      try { return f.apply(this, a) } finally { NET.busy = 0 }
    };
  });
}
