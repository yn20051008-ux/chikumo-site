/* Headless test for COCCO GYRO (gyro-controlled Z-axis depth tunnel).
   Stubs DOM/Canvas/Audio, drives the simulation via window.__gyro, asserts
   ring PERFECT/GOOD judging, puzzle-gate correct/wrong/solid outcomes,
   emoji item pickups (⭐💎❤️⏰🛡️🌈), black-cocco collision & fever smash,
   combo→fever trigger, time-limit & HP game-over paths, best persistence,
   and the 76.6% / 23.4% difficulty mix.  Run: node gyro/test.js */
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
const G=window.__gyro; if(!G){ console.error('hook missing'); process.exit(1); }

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
/* place a fresh entity directly in front of the player plane */
function forge(props){ for(const e of G.ents) e.alive=false;
  const e=Object.assign({alive:true,done:false,nx:0,ny:0,z:10},props); G.ents.push(e); return e; }
function S(){ return G.get(); }

frames(5); ok(S().state==='menu','idle on menu before start');

/* startGame is async (gyro permission) — settle microtasks via setImmediate */
function start(cb){ G.startGame(); setImmediate(()=>{ G.noSpawn(); cb(); }); }

start(()=>{
ok(S().state==='play'&&S().score===0&&S().hp===3&&S().timeLeft===60,'startGame resets state (60s, ❤️×3)');

/* PERFECT: ring crosses z=0 dead-centre */
forge({type:'ring',r:.34,drift:0,ph:0}); G.update(0.05);
ok(S().combo===1&&S().score===320,'centre ring = PERFECT 320, combo 1 (score='+S().score+')');
ok(G.parts.some(p=>p.alive)&&G.pops.some(p=>p.alive),'perfect spawns particles & popup');

/* GOOD: inside ring but off-centre */
let sc=S().score; forge({type:'ring',nx:.25,r:.34,drift:0,ph:0}); G.update(0.05);
ok(S().combo===2&&S().score===sc+100,'off-centre ring = GOOD +100, combo continues');

/* whiffed ring resets combo, costs nothing */
forge({type:'ring',nx:.8,ny:.8,r:.26,drift:0,ph:0}); G.update(0.05);
ok(S().combo===0&&S().hp===3,'missed ring resets combo, costs no heart');

/* ─ パズルゲート ─ */
G.set({target:'🍓',px:.5,py:0,combo:0});
sc=S().score;
forge({type:'gate',holeR:.32,rotSpd:0,holes:[{ang:0,emoji:'🍓'},{ang:2.094,emoji:'🍋'},{ang:4.189,emoji:'🍇'}]});
G.update(0.05);
ok(S().puzzleCount===1&&S().score===sc+750,'correct 🍓 hole solves puzzle +750 (score='+S().score+')');
ok(S().combo===2,'puzzle solve grants +2 combo');

G.set({target:'🍋',px:.5,py:0});            /* 🍓 hole again but target is 🍋 → wrong */
let tl=S().timeLeft;
forge({type:'gate',holeR:.32,rotSpd:0,holes:[{ang:0,emoji:'🍓'},{ang:2.094,emoji:'🍋'},{ang:4.189,emoji:'🍇'}]});
G.update(0.05);
ok(Math.abs(S().timeLeft-(tl-2-0.05))<.01&&S().hp===3,'wrong hole costs 2s, no heart');
ok(S().combo===0&&S().puzzleStreak===0,'wrong hole resets combo & streak');

G.set({px:0,py:0,invuln:0});                /* gate centre is solid wall */
forge({type:'gate',holeR:.32,rotSpd:0,holes:[{ang:0,emoji:'🍓'},{ang:2.094,emoji:'🍋'},{ang:4.189,emoji:'🍇'}]});
G.update(0.05);
ok(S().hp===2&&S().invuln>0,'solid part of gate costs a heart + invincibility');

/* invincibility absorbs the next hit */
forge({type:'rock',r:.2,spin:0,ph:0}); G.update(0.05);
ok(S().hp===2,'invincibility absorbs rock');

/* ─ 絵文字アイテム ─ */
G.set({px:0,py:0,invuln:0}); sc=S().score;
forge({type:'item',kind:'star',emoji:'⭐',z:50}); G.update(0.05);
ok(S().score===sc+150,'⭐ star +150');
sc=S().score; forge({type:'item',kind:'gem',emoji:'💎',z:50}); G.update(0.05);
ok(S().score===sc+500,'💎 gem +500');
forge({type:'item',kind:'heart',emoji:'❤️',z:50}); G.update(0.05);
ok(S().hp===3,'❤️ heals back to 3');
tl=S().timeLeft; forge({type:'item',kind:'clock',emoji:'⏰',z:50}); G.update(0.05);
ok(Math.abs(S().timeLeft-(tl+4-0.05))<.01,'⏰ adds 4 seconds');
forge({type:'item',kind:'shield',emoji:'🛡️',z:50}); G.update(0.05);
ok(S().shield>0,'🛡️ shield armed');
G.set({shield:0});
forge({type:'item',kind:'rainbow',emoji:'🌈',z:50}); G.update(0.05);
ok(S().fever>0&&S().scoreMult===2,'🌈 triggers fever ×2');

/* fever smashes black cocco for bonus */
sc=S().score; forge({type:'black',home:0,flap:0,z:50}); G.update(0.05);
ok(S().hp===3&&S().score===sc+800,'fever smashes black cocco +400×2 (got '+(S().score-sc)+')');

/* black cocco hit without fever costs a heart */
G.set({fever:0,scoreMult:1,invuln:0,shield:0});
forge({type:'black',home:0,flap:0,z:50}); G.update(0.05);
ok(S().hp===2,'black cocco contact costs a heart');

/* items/enemies far away in Z must NOT collide */
G.set({invuln:0}); sc=S().score;
forge({type:'black',home:0,flap:0,z:1500}); G.update(0.016);
ok(S().hp===2,'distant black cocco (z=1500) does not collide');
for(const e of G.ents)e.alive=false;

/* combo 10 → fever */
G.set({combo:10,fever:0}); G.update(0.016);
ok(S().fever>0,'combo 10 auto-triggers fever');
G.set({fever:0,scoreMult:1});

/* ─ 時間制限終了 ─ */
G.set({timeLeft:.01}); G.update(0.05);
ok(S().state==='over','time up ends the game');
ok(!els['endOv']._cls.has('hidden'),'result overlay shown');
ok(els['endReason'].textContent.includes('タイムアップ'),'reason says time up');
ok(+global.localStorage.getItem('gyroBest')>0,'best persisted: '+global.localStorage.getItem('gyroBest'));

/* ─ HP終了 ─ */
start(()=>{
ok(S().state==='play'&&S().hp===3,'restart resets game');
for(let i=0;i<3;i++){ G.set({invuln:0,fever:0,shield:0,px:0,py:0});
  forge({type:'rock',r:.2,spin:0,ph:0}); G.update(0.05); }
ok(S().hp===0&&S().state==='over','3 hits end the game');
ok(els['endReason'].textContent.includes('HP'),'reason says HP out');

/* ─ 難易度 76.6% / 23.4% ─ */
ok(G.CLEAR_RATE===0.766,'CLEAR_RATE constant is 0.766');
{ const realRandom=Math.random; let seed=42;
  Math.random=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
  for(const e of G.ents)e.alive=false;
  let F=0,E=0;
  for(let i=0;i<20000;i++){ G.spawnGate();
    const g=G.ents.find(e=>e.alive&&e.type==='gate');
    if(g.holeR>.3)F++; else E++; g.alive=false; }
  Math.random=realRandom;
  const pc=F/(F+E)*100;
  ok(Math.abs(pc-76.6)<1.0,'difficulty mix: fair '+pc.toFixed(2)+'% / evil '+(100-pc).toFixed(2)+'% (spec 76.6/23.4)');
}

/* rendering survives */
start(()=>{
frames(180); ok(S().state==='play','180 frames of play render without error');

console.log(fail?('\n'+fail+' FAILURES'):'\nALL TESTS PASSED');
process.exit(fail?1:0);
});});});
