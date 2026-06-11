/* Headless test for KOKKO BREAKER (gyro-controlled Z-axis 3D block breaker).
   Stubs DOM/Canvas/Audio, drives the simulation via window.__breaker, asserts
   paddle bounce & ball-miss HP loss, block break scoring & fever piercing,
   cage hits → rescue (score/time/stage/slow-mo), emoji item pickups
   (⭐💎❤️⏰🛡️🧲⚽🌈), black-cocco deflect / fever smash / dive damage,
   combo→fever trigger, time-limit & HP game-over paths, best persistence,
   and the 76.6% / 23.4% difficulty mix.  Run: node breaker/test.js */
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
const G=window.__breaker; if(!G){ console.error('hook missing'); process.exit(1); }
const {ZWALL,ZCAGE}=G.consts;

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
function S(){ return G.get(); }
function killBalls(){ for(const b of G.balls) b.alive=false; }
function killEnts(){ for(const e of G.ents) e.alive=false; }
function forgeBall(props){ killBalls();
  const b=G.balls[0]||(G.balls.push({alive:false}),G.balls[0]);
  Object.assign(b,{alive:true,held:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,r:.05},props);
  return b; }
function forgeBlock(props){ G.blocks.length=0;
  const b=Object.assign({alive:true,c:0,r:0,nx:0,ny:0,hp:1,maxHp:1},props);
  G.blocks.push(b); return b; }
function calm(){ G.set({px:0,py:0,tpx:0,tpy:0,invuln:0,fever:0,scoreMult:1,shield:0,
  wide:0,stageDelay:0,stageFair:true,wallOff:0,slow:1,slowT:0}); G.noSpawn(); killEnts(); }

frames(5); ok(S().state==='menu','idle on menu before start');

/* startGame is async (gyro permission) — settle microtasks via setImmediate */
function start(cb){ G.startGame(); setImmediate(()=>{ G.noSpawn(); cb(); }); }

