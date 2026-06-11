/* Headless test for COCCO PULSE (Z-axis 3D rhythm shooter, WebGL).
   Stubs DOM/WebGL/Canvas2D/Audio, drives the simulation via window.__pulse,
   asserts beat judging windows, rhythm-tap combo & fever, bullet→black-cocco
   kills, emoji item effects, unbreakable void shards, HP game-over, 90s time
   limit clear, boss fight, the 76.6%/23.4% difficulty ratio, object pooling
   caps, dynamic resolution throttling and WebGL context-loss fallback.
   Run: node pulse/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];

function ctx2d(){const g={addColorStop(){}};return new Proxy({},{get(t,p){
  if(p in t)return t[p];
  if(/createLinear|createRadial/.test(String(p)))return()=>g;
  return ()=>{};}});}
function glStub(){const o={
  getShaderParameter:()=>true,getProgramParameter:()=>true,getShaderInfoLog:()=>'',
  getExtension:()=>({drawArraysInstancedANGLE(){},vertexAttribDivisorANGLE(){}}),
  getUniformLocation:()=>({}),getAttribLocation:()=>0,getError:()=>0};
  return new Proxy(o,{get(t,p){
    if(p in t)return t[p];
    if(typeof p==='string'&&/^[A-Z][A-Z0-9_]*$/.test(p))return 1;
    return ()=>({});}});}
const els={};
function el(id){ if(els[id])return els[id]; const e={id,style:{},textContent:'',_cls:new Set(),width:0,height:0,
  classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},contains(c){return e._cls.has(c);}},
  addEventListener(){},setPointerCapture(){},
  getContext:t=>t==='2d'?ctx2d():glStub()};
  Object.defineProperty(e,'onclick',{set(){},get(){return null;},configurable:true}); els[id]=e; return e; }
function audioNode(extra){const n={connect(){return n;},start(){},stop(){},
  gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},
  frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
  delayTime:{value:0},type:'',buffer:null,...extra};return n;}
global.window={innerWidth:430,innerHeight:880,devicePixelRatio:2,
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},suspend(){},
    createGain:()=>audioNode(),
    createOscillator:()=>audioNode(),
    createDelay:()=>audioNode(),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>audioNode()};}};
global.AudioContext=global.window.AudioContext;
global.innerWidth=430; global.innerHeight=880; global.devicePixelRatio=2;
global.addEventListener=()=>{};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);}};
let elN=0;
global.document={getElementById:el,addEventListener(){},hidden:false,
  createElement:()=>el('dyn'+(elN++))};
global.Image=function(){this.onload=null;this.width=298;this.height=389;
  Object.defineProperty(this,'src',{set(){if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
var tNow=0;
global.performance={now:()=>tNow};
global.setTimeout=(fn)=>{try{fn();}catch(e){}return 0;}; global.clearTimeout=()=>{};

let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const G=window.__pulse; if(!G){ console.error('hook missing'); process.exit(1); }

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
const S=G.state;
function noSpawn(){ S.spawnT=1e9; }
function fresh(){ G.startGame(); noSpawn(); }

/* ── boot ── */
frames(5);
ok(S.mode==='title','idle on title before start');
ok(G.glState().fallback2D===false&&G.glState().glOk===true,'WebGL renderer initialised (instancing path)');

/* ── difficulty ratio 76.6 / 23.4 ── */
{ const D=G.DIFF; let C=0,U=0,Wt=0;
  for(let i=0;i<D.w.length;i++){C+=D.w[i]*D.c[i];U+=D.w[i]*D.u[i];Wt+=D.w[i];}
  ok(Math.abs(Wt-1)<1e-9,'spawn weights sum to 1');
  const r=C/(C+U);
  ok(Math.abs(r-0.766)<0.002,'clearable ratio = 76.6% (got '+(r*100).toFixed(2)+'%)');
  ok(Math.abs((1-r)-0.234)<0.002,'unclearable ratio = 23.4%'); }

