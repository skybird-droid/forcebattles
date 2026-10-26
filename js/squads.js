// Saved squads. They are stored in this browser (localStorage) by character NAME, so they keep working if the roster changes.
const SQ_KEY = 'fb-squads', SQ_MAX = 30;
const SQ = {side:'L', picks:[], name:'', editId:null, msg:'', confirm:null, flash:'', flashSide:''};
function sqRaw(){ try { const a = JSON.parse(localStorage.getItem(SQ_KEY) || '[]'); return Array.isArray(a) ? a : [] } catch (e) { return [] } }
function sqWrite(a){ try { localStorage.setItem(SQ_KEY, JSON.stringify(a)); return true } catch (e) { return false } }
function sqValid(s){
  if (!s || typeof s.id != 'string' || typeof s.name != 'string' || (s.side != 'L' && s.side != 'D') || !Array.isArray(s.names)) return false;
  if (new Set(s.names).size != s.names.length) return false;
  if (!s.names.every(n => { const r = R.find(x => x.n === n); return r && r.s === s.side })) return false;
  return costOfNames(s.names) === SQUAD_SIZE;
}
function sqList(side){ return sqRaw().filter(sqValid).filter(s => !side || s.side === side) }
function sqIdx(s){ return s.names.map(n => R.findIndex(r => r.n === n)) }
function sqDefaultName(side){
  const used = new Set(sqList(side).map(s => s.name)), base = side == 'D' ? 'Dark squad' : 'Light squad';
  let i = sqList(side).length + 1; while (used.has(base + ' ' + i)) i++; return base + ' ' + i;
}
function sqNewId(){ return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
// Save a squad (new, or update editId). A squad with the same name on the same side is overwritten instead of duplicated.
function sqAdd(side, idxs, name, editId){
  if (!idxs.length || idxs.some(i => !R[i] || R[i].s !== side) || squadCost(idxs) !== SQUAD_SIZE || new Set(idxs).size !== idxs.length)
    return {ok:false, msg:'A squad needs exactly ' + SQUAD_SIZE + ' squad points of ' + (side == 'D' ? 'Dark' : 'Light') + ' Side characters.'};
  name = (name || '').trim().slice(0, 28) || sqDefaultName(side);
  const names = idxs.map(i => R[i].n); let raw = sqRaw(), id, verb;
  const dup = raw.find(s => s && s.side === side && s.name === name && s.id !== editId);
  if (editId && raw.some(s => s && s.id === editId)) {
    id = editId; verb = 'updated';
    if (dup) raw = raw.filter(s => s !== dup);
    raw = raw.map(s => s && s.id === editId ? {id, name, side, names} : s);
  } else if (dup) {
    id = dup.id; verb = 'updated';
    raw = raw.map(s => s === dup ? {id, name, side, names} : s);
  } else {
    if (sqList(side).length >= SQ_MAX) return {ok:false, msg:'You can keep up to ' + SQ_MAX + ' squads per side. Delete one first.'};
    id = sqNewId(); verb = 'saved'; raw.push({id, name, side, names});
  }
  if (!sqWrite(raw)) return {ok:false, msg:"This browser isn't allowing saved data (private mode?), so the squad couldn't be saved."};
  return {ok:true, id, name, msg:'"' + name + '" ' + verb + '.'};
}
function sqRemove(id){ const raw = sqRaw(); return sqWrite(raw.filter(s => !(s && s.id === id))) }
function sqFlash(side, msg){
  SQ.flash = msg; SQ.flashSide = side; render();
  setTimeout(() => { SQ.flash = ''; const el = document.querySelector('.squad-flash'); if (el) el.remove() }, 3500);
}
// One-click strip of saved squads for a side (used by the local picker, the online lobby and the manager).
function sqStrip(side, fn, cur, disabled, saveFn, canSave, manage){
  const list = sqList(side);
  let h = '<div class="squad-strip"><span class="squad-strip-label">SAVED SQUADS</span>';
  if (!list.length) h += '<span class="squad-empty">None yet. Pick a full squad, then press Save squad.</span>';
  list.forEach(s => {
    const idx = sqIdx(s), on = cur && cur.length === idx.length && idx.every(i => cur.includes(i));
    h += `<button class="squad-chip${on ? ' on' : ''}" ${disabled ? 'disabled' : ''} title="${esc(s.names.join(', '))}" onclick="${fn(s.id)}"><span class="sq-avs">${idx.map(i => `<span class="sq-av" style="background-image:${R[i].img ? `url('${R[i].img}')` : 'none'}"></span>`).join('')}</span>${esc(s.name)}</button>`;
  });
  h += `<span class="squad-strip-actions"><button class="btn-secondary" ${canSave && !disabled ? '' : 'disabled'} onclick="${saveFn}">💾 Save squad</button>${manage ? '<button class="btn-ghost" onclick="LOBBY.mode=\'squads\';render()">Manage</button>' : ''}</span>`;
  if (SQ.flash && SQ.flashSide === side) h += `<div class="squad-flash">${esc(SQ.flash)}</div>`;
  return h + '</div>';
}
function sqAskName(side){ const d = sqDefaultName(side); if (typeof prompt != 'function') return d; try { return prompt('Name this squad:', d) } catch (e) { return d } }
// Local picker
function sqApplyLocal(t, id){ const s = sqList(t ? 'D' : 'L').find(x => x.id === id); if (!s) return; P[t] = sqIdx(s); render() }
function sqSaveLocal(t){
  const side = t ? 'D' : 'L'; if (squadCost(P[t]) !== SQUAD_SIZE) return;
  const nm = sqAskName(side); if (nm === null) return;
  const r = sqAdd(side, P[t], nm); sqFlash(side, r.msg);
}
// Online lobby
function lobbySquad(id){ if (LOBBY.ready || !NET) return; const s = sqList(NET.me ? 'D' : 'L').find(x => x.id === id); if (!s) return; LOBBY.picks = sqIdx(s); render() }
function lobbySaveSquad(){
  if (!NET || squadCost(LOBBY.picks) !== SQUAD_SIZE) return; const side = NET.me ? 'D' : 'L';
  const nm = sqAskName(side); if (nm === null) return;
  const r = sqAdd(side, LOBBY.picks, nm); sqFlash(side, r.msg);
}
// Squad manager (main menu > Saved Squads)
function sqSetSide(s){ SQ.side = s; SQ.picks = []; SQ.name = ''; SQ.editId = null; SQ.msg = ''; SQ.confirm = null; render() }
function sqPick(i){
  SQ.msg = ''; const a = SQ.picks, j = a.indexOf(i);
  if (j >= 0) a.splice(j, 1); else if (squadCost(a) + R[i].cost <= SQUAD_SIZE) a.push(i);
  render();
}
function sqClear(){ SQ.picks = []; SQ.name = ''; SQ.editId = null; SQ.msg = ''; render() }
function sqSaveBuilt(){
  const r = sqAdd(SQ.side, SQ.picks, SQ.name, SQ.editId); SQ.msg = r.msg; SQ.confirm = null;
  if (r.ok) { SQ.picks = []; SQ.name = ''; SQ.editId = null }
  render();
}
function sqEdit(id){ const s = sqList(SQ.side).find(x => x.id === id); if (!s) return; SQ.picks = sqIdx(s); SQ.name = s.name; SQ.editId = id; SQ.msg = 'Editing "' + s.name + '". Change the squad, then press Update squad.'; SQ.confirm = null; render(); window.scrollTo && window.scrollTo(0, 0) }
function sqDel(id){
  if (SQ.confirm !== id) { SQ.confirm = id; render(); return }
  sqRemove(id); SQ.confirm = null; if (SQ.editId === id) { SQ.picks = []; SQ.name = ''; SQ.editId = null }
  SQ.msg = 'Squad deleted.'; render();
}
function squadsScreen(){
  const side = SQ.side, sideName = side == 'D' ? 'Dark' : 'Light', saved = sqList(side);
  const factions = [...new Set(R.flatMap(r => r.t))].sort((a, b) => a.localeCompare(b));
  const matches = r => (!PICK_SEARCH || (r.n + ' ' + r.t.join(' ')).toLowerCase().includes(PICK_SEARCH.toLowerCase())) && (!PICK_FACTION || r.t.includes(PICK_FACTION));
  const full = squadCost(SQ.picks) === SQUAD_SIZE;
  let h = `<div class="selection-header"><button onclick="LOBBY.mode='menu';render()">← Back to menu</button><div><div class="panel-eyebrow">SAVED SQUADS</div><h2>Build and save squads</h2><p>Saved squads stay in this browser. When you start a local or online battle, load one in a click. Darth Bane counts as three.</p></div></div>
<div class="squad-tabs"><button class="${side == 'L' ? 'on L' : ''}" onclick="sqSetSide('L')">Light Side</button><button class="${side == 'D' ? 'on D' : ''}" onclick="sqSetSide('D')">Dark Side</button></div>
<div class="card squad-list"><div class="panel-eyebrow">YOUR ${sideName.toUpperCase()} SQUADS (${saved.length})</div>`;
  if (!saved.length) h += '<p class="squad-empty">No saved squads yet. Build one below.</p>';
  saved.forEach(s => {
    const idx = sqIdx(s);
    h += `<div class="squad-row${SQ.editId === s.id ? ' editing' : ''}"><div class="squad-info"><b>${esc(s.name)}</b><div class="sq-avs">${idx.map(i => `<span class="sq-av" title="${esc(R[i].n)}" style="background-image:${R[i].img ? `url('${R[i].img}')` : 'none'}"></span>`).join('')}</div><small>${esc(s.names.join(' · '))}</small></div><div class="squad-btns"><button onclick="sqEdit('${s.id}')">Edit</button><button class="${SQ.confirm === s.id ? 'btn-danger' : ''}" onclick="sqDel('${s.id}')">${SQ.confirm === s.id ? 'Click again to delete' : 'Delete'}</button></div></div>`;
  });
  h += `</div><div class="card squad-builder"><div class="panel-eyebrow">${SQ.editId ? 'EDIT SQUAD' : 'NEW SQUAD'} · ${sideName.toUpperCase()} SIDE</div>
<div class="squad-form"><input id="sqName" maxlength="28" aria-label="Squad name" placeholder="Squad name (optional)" value="${esc(SQ.name)}" oninput="SQ.name=this.value"><button class="btn-primary" ${full ? '' : 'disabled'} onclick="sqSaveBuilt()">${SQ.editId ? 'Update squad' : 'Save squad'} · ${squadCost(SQ.picks)}/4</button><button onclick="sqClear()">${SQ.editId ? 'Cancel edit' : 'Clear'}</button></div>`;
  if (SQ.msg) h += `<div class="squad-flash">${esc(SQ.msg)}</div>`;
  h += `<div class="squad-picked">${SQ.picks.map(i => `<span class="sq-chipmini" title="Click to remove" onclick="sqPick(${i})"><span class="sq-av" style="background-image:${R[i].img ? `url('${R[i].img}')` : 'none'}"></span>${esc(R[i].n.replace(/ \(.*/, ''))} ✕</span>`).join('') || '<span class="squad-empty">Pick characters below.</span>'}</div></div>
<div class="pick-toolbar"><label class="pick-search"><span aria-hidden="true">⌕</span><input aria-label="Search characters" placeholder="Search characters or traits…" value="${esc(PICK_SEARCH)}" oninput="setPickSearch(this.value)"></label><label class="pick-filter"><span>FACTION / TRAIT</span><select aria-label="Filter by faction or trait" onchange="setPickFaction(this.value)"><option value="">All factions and traits</option>${factions.map(f => `<option value="${esc(f)}" ${PICK_FACTION === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label><button class="btn-secondary" onclick="PICK_SEARCH='';PICK_FACTION='';render()">Clear filters</button></div>
<div class="pickgrid">`;
  const shown = R.map((r, i) => ({r, i})).filter(({r}) => r.s == side && matches(r));
  shown.forEach(({r, i}) => { h += cardHtml(r, i, SQ.picks.includes(i), `sqPick(${i})`) });
  if (!shown.length) h += '<div class="empty-picks">No characters match these filters.</div>';
  $('#app').innerHTML = h + '</div>';
}
