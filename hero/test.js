/* Headless test for COCCO HERO (accelerometer Z-axis rescue flight).
   Stubs DOM/Canvas/Audio, drives the simulation via window.__hero, asserts
   cage rescue (+5s, chick trail, slow-mo), iron cage needs rocket dash,
   dash energy cost, black-cocco guard/swoop smash vs damage, thunder cloud
   hits, emoji item pickups (⭐💎❤️⏰🛡️🔋🧲🌈), combo→fever trigger,
   time-limit & HP game-over paths, best persistence, and the
   76.6% / 23.4% difficulty mix.  Run: node hero/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function ctxStub(){const g={addColorStop(){}};return new Proxy({},{get(t,p){
  if(/createLinear|createRadial/.test(p))return()=>g; return ()=>{};}});}
const els={};
function el(id){ if(els[id])return els[id]; const e={id,style:{},textContent:'',_cls:new Set(),
  classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},contains(c){return e._cls.has(c);}},
  addEventListener(){}, getContext:()=>ctxStub(), width:0, height:0};
  els[id]=e; return e; }
function audioNode(extra){const n={connect(){return n;},start(){},stop(){},
  gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},
  frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
  delayTime:{value:0},type:'',buffer:null,...extra};return n;}
global.window={innerWidth:430,innerHeight:880,devicePixelRatio:2,
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},suspend(){},
    createGain:()=>audioNode(),
    createOscillator:()=>audioNode(),
    createDelay:()=>audioNode(),
    createBiquadFilter:()=>audioNode(),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>audioNode()};}};
global.AudioContext=global.window.AudioContext;
global.CanvasRenderingContext2D=function(){};
global.innerWidth=430; global.innerHeight=880; global.devicePixelRatio=2;
global.addEventListener=()=>{};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);}};
global.document={getElementById:el,addEventListener(){},hidden:false,
  createElement:()=>({width:0,height:0,getContext:()=>ctxStub()})};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
global.getComputedStyle=()=>({getPropertyValue:()=>''});

var tNow=0;
let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const G=window.__hero; if(!G){ console.error('hook missing'); process.exit(1); }
const {DASH_COST,ENERGY_MAX}=G.consts;

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
function S(){ return G.get(); }
function killEnts(){ for(const e of G.ents) e.alive=false; }
function forgeCage(p){ let e=G.ents.find(x=>!x.alive);
  if(!e){ e={alive:false}; G.ents.push(e); }
  Object.assign(e,{alive:true,type:'cage',z:60,nx:0,ny:0,done:false,iron:false,ph:0,drift:0,rattle:false},p);
  return e; }
function forgeBlack(p){ let e=G.ents.find(x=>!x.alive);
  if(!e){ e={alive:false}; G.ents.push(e); }
  Object.assign(e,{alive:true,type:'black',mode:'swoop',tgt:null,z:60,nx:0,ny:0,home:0,flap:0,done:false},p);
  return e; }
function forgeCloud(p){ let e=G.ents.find(x=>!x.alive);
  if(!e){ e={alive:false}; G.ents.push(e); }
  Object.assign(e,{alive:true,type:'cloud',z:60,nx:0,ny:0,r:.2,ph:0,bolt:0,done:false},p);
  return e; }
function calm(){ G.set({px:0,py:0,tpx:0,tpy:0,invuln:0,fever:0,scoreMult:1,shield:0,magnet:0,
  slowT:0,dashT:0,energy:ENERGY_MAX,combo:0,rescueStreak:0}); G.noSpawn(); killEnts(); }
function catchItem(kind){ calm(); const e=G.dropItem(0,0,kind); e.z=60; G.update(0.016); return e; }

frames(5); ok(S().state==='menu','idle on menu before start');

/* startGame is async (motion permission) — settle microtasks via setImmediate */
function start(cb){ G.startGame(); setImmediate(()=>{ G.noSpawn(); cb(); }); }