/* ── start & state reset ── */
fresh();
ok(S.mode==='play'&&S.score===0&&S.hearts===3&&S.combo===0,'startGame resets state');
ok(Math.abs(S.timeLeft-G.TLIMIT)<1e-9&&G.TLIMIT===90,'90s time limit armed');

/* ── rhythm judging windows ── */
ok(G.judgeOffset(0)==='perfect','offset 0 → PERFECT');
ok(G.judgeOffset(0.13)==='perfect','offset 0.13 → PERFECT');
ok(G.judgeOffset(-0.2)==='good','offset -0.2 → GOOD');
ok(G.judgeOffset(0.45)==='pass','offset 0.45 → no judge');
S.beatAid=5;
ok(G.judgeOffset(0.2)==='perfect','🎵 beat-aid widens PERFECT window');
S.beatAid=0;

/* ── tap shot (rhythm × shooting) ── */
{ const b0=G.BULLETS.a.length;
  const j=G.tapShot(0);
  ok(j==='perfect'&&S.combo===1&&S.score===30,'JUST tap: combo 1, +30');
  ok(G.BULLETS.a.length-b0===3,'JUST tap fires 3-way spread');
  ok(G.pops.length>0&&G.waves.length>0,'JUST tap spawns popup & shockwave'); }
{ G.tapShot(0.25);
  ok(S.combo===2,'GOOD tap chains combo'); }

/* ── combo 10 → fever ── */
fresh();
for(let i=0;i<10;i++)G.tapShot(0);
ok(S.fever>0,'10 combo triggers PULSE FEVER');
ok(G.floaters.length>0,'fever spawns friend coccos');

/* ── shooting down black cocco ── */
fresh();
G.spawnFoe(0,0.3,2.5,1);
G.fireShot(false,1,false);
const sc0=S.score;
for(let i=0;i<12;i++)G.update(0.016);
ok(G.FOES.a.length===0,'bullet destroys black cocco');
ok(S.score>sc0&&S.kills===1,'kill adds score & kill count');
ok(G.parts.length>0,'kill explodes into particles');

/* ── emoji items ── */
fresh();
S.hearts=2;
G.applyItem(0,100,100); ok(S.hearts===3,'💖 heals one heart');
S.hearts=5; G.applyItem(0,100,100); ok(S.hearts===5&&S.score>=200,'💖 at max HP converts to score');
G.applyItem(1,100,100); ok(S.shield===1,'🛡 grants shield');
G.applyItem(2,100,100); ok(S.multi>0,'⚡ grants triple shot');
G.applyItem(3,100,100); ok(S.fever>0,'🌈 instant fever');
const scI=S.score; G.applyItem(4,100,100); ok(S.score===scI+300,'🍙 +300');
G.applyItem(5,100,100); ok(S.beatAid>0,'🎵 rhythm assist timer');
G.spawnShard(0.5,0,8); G.spawnShard(-0.5,0,9);
G.applyItem(7,100,100); ok(G.SHARDS.a.length===0,'💊 sweeps all void shards');

/* ── item collect via touch ── */
fresh();
G.spawnItem(S.px,S.py,0.4,4);
const scT=S.score;
G.update(0.016);
ok(G.ITEMP.a.length===0&&S.score===scT+300,'flying into 🍙 collects it');

/* ── shield blocks damage ── */
fresh(); S.shield=1; S.inv=0;
G.hurt();
ok(S.hearts===3&&S.shield===0,'shield absorbs the hit');
S.inv=0; G.hurt();
ok(S.hearts===2,'next hit costs a heart');
ok(S.inv>0,'invincibility frames after damage');
const h2=S.hearts; G.hurt();
ok(S.hearts===h2,'no double-hit during invincibility');

/* ── void shard collision hurts ── */
fresh(); S.inv=0;
G.spawnShard(S.px,S.py,0.45);
G.update(0.016);
ok(S.hearts===2,'void shard collision costs a heart');

