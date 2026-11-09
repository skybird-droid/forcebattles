// Public lobbies, with no server of our own.
// A public host keeps its normal room (a PeerJS id built from the room code) and also claims one of
// PUBSLOTS "beacon" ids: forcebattles-pub<NETVER>-0, -1, ... The lobby screen connects to every beacon id;
// each live beacon answers with its room code, name and status, then hangs up. Joining a listed game is
// the same as typing its room code, so all of the room / resume logic in net.js is reused unchanged.
// The version is part of the beacon id, so players on different game versions never see each other.
const PUBSLOTS = 16, PUBWAIT = 4500, PUBNAMEKEY = 'fb-name';
const pubPfx = () => PEERPFX + 'pub' + NETVER + '-';
const PUB = {peer:null, games:[], scanning:0, done:0, err:'', timer:null, name:null};
const pubOnMenu = () => !NET && !G && (LOBBY.mode == 'menu' || LOBBY.mode == 'public');

// ---- browsing ----
function pubStop(){
  clearTimeout(PUB.timer); PUB.timer = null; PUB.scanning = 0;
  if (PUB.peer) { try { PUB.peer.destroy() } catch (e) {} PUB.peer = null }
}
// called after the menu or lobby screen is drawn: keep a scan cycle running while one of them is open
function pubWatch(){ if (pubOnMenu() && !PUB.timer && !PUB.scanning) pubScan() }
function pubNext(){ clearTimeout(PUB.timer); PUB.timer = pubOnMenu() ? setTimeout(pubScan, LOBBY.mode == 'public' ? 10000 : 20000) : null; if (!PUB.timer) pubStop() }
function pubScan(){
  clearTimeout(PUB.timer); PUB.timer = null;
  if (!pubOnMenu()) return pubStop();
  if (PUB.scanning) return;
  if (!PC()) { PUB.err = 'Online play is unavailable because the PeerJS library did not load.'; PUB.done = 1; return pubRender() }
  PUB.scanning = 1; PUB.err = '';
  const run = peer => {
    const found = [];
    for (let i = 0; i < PUBSLOTS; i++) {
      let c; try { c = peer.connect(pubPfx() + i, {reliable:true, serialization:'json'}) } catch (e) { continue }
      if (!c) continue;
      c.on('data', m => { const g = pubClean(m, i); if (g && !found.some(f => f.code == g.code)) found.push(g); try { c.close() } catch (e) {} });
      c.on('error', () => {});
      setTimeout(() => { try { c.close() } catch (e) {} }, PUBWAIT);
    }
    setTimeout(() => {
      if (PUB.peer !== peer) return;
      PUB.games = found.sort((a, b) => (a.status == 'open' ? 0 : 1) - (b.status == 'open' ? 0 : 1) || a.slot - b.slot);
      PUB.scanning = 0; PUB.done = 1; pubRender(); pubNext();
    }, PUBWAIT + 200);
  };
  if (PUB.peer && PUB.peer.open && !PUB.peer.destroyed) { pubRender(); return run(PUB.peer) }
  if (PUB.peer) { try { PUB.peer.destroy() } catch (e) {} }
  const peer = new (PC())(); PUB.peer = peer;
  peer.on('open', () => { if (PUB.peer === peer) run(peer) });
  peer.on('error', e => {
    if (PUB.peer !== peer || e.type == 'peer-unavailable') return;   // an empty slot: expected
    PUB.err = NETERR.includes(e.type) ? 'Could not reach the matchmaking server. Check your internet connection.' : 'Lobby error: ' + (e.type || e);
    PUB.scanning = 0; PUB.done = 1; try { peer.destroy() } catch (x) {} PUB.peer = null; pubRender(); pubNext();
  });
  pubRender();
}
// a beacon's reply comes from another browser, so accept only well-formed values
function pubClean(m, slot){
  if (!m || typeof m != 'object' || m.t != 'pub' || m.v != NETVER) return null;
  const code = String(m.code || '').toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(code)) return null;
  return {slot, code, name:String(m.name || 'Player').slice(0, 20) || 'Player', status:['open', 'picking', 'playing'].includes(m.status) ? m.status : 'playing', round:Math.max(0, Math.min(99, +m.round || 0))};
}
function pubJoin(code){ if (!/^[A-Z0-9]{5}$/.test(code)) return; pubStop(); netJoin(code) }