start(()=>{
ok(S().state==='play'&&S().score===0&&S().hp===3&&S().timeLeft===60,'startGame resets state (60s, ❤️×3)');
ok(S().stage===1&&G.blocks.length>0,'stage 1 wall built ('+G.blocks.length+' blocks)');
ok(G.balls.some(b=>b.alive&&b.held),'serve ball waits on the paddle');

/* ─ ボールでブロック壊す ─ */
calm();
forgeBlock({});
let b=forgeBall({z:ZWALL-30,vz:820});
G.update(0.05);
ok(!G.blocks[0].alive&&S().combo===1&&S().score===110,'ball smashes block: +110, combo 1 (score='+S().score+')');
ok(b.vz<0,'ball bounces back off the wall plane (vz='+b.vz.toFixed(0)+')');
ok(G.parts.some(p=>p.alive)&&G.pops.some(p=>p.alive),'block break spawns particles & popup');

/* 硬ブロックはヒビが入るだけ */
calm();
let hard=forgeBlock({hp:2,maxHp:2});
let sc=S().score;
forgeBall({z:ZWALL-30,vz:820});
G.update(0.05);
ok(hard.alive&&hard.hp===1&&S().score===sc+30,'2HP block survives first hit (+30 clink)');

/* フィーバー中は貫通 */
calm();
G.startFever();
ok(S().fever>0&&S().scoreMult===2,'fever armed ×2');
forgeBlock({});
b=forgeBall({z:ZWALL-30,vz:820});
G.update(0.05);
ok(!G.blocks[0].alive&&b.vz>0,'fever ball pierces through the block');
calm();

/* ─ パドルで打ち返す（操作のリズム） ─ */
b=forgeBall({z:20,vz:-500});
sc=S().score;
G.update(0.05);
ok(b.vz>0&&S().rally===1&&S().score===sc+10,'paddle bounce: vz flips, rally 1, +10');

/* ─ 取りこぼし = HP終了要素 ─ */
calm(); G.blocks.length=0;
forgeBall({x:.7,y:.7,z:-140,vz:-600});
G.update(0.05);
ok(S().hp===2,'missed ball costs a heart');
ok(G.balls.some(bb=>bb.alive&&bb.held),'new serve ball respawns after miss');

/* 🛡️は最後のボールを自動セーブ */
calm(); G.set({shield:5});
b=forgeBall({z:-140,vz:-600});
G.update(0.05);
ok(b.alive&&b.vz>0&&S().shield===0,'shield auto-saves the last ball and is consumed');

/* ─ 檻のこっこちゃん救出 ─ */
calm(); G.blocks.length=0;
G.set({cageX:0,cageY:0,cageHp:2});
b=forgeBall({z:ZCAGE-30,vz:820});
sc=S().score;
G.update(0.05);
ok(S().cageHp===1&&b.vz<0&&S().score===sc+250,'cage hit: 🔒-1, +250, ball bounces');
let tl=S().timeLeft,st=S().stage;
forgeBall({z:ZCAGE-30,vz:820});
G.update(0.05);
ok(S().rescued===1&&S().stage===st+1,'cage broken → 🐣 rescued, next stage');
ok(Math.abs(S().timeLeft-(tl+10))<.2,'rescue grants +10 seconds');
ok(S().stageDelay>0&&!G.balls.some(bb=>bb.alive),'rescue slow-mo interlude: balls cleared');
ok(G.ents.some(e=>e.alive&&e.type==='saved'),'rescued cocco flies toward the camera');
ok(S().slow<1,'slow-motion engaged for the rescue moment');
G.update(1.0); G.update(2.0);
ok(G.blocks.length>0&&G.balls.some(bb=>bb.alive)&&S().cageHp>0,'next stage wall + cage built after interlude');

/* ─ 絵文字アイテム ─ */
function catchItem(kind){ calm(); G.dropItem(0,0,kind);
  const e=G.ents.find(x=>x.alive&&x.type==='item'); e.z=60; G.update(0.016); return e; }
sc=S().score; catchItem('star');  ok(S().score===sc+150,'⭐ star +150');
sc=S().score; catchItem('gem');   ok(S().score===sc+500,'💎 gem +500');
G.set({hp:2}); catchItem('heart');ok(S().hp===3,'❤️ heals back to 3');
tl=S().timeLeft; catchItem('clock');
ok(Math.abs(S().timeLeft-(tl+5-0.016))<.01,'⏰ adds 5 seconds');
catchItem('shield'); ok(S().shield>0,'🛡️ shield armed');
catchItem('wide');   ok(S().wide>0,'🧲 wide paddle armed');
calm();
forgeBall({z:300,vz:820});
G.dropItem(0,0,'multi'); G.ents.find(x=>x.alive&&x.type==='item').z=60;
G.update(0.016);
ok(G.balls.filter(bb=>bb.alive).length===3,'⚽ multiball splits into 3 balls');
calm(); catchItem('rainbow');
ok(S().fever>0&&S().scoreMult===2,'🌈 triggers fever ×2');

/* ─ 敵: ブラックこっこちゃん ─ */
calm(); G.spawnBlack();
let blk=G.ents.find(e=>e.alive&&e.type==='black');
Object.assign(blk,{x:0,y:0,z:300,mode:'goalie',spd:0,diveT:1e9,cool:0});
b=forgeBall({z:300,vz:820});
G.update(0.016);
ok(b.vz<0&&S().hp===3,'black cocco deflects the ball (no heart lost)');

calm(); G.startFever(); killEnts(); G.spawnBlack();
blk=G.ents.find(e=>e.alive&&e.type==='black');
Object.assign(blk,{x:0,y:0,z:300,mode:'goalie',spd:0,diveT:1e9,cool:0});
forgeBall({z:300,vz:820});
sc=S().score;
G.update(0.016);
ok(!blk.alive&&S().score===sc+800,'fever ball smashes black cocco +400×2 (got '+(S().score-sc)+')');

calm(); killBalls(); G.spawnBlack();
blk=G.ents.find(e=>e.alive&&e.type==='black');
Object.assign(blk,{x:0,y:0,z:50,mode:'dive'});
G.update(0.05);
ok(S().hp===2&&!blk.alive,'black cocco dive attack costs a heart');

/* ─ コンボ10 → フィーバー ─ */
calm(); killBalls(); G.set({combo:10,fever:0});
G.update(0.016);
ok(S().fever>0,'combo 10 auto-triggers fever');

/* ─ 時間制限終了 ─ */
calm(); killBalls(); G.set({fever:0,scoreMult:1,timeLeft:.01});
G.update(0.05);
ok(S().state==='over','time up ends the game');
ok(!els['endOv']._cls.has('hidden'),'result overlay shown');
ok(els['endReason'].textContent.includes('タイムアップ'),'reason says time up');
ok(+global.localStorage.getItem('breakerBest')>0,'best persisted: '+global.localStorage.getItem('breakerBest'));

/* ─ HP終了 ─ */
start(()=>{
ok(S().state==='play'&&S().hp===3,'restart resets game');
for(let i=0;i<3;i++){ calm(); G.blocks.length=0;
  forgeBall({x:.7,y:.7,z:-140,vz:-600}); G.update(0.05); }
ok(S().hp===0&&S().state==='over','3 dropped balls end the game');
ok(els['endReason'].textContent.includes('HP'),'reason says HP out');

/* ─ 難易度 76.6% / 23.4% ─ */
ok(G.CLEAR_RATE===0.766,'CLEAR_RATE constant is 0.766');
{ const realRandom=Math.random; let seed=42;
  Math.random=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
  let F=0,E=0;
  for(let i=0;i<20000;i++){ G.buildStage(); if(G.get().stageFair)F++; else E++; }
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