/* ── unbreakable shard survives bullets ── */
fresh();
G.spawnShard(0,0.3,2);
G.fireShot(false,1,false);
for(let i=0;i<10;i++)G.update(0.016);
ok(G.SHARDS.a.length===1,'void shard cannot be destroyed by bullets');

/* ── HP end ── */
fresh(); S.hearts=1; S.inv=0;
G.hurt();
ok(S.mode==='over','0 HP → game over (HP終了要素)');

/* ── time end ── */
fresh();
S.timeLeft=0.01;
G.update(0.05);
ok(S.mode==='clear'&&S.cleared===true,'timer 0 with HP left → STAGE CLEAR (時間制限終了要素)');

/* ── boss: black cocco ── */
fresh();
S.timeLeft=29;
G.update(0.016);
ok(!!S.boss,'boss spawns at 30s remaining');
S.boss.z=2; S.boss.x=0; S.boss.y=0.3; S.boss.hp=1;
const scB=S.score;
G.fireShot(false,1,false);
for(let i=0;i<10;i++)G.update(0.016);
ok(S.bossDone===true&&S.boss===null,'boss can be shot down');
ok(S.score-scB>=2000,'boss bounty +2000');
ok(G.ITEMP.a.length>=3,'boss drops emoji items');

/* ── boss spits aimed shards ── */
fresh();
S.timeLeft=29; G.update(0.016);
S.boss.z=8; S.boss.atk=0.001;
const sh0=G.SHARDS.a.length;
G.update(0.016);
ok(G.SHARDS.a.length-sh0===3,'boss volleys 3 void shards');

/* ── object pooling caps ── */
fresh();
for(let i=0;i<200;i++)G.fireShot(false,1,false);
ok(G.BULLETS.a.length<=G.BULLETS.cap,'bullet pool capped at '+G.BULLETS.cap);
for(let i=0;i<120;i++)G.spawnFoe(0,0,20+i,1);
ok(G.FOES.a.length<=G.FOES.cap,'foe pool capped at '+G.FOES.cap);
{ const before=G.BULLETS.free.length+G.BULLETS.a.length;
  for(let i=0;i<40;i++)G.update(0.05);
  const after=G.BULLETS.free.length+G.BULLETS.a.length;
  ok(after<=before,'expired bullets recycled into free list'); }

/* ── dynamic resolution throttling ── */
for(let i=0;i<260;i++)G.dynRes(40);
ok(G.getScale()<1,'sustained slow frames lower render scale (got '+G.getScale().toFixed(2)+')');
for(let i=0;i<900;i++)G.dynRes(8);
ok(G.getScale()===1,'fast frames restore full resolution');

/* ── context loss fallback ── */
G._ctxLost({preventDefault(){}});
ok(G.glState().glOk===false,'context lost → GL draws suspended');
frames(3); /* must not throw while lost */
G._ctxRestored();
ok(G.glState().glOk===true,'context restored → GPU resources rebuilt');

/* ── spawn pattern emits entities ── */
fresh();
const f0=G.FOES.a.length+G.SHARDS.a.length+G.ITEMP.a.length;
G.spawnPattern(24);
ok(G.FOES.a.length+G.SHARDS.a.length+G.ITEMP.a.length>f0,'spawnPattern produces a wave');

/* ── best score persistence ── */
fresh(); S.score=4242; S.cleared=true;
G.showEnd(true);
ok(G.getBest()>=4242&&localStorage.getItem('pulseBest')==='4242','best score persisted');
ok(el('endRank').textContent.indexOf('OL')>=0,'clear shows OL rank title');

/* ── long smoke run: 30s of simulated play with spawner on ── */
G.startGame();
for(let i=0;i<1800;i++){ if(i%7===0)G.tapShot(0); tick(16); }
ok(S.mode==='play'||S.mode==='dying'||S.mode==='over','30s smoke run survives without crash (mode='+S.mode+')');

console.log(fail===0?'\nALL TESTS PASSED':'\n'+fail+' TEST(S) FAILED');
process.exit(fail?1:0);