start(()=>{
ok(S().state==='play'&&S().score===0&&S().hp===3&&S().timeLeft===60,'startGame resets state (60s, ❤️×3)');
ok(S().energy===ENERGY_MAX&&S().rescued===0&&G.trail.length===0,'full dash energy, empty chick trail');

/* ─ フェアな木かご: タッチで救出 ─ */
calm();
forgeCage({});
let sc=S().score;
G.update(0.016);
ok(S().rescued===1&&S().score===sc+900,'wooden cage rescue: 🐣+1, +900 (got +'+(S().score-sc)+')');
ok(G.trail.length===1,'rescued chick joins the trail');
ok(Math.abs(S().timeLeft-64.984)<.05,'rescue grants +5 seconds ('+S().timeLeft.toFixed(2)+')');
ok(S().slowT>0,'rescue slow-motion engaged');
ok(S().combo===2,'rescue adds +2 combo');
ok(G.parts.some(p=>p.alive)&&G.pops.some(p=>p.alive)&&G.rings.length>0,'rescue fires confetti, popup & shockwave');

/* ─ 🔒鉄かご: 素手ではガシャンと跳ね返される ─ */
calm();
let cage=forgeCage({iron:true});
let r0=S().rescued;
G.update(0.016);
ok(cage.alive&&S().rescued===r0&&cage.rattle,'iron cage resists a bare touch');
ok(G.pops.some(p=>p.alive&&String(p.text).includes('ダッシュ')),'hint popup says use the dash');

/* ─ 🚀ロケットダッシュ(Z軸加速)で鉄かご破壊 ─ */
calm();
ok(G.tryDash()===true,'tryDash fires with full energy');
ok(S().dashT>0&&Math.abs(S().energy-(ENERGY_MAX-DASH_COST))<.01,'dash costs '+DASH_COST+' energy');
ok(G.tryDash()===false,'no dash spam while already dashing');
forgeCage({iron:true});
sc=S().score; r0=S().rescued;
G.update(0.016);
ok(S().rescued===r0+1&&S().score===sc+1300,'dash smashes iron cage: 🐣+1, +1300 (got +'+(S().score-sc)+')');
G.set({dashT:0,energy:10});
ok(G.tryDash()===false,'dash refused when energy is low');

/* ─ 鬼かごにはブラックこっこの護衛 / 救出で護衛は消滅 ─ */
calm();
const realRand=Math.random;
Math.random=()=>0.9;            /* fair()=false を強制 */
G.spawnCage();
Math.random=realRand;
ok(S().lastFair===false,'forced evil cage spawn');
let guards=G.ents.filter(e=>e.alive&&e.type==='black'&&e.mode==='guard');
let evilCage=G.ents.find(e=>e.alive&&e.type==='cage');
ok(evilCage&&evilCage.iron&&guards.length>=1,'evil cage is iron with '+guards.length+' black-cocco guard(s)');
evilCage.z=60; evilCage.nx=0; evilCage.ny=0; evilCage.drift=0;
for(const g of guards)g.z=60;
G.set({dashT:.5}); r0=S().rescued;
G.update(0.016);
ok(S().rescued===r0+1,'dashing through frees the chick from the guarded cage');
ok(!guards.some(g=>g.alive),'guards vanish when their cage breaks');

/* ─ 敵: ブラックこっこちゃん ─ */
calm();
forgeBlack({});
G.update(0.016);
ok(S().hp===2&&S().invuln>0,'black cocco contact costs a heart');
calm();
G.set({dashT:.5});
forgeBlack({});
sc=S().score;
G.update(0.016);
ok(S().hp===2&&S().score===sc+400,'dash smashes black cocco +400 (hp kept)');
calm();
G.set({fever:5,scoreMult:2});
forgeBlack({});
sc=S().score;
G.update(0.016);
ok(S().score===sc+800,'fever smash doubles to +800');

/* ─ ⚡雷雲 ─ */
calm();
forgeCloud({});
G.update(0.016);
ok(S().hp===1,'thunder cloud zaps a heart');
calm();
G.set({hp:3,dashT:.5});
forgeCloud({});
sc=S().score;
G.update(0.016);
ok(S().hp===3&&S().score===sc+100,'dash blasts through the cloud +100');
calm();
G.set({shield:5});
forgeCloud({});
G.update(0.016);
ok(S().hp===3&&S().shield===0,'🛡️ shield absorbs the cloud hit and is consumed');

/* ─ 絵文字アイテム ─ */
G.set({hp:3});
sc=S().score; catchItem('star');  ok(S().score===sc+150,'⭐ star +150');
sc=S().score; catchItem('gem');   ok(S().score===sc+500,'💎 gem +500');
G.set({hp:2}); catchItem('heart');ok(S().hp===3,'❤️ heals back to 3');
let tl=S().timeLeft; catchItem('clock');
ok(Math.abs(S().timeLeft-(tl+4-0.016))<.01,'⏰ adds 4 seconds');
calm(); G.set({energy:10});
{ const e=G.dropItem(0,0,'battery'); e.z=60; G.update(0.016); }
ok(S().energy>=ENERGY_MAX-1,'🔋 battery refills dash energy');
catchItem('magnet'); ok(S().magnet>0,'🧲 magnet armed');
catchItem('shield'); ok(S().shield>0,'🛡️ shield armed');
calm(); catchItem('rainbow');
ok(S().fever>0&&S().scoreMult===2,'🌈 triggers fever ×2');

/* 🧲マグネットはアイテムを吸い寄せる */
calm(); G.set({magnet:5,px:0,py:0});
{ const e=G.dropItem(.6,.6,'gem'); e.z=500;
  const d0=Math.hypot(e.nx,e.ny);
  G.update(0.05);
  ok(Math.hypot(e.nx,e.ny)<d0,'🧲 magnet pulls items toward the player'); }

/* ─ コンボ8 → フィーバー ─ */
calm(); G.set({combo:8,fever:0});
G.update(0.016);
ok(S().fever>0,'combo 8 auto-triggers fever');

/* ─ 時間制限終了 ─ */
calm(); G.set({fever:0,scoreMult:1,timeLeft:.01});
G.update(0.05);
ok(S().state==='over','time up ends the game');
ok(!els['endOv']._cls.has('hidden'),'result overlay shown');
ok(els['endReason'].textContent.includes('タイムアップ'),'reason says time up');
ok(+global.localStorage.getItem('heroBest')>0,'best persisted: '+global.localStorage.getItem('heroBest'));
ok(global.localStorage.getItem('heroRescueBest')!==null,'rescue count best persisted');

/* ─ HP終了 ─ */
start(()=>{
ok(S().state==='play'&&S().hp===3,'restart resets game');
for(let i=0;i<3;i++){ calm(); forgeCloud({}); G.update(0.016); }
ok(S().hp===0&&S().state==='over','3 hits end the game');
ok(els['endReason'].textContent.includes('HP'),'reason says HP out');

/* ─ 難易度 76.6% / 23.4% ─ */
ok(G.CLEAR_RATE===0.766,'CLEAR_RATE constant is 0.766');
{ const realRandom=Math.random; let seed=42;
  Math.random=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
  let F=0,E=0;
  for(let i=0;i<20000;i++){ G.spawnCage(); if(G.get().lastFair)F++; else E++; killEnts(); }
  Math.random=realRandom;
  const pc=F/(F+E)*100;
  ok(Math.abs(pc-76.6)<1.0,'difficulty mix: fair '+pc.toFixed(2)+'% / evil '+(100-pc).toFixed(2)+'% (spec 76.6/23.4)');
}

/* rendering survives with live spawns */
start(()=>{
frames(180); ok(S().state==='play','180 frames of play render without error');

console.log(fail?('\n'+fail+' FAILURES'):'\nALL TESTS PASSED');
process.exit(fail?1:0);
});});});