// ---- hosting ----
function pubName(){ if (PUB.name != null) return PUB.name; try { return localStorage.getItem(PUBNAMEKEY) || '' } catch (e) { return '' } }
function pubSetName(v){ PUB.name = String(v).slice(0, 20); try { localStorage.setItem(PUBNAMEKEY, PUB.name) } catch (e) {} }
function pubHost(){
  const name = pubName().trim() || 'Player ' + (1000 + Math.floor(Math.random() * 9000));
  pubStop(); netHost(); if (!NET) return;
  NET.pub = {name, slot:null}; pubBeacon(0); render();
}
function pubBeacon(k){
  const b = new (PC())(pubPfx() + k); NET.beacon = b;
  b.on('open', () => { if (NET && NET.beacon === b) { NET.pub.slot = k; render() } });
  b.on('connection', c => { c.on('open', () => { try { if (NET && NET.beacon === b) c.send(pubInfo()) } catch (e) {} setTimeout(() => { try { c.close() } catch (e) {} }, 600) }); c.on('error', () => {}) });
  b.on('disconnected', () => { if (NET && NET.beacon === b) { try { b.reconnect() } catch (e) {} } });
  b.on('error', e => {
    if (!NET || NET.beacon !== b) return;
    if (e.type != 'unavailable-id') return;   // other beacon errors don't affect the room itself
    try { b.destroy() } catch (x) {}
    if (k < PUBSLOTS - 1) pubBeacon(k + 1);
    else { NET.beacon = null; NET.pub.full = 1; render() }
  });
}
function pubInfo(){
  const busy = NET.conn && !NET.gone;
  return {t:'pub', v:NETVER, code:NET.code, name:NET.pub.name, status:busy ? (G ? 'playing' : 'picking') : (G || NET.start) ? 'playing' : 'open', round:G ? G.round : 0};
}

// ---- screens ----
const PUBST = {open:'Waiting for an opponent', picking:'Choosing squads'};
function pubListHtml(max){
  const g = PUB.games, L = max ? g.slice(0, max) : g;
  if (PUB.err && !g.length) return `<div class="gp-empty"><b>Lobbies unavailable</b><span>${esc(PUB.err)}</span></div>`;
  if (!PUB.done) return `<div class="gp-empty"><b>Searching for games…</b><span>This takes a few seconds.</span></div>`;
  if (!g.length) return `<div class="gp-empty"><b>No public games right now</b><span>Host one and wait for a challenger, or create a private room for a friend.</span></div>`;
  return `<ul class="gp-list">${L.map(x => `<li class="gp-row ${x.status}"><span class="gp-dot"></span><div class="gp-info"><b>${esc(x.name)}</b><span>${PUBST[x.status] || 'In battle · Round ' + x.round}</span></div>${x.status == 'open' ? `<button class="btn-primary" onclick="pubJoin('${x.code}')">Join</button>` : '<span class="gp-tag">Full</span>'}</li>`).join('')}</ul>${max && g.length > max ? `<button class="gp-more" onclick="LOBBY.mode='public';render()">+${g.length - max} more</button>` : ''}`;
}
// refresh just the game lists, so typing in the name box is never interrupted
function pubRender(){
  if (!pubOnMenu()) return;
  const set = (id, h) => { const e = document.getElementById(id); if (e) e.innerHTML = h };
  set('pub-list', pubListHtml(0)); set('gp-list', pubListHtml(4)); set('gp-count', String(PUB.games.length));
  const r = document.getElementById('pub-refresh'); if (r) { r.disabled = !!PUB.scanning; r.textContent = PUB.scanning ? 'Searching…' : 'Refresh' }
}
function pubSidebar(){
  return `<section class="menu-panel games-panel">
      <div class="gp-head"><h3>Games in Progress</h3><span class="gp-count" id="gp-count">${PUB.games.length}</span></div>
      <div id="gp-list">${pubListHtml(4)}</div>
      <button class="btn-secondary btn-wide" onclick="LOBBY.mode='public';render()">Browse public lobbies <span aria-hidden="true">→</span></button>
    </section>`;
}
function pubScreen(){
  return `<div class="selection-header"><button onclick="LOBBY.mode='menu';render()">← Back to menu</button><div><div class="panel-eyebrow">LIVE PLAY</div><h2>Public Lobbies</h2><p>Host a game anyone can join, or jump into an open one. Games are found directly between browsers, so the list can take a few seconds to fill.</p></div></div>
    <div class="pub-layout">
      <section class="menu-panel online-panel pub-host"><div class="panel-eyebrow">HOST</div><h3>Host a public game</h3><p>Your game shows up in everyone's lobby list. The first player to join is your opponent, and Light or Dark is picked at random.</p>
        <label class="pub-name"><span>YOUR NAME</span><input id="pubName" maxlength="20" placeholder="Player" autocomplete="off" value="${esc(pubName())}" oninput="pubSetName(this.value)" onkeydown="if(event.key==='Enter')pubHost()"></label>
        <button class="btn-primary btn-wide" onclick="pubHost()">Host public game</button></section>
      <section class="menu-panel games-panel pub-games"><div class="gp-head"><h3>Open and live games</h3><button class="btn-secondary" id="pub-refresh" onclick="pubScan()" ${PUB.scanning ? 'disabled' : ''}>${PUB.scanning ? 'Searching…' : 'Refresh'}</button></div><div id="pub-list">${pubListHtml(0)}</div></section>
    </div>`;
}
