// Game rules, state management, abilities, and interface rendering.
let prng=Math.random;
function seedRng(s){let a=s>>>0;prng=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const $=s=>document.querySelector(s),shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(prng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a},rnd=n=>Math.floor(prng()*n),d6=()=>1+rnd(6),rl=n=>Array.from({length:Math.max(0,n)},d6),sum=a=>a.reduce((x,y)=>x+y,0);
let G=null,P=[[],[]];
let PICK_SEARCH='',PICK_FACTION='';
const k=(u,x)=>u.d.k.includes(x)&&!(u.st&&u.st.sever&&!/^[ae]_/.test(x)),has=(u,t)=>u.d.t.includes(t);
const live=t=>G.u.filter(u=>!u.dead&&(t==null||u.team==t));
const al=u=>live(u.team).filter(x=>x!=u),en=u=>live(1-u.team);
const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
const occ=(x,y)=>live().find(u=>u.x==x&&u.y==y);
const log=s=>{G.log.unshift(s);G.log.length=Math.min(G.log.length,60)};
const isLuke=u=>u.d.n.startsWith('Luke');
function aDice(a,d){let n=a.st.short?1:a.d.a;if(k(a,'bryar')&&dist(a,d)<=1)n++;if(d.st.seek&&has(a,'Inquisitorius'))n++;if(d.st.marked==a.team+1)n++;if(k(a,'rpur')&&d.stunR!=null&&G.round-d.stunR<=1)n++;if(k(a,'dark')&&a.hp<=4)n++;if(k(a,'fallen')&&!al(a).some(v=>dist(v,a)<=1))n++;if(a.fl)n++;if(k(a,'strike')&&a.hp<=4)n++;if(k(a,'hunt')&&has(d,'Jedi'))n++;
if(k(a,'mara')&&isLuke(d))n+=2;if(k(a,'vaapad')&&has(d,'Sith'))n++;if(k(a,'twin')&&d.st.stun)n+=2;if(a.st.hate)n++;if((k(a,'mara')||k(a,'agg'))&&a.sx!=null&&dist({x:a.sx,y:a.sy},d)>1)n++;if(k(a,'shii')&&dist(a,d)<=1&&adj(a).length>=2)n++;if(has(a,'Night')&&live(a.team).some(v=>v!=a&&k(v,'magick')&&dist(v,a)<=3))n++;if(k(a,'guile')&&isT(d))n++;if(a.st.disarm)n--;if(a.st.focus)n++;return Math.max(0,n)}
function dDice(d,a){if(d.st.shat)return 0;if(k(a,'vsight'))return Math.max(0,d.d.d-(d.st.conq?1:0)-(d.st.exp?1:0));let n=d.d.d;if(k(d,'soresu')&&en(d).some(v=>dist(d,v)<=1))n++;if(G.ben[d.team])n++;if(d.st.absorb||d.st.stance)n++;if(has(d,'Inquisitorius')&&al(d).some(v=>has(v,'Inquisitorius')&&dist(v,d)<=1&&(k(d,'syn')||k(v,'syn'))))n++;if(d.st.conq)n--;if(d.st.tact)n++;if((has(a,'Sith')||has(a,'Sith Empire'))&&live(a.team).some(v=>k(v,'corrupt')&&dist(v,d)<=1))n--;if(d.st.fort)n++;if(k(d,'fsight')&&dist(a,d)>1)n++;if(live(d.team).some(v=>v!=d&&k(v,'beacon')&&v.st.taunt&&dist(v,d)<=1))n++;n+=d.st.barrier||0;if(live(d.team).some(v=>v!=d&&k(v,'harmony')&&dist(v,d)<=1))n++;if(k(d,'size')&&a.hp>d.hp)n++;if(d.st.exp)n--;return Math.max(0,n)}
function heal(u,n){u.hp=Math.min(u.d.h,u.hp+n)}
const debuff=(t,key,v=1)=>{if(k(t,'immune')){log(`${t.d.n} is immune`);return}t.st[key]=v};
function stun(u){if(k(u,'immune')){log(`${u.d.n} is immune to Stun`);return}if(k(u,'e_iaj')&&!u.ep){u.ep=1;u.st.fort=1;log(`🛡 ${u.d.n}: I Am a Jedi! Stun negated`);return}u.st.stun=1;u.stunR=G.round;log(`💫 ${u.d.n} is Stunned`)}
function hurt(u,n){if(n<=0)return;u.hp-=n;if(u.hp>0)return;
if(k(u,'pain')&&!u.pu){u.pu=1;u.hp=4;u.st.taunt=1;log(`🔥 ${u.d.n}: Lord of Pain! Rises with 4 Health, taunting`);return}
if(k(u,'e_ben')&&!u.ep){u.ep=1;u.dead=1;G.ben[u.team]=1;log(`✨ ${u.d.n} becomes one with the Force! Allies gain +1d6 Defense`)}
else{u.dead=1;G.dead.push(u);log(`💀 ${u.d.n} is defeated`);live(1-u.team).forEach(v=>{if(k(v,'hunger')&&dist(v,u)<=2){heal(v,4);log(`${v.d.n} feeds on the void (+4 Health)`)}});if(k(u,'living')){const f=al(u).filter(v=>dist(u,v)<=4).sort((p,q)=>p.hp/p.d.h-q.hp/q.d.h)[0];if(f){heal(f,4);delete f.st.stun;log(`${f.d.n} is restored by the Living Force (+4, Stun removed)`)}}}
if(!live(u.team).length)G.win=1-u.team}
function att(a,d,o={}){let n=o.n??aDice(a,d);delete a.st.hate;let ar=o.ar||rl(n);if(!a.atkd&&(has(a,'Jedi')||has(a,'Old Republic'))&&live(a.team).some(v=>k(v,'medit')))ar=ar.map(x=>x+1);a.atkd=1;if(a.intim)ar=ar.map(x=>Math.max(0,x-1));
const as=sum(ar),six=ar.filter(x=>x==6).length;let nd=dDice(d,a);delete d.st.exp;
const noDef=k(a,'jar')&&six>=2;if(noDef)nd=0;const dr=rl(nd).map(x=>k(d,'corto')&&has(a,'Jedi')&&x<=2?6:(k(d,'formv')&&dist(a,d)<=1&&x==1?6:x)),ds=Math.max(0,sum(dr)-(k(a,'mak')&&en(a).filter(v=>dist(a,v)<=1).length==1?1:0)),dm=Math.max(0,as-ds);
log(`${a.d.n} [${ar.join(',')}]=${as} vs ${d.d.n} [${dr.join(',')}]=${ds}${noDef?" (Jar'Kai: no defense)":''} → ${dm} dmg`);
if(dm>0&&d.st.sm){a.st.marked=d.team+1;log(`${a.d.n} is marked: ${d.d.n}'s allies get +1d6 Attack against them this round`)}if(dm>0)live(d.team).forEach(v=>{if(v!=d&&k(v,'echo')&&dist(v,d)<=3)v.st.hate=1});if(dm>0&&(k(d,'hate')||k(d,'cathar')))d.st.hate=1;hurt(d,dm);if(d.dead&&k(a,'mara')&&isLuke(d)){heal(a,4);log('Mara recovers 4 Health')}
if(d.dead&&k(a,'siphon')){heal(a,5);log('Malak drains 5 Health')}if(dm>0&&!d.dead&&o.st)stun(d);if(k(d,'web')&&!a.dead&&al(d).some(v=>has(v,'Sith Triumvirate')&&dist(v,d)<=1)){debuff(a,'exp');log(`${a.d.n} is caught in Betrayal's Web: -1d6 Defense on the next attack against them`)}if(d.st.cd&&!a.dead){log(`${a.d.n} is struck back for 1`);hurt(a,1)}if(dm>=3&&!d.dead&&k(d,'endure')&&!d.st.taunt){d.st.taunt=1;log(`🎯 ${d.d.n}: Monstrous Endurance, now taunting`)}if(k(d,'stasis')&&dr.includes(6)&&!a.dead){log(`${d.d.n}: Stasis Slow!`);stun(a)}if(k(a,'brutal')&&dist(a,d)<=1&&!d.dead&&ar.includes(6)&&!d.st.stun){log('Brutal Sweep!');stun(d)}if(dm>0&&!d.dead&&!a.dead&&k(d,'e_counter')&&!d.ep&&!o.counter){d.ep=1;log(`⚔ ${d.d.n}: Snips' Counter!`);att(d,a,{n:4,counter:1})}return dm}
const near4=u=>en(u).filter(x=>dist(u,x)<=4),adj=u=>en(u).filter(x=>dist(u,x)<=1);
function adjFree(t,u){let b=null,bd=99;for(let dx=-1;dx<2;dx++)for(let dy=-1;dy<2;dy++){const x=t.x+dx,y=t.y+dy,o=occ(x,y);if((dx||dy)&&x>=0&&y>=0&&x<8&&y<8&&(!o||o==u)){const q=Math.max(Math.abs(x-u.x),Math.abs(y-u.y));if(q<bd){bd=q;b=[x,y]}}}return b}
function pushAway(u,t,n){if(k(t,'trophy')){log(`${t.d.n} resists the push`);return}const sx=Math.sign(t.x-u.x),sy=Math.sign(t.y-u.y);for(let i=0;i<n;i++){const x=t.x+sx,y=t.y+sy;if(x<0||y<0||x>7||y>7||occ(x,y))break;t.x=x;t.y=y}log(`${t.d.n} is pushed away`)}
const isT=x=>x.st.taunt||(k(x,'mass')&&adj(x).length>=2);const tf=(u,l)=>{if(k(u,'binary')||k(u,'trophy'))return l;const t=l.filter(isT);return t.length?t:l};
const AB={
a_doNot:{l:'Do or Do Not (ally within 4)',tg:u=>al(u).filter(x=>dist(u,x)<=4),go:(u,t)=>{delete t.st.stun;G.mv=t;G.mode='amove';G.reach=reach(t);return 1}},
a_gather:{l:'Gather Intelligence (range 4)',tg:near4,go:(u,t)=>{debuff(t,'exp');log(`${t.d.n} loses 1d6 Defense on the next attack against them`)}},
a_light:{l:'Force Lightning 3d6 (range 4)',atk:1,tg:near4,go:(u,t)=>{att(u,t,{n:3,st:1})}},
a_spin:{l:'Spinning Blade (adjacent)',atk:1,tg:u=>en(u).filter(x=>dist(u,x)<=1),go:(u,t)=>{G.sp={a:t};const adj=en(u).filter(x=>dist(u,x)<=1&&x!=t);
if(adj.length){G.mode='tg';G.tg=adj;G.go=t2=>{G.sp.b=t2;G.mode='split';render()}}else G.mode='split';return 1}},
e_unl:{l:'Epic: Unlimited Power 4d6 (all within 4)',atk:1,inst:1,ep:1,tg:near4,go:u=>{let ar=rl(4);if(u.intim)ar=ar.map(x=>Math.max(0,x-1));log(`${u.d.n} UNLIMITED POWER!`);near4(u).forEach(t=>att(u,t,{ar}))}},
e_shat:{l:'Epic: Shatterpoint (adjacent)',ep:1,tg:adj,go:(u,t)=>{debuff(t,'shat');log(`${t.d.n}: Defense is 0d6 this round`)}},
a_stance:{l:'Defensive Stance: Taunt + 1d6 Defense',inst:1,tg:u=>[u],go:u=>{u.st.taunt=1;u.st.stance=1;log(`🎯 ${u.d.n} taunts and braces (+1d6 Defense)`)}},
a_strike:{l:'Strike Me Down: Taunt',inst:1,tg:u=>[u],go:u=>{u.st.taunt=1;u.st.sm=1;log(`🎯 ${u.d.n} taunts: strike him down and his allies will answer`)}},
a_easy:{l:'All Too Easy: Taunt + 3d6 Attack (adjacent)',atk:1,tg:adj,go:(u,t)=>{u.st.taunt=1;log(`🎯 ${u.d.n} taunts`);att(u,t)}},
a_presence:{l:'Brutish Presence: Taunt + pull enemies in',inst:1,tg:u=>[u],go:u=>{u.st.taunt=1;const L=en(u).filter(t=>dist(u,t)<=2&&!adj(t).length);
L.forEach(t=>{const sx=Math.sign(u.x-t.x),sy=Math.sign(u.y-t.y);for(const[dx,dy]of[[sx,sy],[sx,0],[0,sy]]){const x=t.x+dx,y=t.y+dy;if((dx||dy)&&x>=0&&y>=0&&x<8&&y<8&&!occ(x,y)){t.x=x;t.y=y;break}}});log(`🎯 ${u.d.n} taunts and pulls in ${L.length} enemies`)}},
a_ataru:{l:'Ataru Strike (adjacent)',atk:1,tg:adj,go:(u,t)=>{const dm=att(u,t);if(dm>0&&G.win==null){G.mv=u;G.mode='amove';G.reach=reach(u,1,1);return 1}}},
e_rage:{l:'Epic: Tempered Rage (2 attacks)',atk:1,ep:1,tg:adj,go:u=>{}},
e_66:{l:'Epic: Execute Order 66 (range 4)',ep:1,tg:u=>near4(u).filter(t=>!k(t,'binary')&&al(t).some(v=>dist(t,v)<=1)),go:(u,t)=>{G.mode='tg';G.tg=tf(t,al(t).filter(v=>dist(t,v)<=1));G.go=v=>{log(`${t.d.n} is forced to attack ${v.d.n}!`);att(t,v,{n:t.d.a});finish()};return 1}},
a_push:{l:'Force Push (adjacent)',tg:adj,go:(u,t)=>{hurt(t,1);if(t.dead)return;pushAway(u,t,2)}},
a_pursuit:{l:'Relentless Pursuit (range 4)',tg:u=>near4(u).filter(t=>adjFree(t,u)),go:(u,t)=>{const c=adjFree(t,u);u.x=c[0];u.y=c[1];stun(t)}},
a_hitrun:{l:'Hit and Run (adjacent)',atk:1,tg:adj,go:(u,t)=>{att(u,t);if(!u.dead&&G.win==null){G.mv=u;G.mode='amove';G.reach=reach(u,2,1);return 1}}},
a_absorb:{l:'Force Absorb',inst:1,tg:u=>[u],go:u=>{delete u.st.stun;u.st.absorb=1;log(`${u.d.n} absorbs: Stun removed, +1d6 Defense until his next turn`)}},
a_seeker:{l:'ID9 Seeker Droid (range 4)',tg:near4,go:(u,t)=>{stun(t);debuff(t,'seek');log(`Inquisitorius allies get +1d6 Attack vs ${t.d.n} this round`)}},
a_hybrid:{l:'Blaster Hybrid Strike (range 2)',atk:1,tg:u=>en(u).filter(x=>dist(u,x)<=2),go:(u,t)=>{att(u,t,{st:1})}},
a_beacon:{l:'Protective Beacon: Taunt',inst:1,tg:u=>[u],go:u=>{u.st.taunt=1;log(`🎯 ${u.d.n} taunts; adjacent allies gain +1d6 Defense`)}},
e_flurry:{l:'Epic: Split Saber Flurry (2 attacks, +1d6)',atk:1,ep:1,tg:adj,go:u=>{}},
e_barrier:{l:'Epic: Force Barrier (ally within 4)',ep:1,tg:u=>al(u).filter(v=>dist(u,v)<=4),go:(u,t)=>{[u,t].forEach(v=>{v.st.barrier=2;v.bfrom=u.id});log(`${u.d.n} and ${t.d.n} gain +2d6 Defense until Cere's next turn`)}},
a_dash:{l:'Spinning Dash (unengaged, range 2)',atk:1,tg:u=>en(u).filter(t=>dist(u,t)<=2&&!adj(t).length&&adjFree(t,u)),go:(u,t)=>{const c=adjFree(t,u);u.x=c[0];u.y=c[1];att(u,t)}},
a_slam:{l:'Force Slam (adjacent)',tg:adj,go:(u,t)=>{hurt(t,2);if(t.dead)return;stun(t);pushAway(u,t,1)}},
a_blade:{l:'Blade Throw 3d6 (range 2)',atk:1,tg:u=>en(u).filter(x=>dist(u,x)<=2),go:(u,t)=>{att(u,t)}},
a_smash:{l:'Sith Sorcery Smash 4d6 (adjacent)',atk:1,tg:adj,go:(u,t)=>{const dm=att(u,t,{n:aDice(u,t)+1});if(dm>=3&&!t.dead)stun(t)}},
a_pushstun:{l:'Force Push: 1 dmg, push, Stun (adjacent)',tg:adj,go:(u,t)=>{hurt(t,1);if(t.dead)return;pushAway(u,t,2);stun(t)}},
a_whirl:{l:'Dual-Saber Whirlwind (adjacent)',atk:1,tg:adj,go:(u,t)=>{const rest=adj(u).filter(x=>x!=t);const fin=t2=>{const ar=rl(aDice(u,t));log(`${u.d.n} whirls!`);att(u,t,{ar});if(t2&&!t2.dead)att(u,t2,{ar:[...ar]});finish()};
if(rest.length){G.mode='tg';G.tg=rest;G.go=fin}else fin();return 1}},
a_dcounter:{l:'Defensive Counter: Taunt',inst:1,tg:u=>[u],go:u=>{u.st.taunt=1;u.st.cd=1;log(`🎯 ${u.d.n} taunts; attackers take 1 unblockable damage`)}},
a_cleanse:{l:'Force Cleanse (adjacent ally)',tg:u=>al(u).filter(v=>dist(u,v)<=1),go:(u,t)=>{delete t.st.stun;delete t.st.taunt;delete t.st.sm;delete t.st.cd;heal(t,3);log(`${t.d.n} is cleansed: Stun and Taunt removed, +3 Health`)}},
a_charge:{l:'Brutal Charge 4d6 (range 2)',atk:1,tg:u=>en(u).filter(t=>dist(u,t)<=2&&adjFree(t,u)),go:(u,t)=>{const c=adjFree(t,u);u.x=c[0];u.y=c[1];att(u,t,{n:aDice(u,t)+1})}},
a_ichor:{l:'Ichor Blast 3d6 (range 3)',atk:1,tg:u=>en(u).filter(x=>dist(u,x)<=3),go:(u,t)=>{att(u,t,{st:1})}},
a_disarm:{l:'Saber Disarm (adjacent)',atk:1,tg:adj,go:(u,t)=>{const dm=att(u,t);if(dm>0&&!t.dead)debuff(t,'disarm')}},
a_quad:{l:'Four-Blade Quad Strike (adjacent)',atk:1,tg:adj,go:(u,t)=>{G.qt=t;G.mode='quad';return 1}},
a_link:{l:'Healing Link (adjacent ally)',tg:u=>al(u).filter(v=>dist(u,v)<=1),go:(u,t)=>{const m=Math.max(0,Math.min(3,u.hp-1,t.d.h-t.hp));u.hp-=m;t.hp+=m;delete t.st.stun;log(`${u.d.n} gives ${m} Health to ${t.d.n}, who loses Stun`)}},
a_focus:{l:'Battle Focus (ally within 4)',tg:u=>al(u).filter(v=>dist(u,v)<=4),go:(u,t)=>{delete t.st.stun;delete t.st.taunt;delete t.st.sm;delete t.st.cd;t.st.focus=1;log(`${t.d.n} is focused: Stun and Taunt removed, +1d6 Attack`)}},
e_sever:{l:'Epic: Sever Force (adjacent)',ep:1,tg:adj,go:(u,t)=>{debuff(t,'sever');log(`${t.d.n} is cut off from the Force this round`)}},
e_saberstorm:{l:'Epic: Telekinetic Saber Storm (up to 3, range 2)',atk:1,ep:1,tg:u=>en(u).filter(x=>dist(u,x)<=2),go:(u,t)=>{G.sq=[t];const r=()=>en(u).filter(x=>dist(u,x)<=2&&!G.sq.includes(x));
if(r().length){G.mode='tg';G.tg=r();G.go=t2=>{G.sq.push(t2);if(G.sq.length<3&&r().length){G.tg=r();render()}else resolveStorm()}}else resolveStorm();return 1}},
a_drain:{l:'Drain Life (adjacent)',tg:adj,go:(u,t)=>{hurt(t,2);if(!t.dead)stun(t);heal(u,2);log(`${u.d.n} drains life (+2 Health)`)}},
a_hatred:{l:'Relentless Hatred: Taunt + 3d6 Attack (adjacent)',atk:1,tg:adj,go:(u,t)=>{u.st.taunt=1;log(`🎯 ${u.d.n} taunts`);att(u,t)}},
a_blow:{l:'Crushing Blow 4d6 (adjacent)',atk:1,tg:adj,go:(u,t)=>{const dm=att(u,t,{n:aDice(u,t)+1});if(dm>=2&&!t.dead)stun(t)}},
e_precog:{l:'Epic: Battle Precognition (range 4)',ep:1,tg:near4,go:(u,t)=>{debuff(t,'nopatk');log(`${t.d.n} cannot Attack this round`)}},
a_fheal:{l:'Force Heal (adjacent ally)',tg:u=>al(u).filter(v=>dist(u,v)<=1),go:(u,t)=>{heal(t,3);delete t.st.stun;log(`${t.d.n} recovers 3 Health and loses Stun`)}},
a_stealth:{l:'Force Stealth Strike (unengaged, range 4)',atk:1,tg:u=>near4(u).filter(t=>!adj(t).length&&adjFree(t,u)),go:(u,t)=>{const c=adjFree(t,u);u.x=c[0];u.y=c[1];att(u,t,{n:4+(u.st.hate?1:0)})}},
e_storm:{l:'Epic: Force Storm',ep:1,inst:1,tg:u=>en(u).filter(t=>dist(u,t)<=1||al(u).some(v=>dist(v,t)<=1)),go:u=>{const L=AB.e_storm.tg(u);log(`${u.d.n} unleashes Force Storm!`);L.forEach(t=>{hurt(t,3);if(!t.dead)stun(t)})}},
a_grip:{l:'Crushing Grip (adjacent)',tg:adj,go:(u,t)=>{hurt(t,2);if(t.dead){heal(u,5);log('Malak drains 5 Health')}else stun(t)}},
a_insanity:{l:'Force Insanity (range 4)',tg:near4,go:(u,t)=>{const eng=adj(t).length>0;stun(t);if(eng)hurt(t,2)}},
e_short:{l:'Epic: Cortosis Short-Circuit (adjacent)',ep:1,tg:adj,go:(u,t)=>{debuff(t,'short',2);stun(t)}}};
AB.a_sweep={...AB.a_spin,l:'Saberstaff Sweep (adjacent)'};
function resolveSplit(x){const s=G.sel,t1=G.sp.a,t2=G.sp.b,n=s.d.a,b=t=>k(s,'hunt')&&has(t,'Jedi')?1:0;
if(x>0)att(s,t1,{n:x+b(t1)});if(t2&&n-x>0&&!t2.dead)att(s,t2,{n:n-x+b(t2)});finish()}
function resolveStorm(){const s=G.sel;log(`${s.d.n} unleashes the Saber Storm!`);G.sq.forEach(t=>{if(!t.dead)att(s,t,{n:2})});G.sq=null;finish()}
function resolveQuad(id){const s=G.sel,t=G.qt,x=id&&G.u.find(v=>v.id==id),b=q=>aDice(s,q)-s.d.a;
if(!x)att(s,t,{n:5+b(t)});else{const ar=rl(3+Math.max(b(t),b(x)));log(`${s.d.n} strikes with all four blades!`);att(s,t,{ar});if(!x.dead)att(s,x,{ar:[...ar]})}finish()}
function start(){G={u:[],dead:[],log:[],turn:0,round:1,sel:null,mode:null,win:null,ben:[0,0]};let id=0;
const cells=t=>{const a=[];for(let y of t?[0,1]:[6,7])for(let x=0;x<8;x++)a.push([x,y]);return shuf(a)};
const fr=[cells(0),cells(1)];[0,1].forEach(t=>P[t].forEach(i=>{const d=R[i],c=fr[t].pop();G.u.push({d,team:t,x:c[0],y:c[1],hp:d.h,st:{},used:0,ep:0,id:id++})}));
G.turn=rnd(2);render()}
function reach(u,st=4,ign){const s=new Set([u.x+','+u.y]);let f=[[u.x,u.y]];for(let i=0;i<(!ign&&en(u).some(v=>dist(u,v)<=1)?0:st);i++){const n=[];for(const[x,y]of f)for(let dx=-1;dx<2;dx++)for(let dy=-1;dy<2;dy++){const X=x+dx,Y=y+dy,q=X+','+Y;if(X<0||Y<0||X>7||Y>7||s.has(q)||occ(X,Y))continue;s.add(q);n.push([X,Y])}f=n}return s}
const avail=t=>live(t).some(u=>!u.used&&!u.st.stun);
function nextTurn(){const o=1-G.turn;if(avail(o))G.turn=o;else if(!avail(G.turn)){G.round++;log(`— Round ${G.round} —`);
live().forEach(u=>{u.used=u.st.stun&&u.used?1:0;delete u.st.stun;delete u.st.exp;delete u.st.fort;delete u.st.shat;delete u.st.hate;delete u.st.tact;delete u.st.seek;delete u.st.marked;delete u.st.disarm;delete u.st.sever;delete u.st.focus;delete u.st.nopatk;delete u.st.conq;u.atkd=0;u.rgu=0;if(u.st.short&&--u.st.short<=0)delete u.st.short});G.turn=o;if(!avail(o))G.turn=1-o}}
function finish(){const s=G.sel;if(s){s.used=1;s.intim=0;s.sx=null;s.extra=0;s.fl=0;delete s.st.focus;live().forEach(v=>delete v.st.conq)}G.sel=null;G.mode=null;G.sp=null;if(!G.win)nextTurn();render()}
function cell(x,y){if(G.win)return;const u=occ(x,y),s=G.sel;
if(G.mode=='move'){if(G.reach.has(x+','+y)){if(k(s,'rgm')&&s.eng0&&(x!=s.x||y!=s.y))s.rgu=1;s.x=x;s.y=y;G.mode='act';if(k(s,'conq'))adj(s).forEach(v=>{if(dist({x:s.sx,y:s.sy},v)>1)debuff(v,'conq')})}render();return}
if(G.mode=='amove'){if(G.reach.has(x+','+y)&&!(u&&u!=G.mv)){G.mv.x=x;G.mv.y=y;finish()}return}
if(G.mode=='tg'){if(u&&G.tg.includes(u))G.go(u);return}
if(G.mode=='act'||G.mode=='split')return;
G.insp=u||null;if(u&&u.team==G.turn&&!u.used&&!u.st.stun){G.sel=u;u.eng0=en(u).some(v=>dist(u,v)<=1);G.u.forEach(v=>{if(v.bfrom==u.id){delete v.st.barrier;delete v.bfrom}});delete u.st.absorb;delete u.st.taunt;delete u.st.stance;delete u.st.sm;delete u.st.cd;G.mode='move';G.reach=reach(u,4,k(u,'rgm')&&!u.rgu);if(G.reach.size==1){G.mode='act';if(en(u).some(v=>dist(u,v)<=1))log(`${u.d.n} is engaged and can't move`)}u.n=0;u.sx=u.x;u.sy=u.y;
if(live(u.team).some(v=>k(v,'tact')&&v!=u&&dist(v,u)<=1))u.st.tact=1;u.intim=live().some(v=>k(v,'intim')&&v!=u&&dist(v,u)<=1);if(u.intim)log(`${u.d.n} is intimidated: -1 per Attack die this turn`)}render()}
function doAtk(){const s=G.sel;G.mode='tg';G.tg=tf(s,en(s).filter(x=>dist(s,x)<=(k(s,'bryar')?3:1)));G.go=t=>{s.n=(s.n||0)+1;att(s,t);if(G.win!=null)return render();if(k(s,'vault')&&dist(s,t)<=1&&!s.dead){G.mv=s;G.mode='amove';G.reach=reach(s,1,1);return render()}if(s.extra&&s.n<2&&adj(s).length)doAtk();else finish()};render()}
function doAb(key){const s=G.sel,a=AB[key];if(a.ep)s.ep=1;if(key=='e_rage'||key=='e_flurry'){s.extra=1;if(key=='e_flurry')s.fl=1;return doAtk()}if(!a.tg||a.inst){a.go(s);return finish()}
G.mode='tg';G.tg=a.atk?tf(s,a.tg(s)):a.tg(s);G.go=t=>{log(`${s.d.n}: ${a.l.split(' (')[0]} → ${t.d.n}`);if(a.go(s,t)!==1)finish();else render()};render()}
const stTxt=u=>[u.st.stun&&'Stunned',u.st.exp&&'Exposed (-1d6 Def)',u.st.absorb&&'+1d6 Def (Absorb)',isT(u)&&'🎯 Taunt',u.st.barrier&&'+2d6 Def (Barrier)',u.st.stance&&'+1d6 Def (Stance)',u.st.cd&&'Counter: 1 dmg to attackers',u.st.sever&&'Severed (no passives or abilities)',u.st.focus&&'+1d6 Attack (Focus)',u.st.disarm&&'-1d6 Attack (Disarm)',u.st.marked&&'Marked (+1d6 Attack for foes)',u.st.seek&&'Marked by ID9',u.st.shat&&'Shattered (0d6 Def)',u.st.nopatk&&'Cannot Attack',u.st.short&&'Base Attack 1d6',u.st.tact&&'+1d6 Def (Revan)',u.st.fort&&'+1d6 Def (round)',G.ben[u.team]&&'+1d6 Def (Ben)',u.ep&&'Epic used'].filter(Boolean).join(' · ');
function parseAbs(r){const out=[],re=/(Passive|Action|Epic) ([^:]+): ([\s\S]*?)(?=\s(?:Passive|Action|Epic) [^:]+: |$)/g;let m;
while((m=re.exec(r.x)))out.push({type:m[1],name:m[2].trim(),desc:m[3].trim()});
const ak=r.k.filter(q=>/^a_/.test(q)),ek=r.k.filter(q=>/^e_/.test(q));let ai=0,ei=0;
out.forEach(a=>{if(a.type=='Action')a.key=ak[ai++];else if(a.type=='Epic')a.key=ek[ei++]});r.abs=out}
R.forEach(parseAbs);
let TIPS=[];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'),slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const iconSrc=n=>(typeof ICON_DATA!=='undefined'&&ICON_DATA[n])||'icons/'+encodeURIComponent(n)+'.png';
const CATICON={multi:'doubleorextraattack',taunt:'taunt',stun:'stun',heal:'healing',atkup:'+1d6',atkdown:'-1d6',defup:'+1d6def',defdown:'-1d6def',move:'movement',o66:'order66'};
const sideIc=r=>r.s=='D'?'darkside':'lightside';
function abIcon(r,a){const c=ABICON[r.n+'|'+a.name];return c=='attack'?'attack-'+sideIc(r):(CATICON[c]||sideIc(r))}
function abBtn(o){const ti=TIPS.push(`<b>${esc(o.name)}</b> <i>${o.type}</i><br>${esc(o.desc.charAt(0).toUpperCase()+o.desc.slice(1))}${o.note?`<br><span class="nt">${esc(o.note)}</span>`:''}`)-1;
const gl=o.name.split(/[ \-']+/).filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
return `<button type="button" class="ab ${o.cls}${o.on?' on':''}${o.used?' used':''}" data-ti="${ti}"${o.preview?` data-preview="${o.preview}"`:''}${o.on?` onclick="${o.click}"`:''}><span class="gl">${gl}</span><img src="${iconSrc(o.icon)}" alt="" onerror="this.remove()"></button>`}
function homeBar(r){const rng=r.k.includes('bryar')?3:1;let h='<div class="abbar home" onclick="event.stopPropagation()">';
h+=abBtn({name:'Attack',type:'Basic Attack',desc:`Roll ${r.a}d6 against an enemy ${rng>1?'up to 3 spaces away':'adjacent to you'}. The difference between the dice totals is damage.`,cls:'atk',icon:'attack-'+sideIc(r)});
r.abs.forEach(a=>{const clk=a.key&&AB[a.key],epic=a.type=='Epic';h+=abBtn({name:a.name,type:a.type=='Passive'?'Passive':(epic?(clk?'Epic Action (once per game)':'Epic Action (automatic)'):(clk?'Action':'Automatic')),desc:a.desc,cls:a.type=='Passive'||!clk?'pas':(epic?'epic':'act'),icon:abIcon(r,a)})});return h+'</div>'}
function abBar(u,live){const sil=en(u).some(v=>k(v,'manip')&&dist(v,u)<=1);let h='<div class="abbar">';
const notLive=G.mode=='move'?'Finish moving first (click a green square, or your own square to stay).':'Select a unit of the side whose turn it is to use this.';
const rng=k(u,'bryar')?3:1,can=en(u).some(x=>dist(u,x)<=rng)&&!u.n&&!u.st.nopatk&&!fxDis(u);
h+=abBtn({name:'Attack',type:'Basic Attack',desc:`Roll ${u.d.a}d6 against an enemy ${rng>1?'up to 3 spaces away':'adjacent to you'}. The difference between the dice totals is damage.`,cls:'atk',icon:'attack-'+sideIc(u.d),preview:'attack',on:live&&can,click:'doAtk()',note:live?(u.st.nopatk?'Cannot Attack this round.':u.n?'Already attacked.':can?'':'No enemy in range.'):notLive});
u.d.abs.forEach(a=>{const AB1=a.key&&AB[a.key];
if(!AB1){const sev=a.type=='Passive'&&u.st.sever;h+=abBtn({name:a.name,type:a.type=='Passive'?'Passive':(a.type=='Epic'?'Epic Action (automatic)':'Automatic'),desc:a.desc,cls:'pas',icon:abIcon(u.d,a),note:sev?'Severed: inactive this round.':(a.type=='Passive'?'':'Triggers automatically.'),used:a.type=='Epic'&&u.ep});return}
const epic=a.type=='Epic';let why='';
if(!live)why=notLive;else if(epic&&u.ep)why='Already used this game.';else if(u.st.sever)why='Severed this round.';else if(u.st.nopatk&&AB1.atk)why='Cannot Attack this round.';else if(sil)why='Master Manipulator: you can only Attack.';else if(!AB1.tg(u).length)why='No valid target in range.';
h+=abBtn({name:a.name,type:epic?'Epic Action (once per game)':'Action',desc:a.desc,cls:epic?'epic':'act',icon:abIcon(u.d,a),preview:a.key,on:live&&!why,click:`doAb('${a.key}')`,note:why,used:epic&&u.ep})});
return h+'</div>'}
const fxDis=u=>k(u,'dis');
const info=u=>`<div class="card"><b>${u.d.n}</b> (${u.d.t.join(', ')})<br>HP ${u.hp}/${u.d.h} · Attack ${u.d.a}d6 · Defense ${u.d.d}d6<br><i>${stTxt(u)}</i></div>`;
const pk=(t,i)=>{const a=P[t],j=a.indexOf(i);if(j>=0)a.splice(j,1);else if(a.length<4)a.push(i);render()};
const rand=()=>{[0,1].forEach(t=>{P[t]=shuf(R.map((r,i)=>i).filter(i=>R[i].s==(t?'D':'L'))).slice(0,4)});render()};
function setPickSearch(v){PICK_SEARCH=v;const el=document.activeElement,pos=el&&typeof el.selectionStart==='number'?el.selectionStart:v.length;if(typeof NET!=='undefined'&&NET&&LOBBY.phase==='pick')render();else selectScreen();const next=document.querySelector('.pick-search input');if(next){next.focus();try{next.setSelectionRange(pos,pos)}catch(_){}}}
function setPickFaction(v){PICK_FACTION=v;if(typeof NET!=='undefined'&&NET&&LOBBY.phase==='pick')render();else selectScreen()}
function selectScreen(){
const factions=[...new Set(R.flatMap(r=>r.t))].sort((a,b)=>a.localeCompare(b));
const matches=r=>(!PICK_SEARCH||(r.n+' '+r.t.join(' ')).toLowerCase().includes(PICK_SEARCH.toLowerCase()))&&(!PICK_FACTION||r.t.includes(PICK_FACTION));
let h=`<div class="selection-header"><button onclick="LOBBY.mode='menu';render()">← Back to menu</button><div><div class="panel-eyebrow">BUILD YOUR SQUAD</div><h2>Choose your champions</h2><p>Pick four characters for each side. Click a selected character again to remove them.</p></div></div>
<div class="pick-toolbar"><label class="pick-search"><span aria-hidden="true">⌕</span><input aria-label="Search characters" placeholder="Search characters or traits…" value="${esc(PICK_SEARCH)}" oninput="setPickSearch(this.value)"></label><label class="pick-filter"><span>FACTION / TRAIT</span><select aria-label="Filter by faction or trait" onchange="setPickFaction(this.value)"><option value="">All factions and traits</option>${factions.map(f=>`<option value="${esc(f)}" ${PICK_FACTION===f?'selected':''}>${esc(f)}</option>`).join('')}</select></label><button class="btn-secondary" onclick="PICK_SEARCH='';PICK_FACTION='';selectScreen()">Clear filters</button></div>
<div class="selection-actions"><button onclick="rand()">🎲 Random teams</button><button class="btn-primary" ${P[0].length==4&&P[1].length==4?'':'disabled'} onclick="start()">Start battle · ${P[0].length+P[1].length}/8</button></div><div class="row pick-sides">`;
[0,1].forEach(t=>{const filtered=R.map((r,i)=>({r,i})).filter(({r})=>r.s==(t?'D':'L')&&matches(r));h+=`<div class="col"><div class="bar ${t?'D':'L'}">${t?'Dark':'Light'} Side <span class="side-count">${P[t].length}/4 selected</span></div><div class="pickgrid">`+filtered.map(({r,i})=>{const chosen=P[t].includes(i);return `<div class="card pick-card ${chosen?'picked':''}" role="button" tabindex="0" aria-pressed="${chosen}" onclick="pk(${t},${i})" onkeydown="if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();pk(${t},${i})}"><div class="pick-card-top"><div class="pick-portrait" style="border-color:var(--${r.s});background-image:${r.img?`url('${r.img}')`:'none'}"></div><div class="pick-details"><b>${esc(r.n)}</b><div class="pick-stats">♥ ${r.h} HP · ⚔ ${r.a}d6 · 🛡 ${r.d}d6</div><small>${r.t.map(esc).join(' · ')}</small></div><span class="pick-check" aria-hidden="true">${chosen?'✓':'+'}</span></div><div class="pick-tags">${r.t.slice(0,3).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>${homeBar(r)}${chosen?'<div class="selected-caption">SELECTED · CLICK TO REMOVE</div>':''}</div>`}).join('')+(filtered.length?'':'<div class="empty-picks">No characters match these filters.</div>')+'</div></div>'});h+='</div>';$('#app').innerHTML=h}

function render(){let h='';TIPS=[];if(typeof document.getElementById=='function'){const t=document.getElementById('tip');if(t)t.style.display='none'}
if(!G){prng=Math.random;if(LOBBY.mode=='local')selectScreen();else lobbyScreen();return}
const s=G.sel;
h+=G.win!=null?`<div class="bar ${G.win?'D':'L'}">🏆 ${G.win?'Dark':'Light'} Side wins! <button onclick="endGame()">${NET?'Rematch':'New game'}</button></div>`:`<div class="bar ${G.turn?'D':'L'}">${G.turn?'Dark':'Light'} Side's turn · Round ${G.round}${G.mode=='move'?' — click a green square to move (or your own square to stay)':G.mode=='tg'?' — click a red target':G.mode=='amove'?' — move your ally (green)':G.mode=='split'?' — split your Attack dice':s?' — choose an action':' — select one of your units'}</div>`;
h+=onlineBar();h+='<div class="row"><div class="col"><div class="board">';
for(let y=0;y<8;y++)for(let x=0;x<8;x++){const u=occ(x,y);let c='c';
if(u)c+=` U ${u.d.s} ${u.used||u.st.stun?'used':''}`;if((G.mode=='move'||G.mode=='amove')&&G.reach.has(x+','+y))c+=' m';if(G.mode=='tg'&&u&&G.tg.includes(u))c+=' a';if(u&&u==s)c+=' s';
h+=`<button class="${c}" data-x="${x}" data-y="${y}" ${u&&u.d.img?`style="background-image:url('${u.d.img}')"`:''} onclick="cell(${x},${y})">${u?`${u.d.n.replace(/ \(.*/,'')}<small>♥${u.hp}${u.st.stun?' 💫':''}${isT(u)?' 🎯':''}</small>`:''}</button>`}
h+='</div></div><div class="col">';
if(s&&!G.win){h+=info(s)+abBar(s,G.mode=='act'&&mine())+'<div class="bt">';
if(!mine()){}
else if(G.mode=='act'){h+='<button onclick="finish()">End activation</button>'}
else if(G.mode=='move')h+='<button onclick="deselect()">Deselect</button>';
else if(G.mode=='split'){const n=s.d.a,two=G.sp.b;h+=`Split dice vs ${G.sp.a.d.n}${two?' / '+two.d.n:''}:<br>`;for(let x=two?0:n;x<=n;x++)h+=`<button onclick="resolveSplit(${x})">${x} | ${n-x}</button>`}
else if(G.mode=='tg'&&G.sq){h+=`Saber Storm: click up to 3 targets (${G.sq.length} chosen)<br><button onclick="resolveStorm()">Strike now</button>`}
else if(G.mode=='quad'){h+=`Quad Strike on ${G.qt.d.n}:<br><button onclick="resolveQuad(0)">Single 5d6 attack</button>`;adj(s).filter(x=>x!=G.qt).forEach(x=>{h+=`<button onclick="resolveQuad(${x.id})">3d6 vs both + ${x.d.n}</button>`})}
else if(G.mode=='amove')h+='<button onclick="finish()">Skip move</button>';
else h+='<button onclick="back()">Back</button>';h+='</div>'}
else if(G.insp&&!G.insp.dead)h+=info(G.insp)+abBar(G.insp,false);
h+=`<div class="log">${G.log.join('<br>')}</div></div></div>`;$('#app').innerHTML=h}
if(typeof document.addEventListener=='function'){const tip=document.createElement('div');tip.id='tip';document.body.appendChild(tip);
const place=(x,y)=>{const w=tip.offsetWidth,h=tip.offsetHeight;let l=x+14,t=y+14;if(l+w>innerWidth-8)l=Math.max(8,innerWidth-w-8);if(t+h>innerHeight-8)t=Math.max(8,y-h-10);tip.style.left=l+'px';tip.style.top=t+'px'};
const clearRangePreview=()=>document.querySelectorAll('.board .range-target').forEach(n=>n.classList.remove('range-target'));
const showRangePreview=btn=>{clearRangePreview();if(!G||!G.sel||G.mode!=='act'||!btn||!btn.dataset.preview)return;const u=G.sel,key=btn.dataset.preview;let targets=[];if(key==='attack'){const r=k(u,'bryar')?3:1;targets=en(u).filter(v=>dist(u,v)<=r)}else if(AB[key]&&typeof AB[key].tg==='function'){try{targets=AB[key].tg(u)||[]}catch(_){targets=[]}}targets.forEach(v=>{const c=document.querySelector(`.board [data-x="${v.x}"][data-y="${v.y}"]`);if(c)c.classList.add('range-target')})};
document.addEventListener('mouseover',e=>{const b=e.target.closest&&e.target.closest('.ab[data-preview]');if(b)showRangePreview(b)});
document.addEventListener('mouseout',e=>{const b=e.target.closest&&e.target.closest('.ab[data-preview]');if(b&&!(e.relatedTarget&&b.contains(e.relatedTarget)))clearRangePreview()});
document.addEventListener('focusin',e=>{const b=e.target.closest&&e.target.closest('.ab[data-preview]');if(b)showRangePreview(b)});
document.addEventListener('focusout',e=>{if(e.target.closest&&e.target.closest('.ab[data-preview]'))clearRangePreview()});
const at=e=>e.target.closest&&e.target.closest('[data-ti]');
document.addEventListener('mouseover',e=>{const t=at(e);if(!t){tip.style.display='none';return}tip.innerHTML=TIPS[t.dataset.ti]||'';tip.style.display='block';place(e.clientX,e.clientY)});
document.addEventListener('mousemove',e=>{if(tip.style.display=='block'&&at(e))place(e.clientX,e.clientY)});
document.addEventListener('click',e=>{const t=at(e);if(t&&matchMedia('(hover:none)').matches){tip.innerHTML=TIPS[t.dataset.ti]||'';tip.style.display='block';const r=t.getBoundingClientRect();place(r.left,r.bottom)}else if(!t)tip.style.display='none'})}
function deselect(){G.sel=null;G.mode=null;render()}
function back(){G.mode='act';render()}
function endGame(){if(NET){if(NET.role=='host')doRematch();else netSend({t:'again'})}else{G=null;render()}}
if(typeof netInit=='function')netInit();
render();
