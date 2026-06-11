/* Headless test for COCCO WARP (Z-axis depth tunnel runner).
   Stubs DOM/Canvas/Audio, drives the simulation via window.__warp, asserts
   ring PERFECT/GOOD/whiff judging, rock collision & invincibility, star pickup,
   combo→fever trigger, fever double score & rock smashing, distance milestones,
   3-hit game over and best-score persistence.  Run: node warp/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function ctxStub(){const g={addColorStop(){}};return new Proxy({},{get(t,p){
  if(/createLinear|createRadial/.test(p))return()=>g; return ()=>{};}});}
const els={};
function el(id){ if(els[id])return els[id]; const e={id,style:{},textContent:'',_cls:new Set(),
  classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},contains(c){return e._cls.has(c);}},
  addEventListener(){}, getContext:()=>ctxStub(), width:0, height:0};
  Object.defineProperty(e,'onclick',{set(){},get(){return null;},configurable:true}); els[id]=e; return e; }
global.window={innerWidth:430,innerHeight:880,devicePixelRatio:2,
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},
    createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return{connect(){}};}}),
    createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return{connect(){}};},start(){},stop(){}}),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>({buffer:null,connect(){return{connect(){}};},start(){}})};}};
global.AudioContext=global.window.AudioContext;
global.innerWidth=430; global.innerHeight=880; global.devicePixelRatio=2;
global.addEventListener=()=>{};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);}};
global.document={getElementById:el};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
global.performance={now:()=>tNow};
global.setTimeout=(fn)=>{try{fn();}catch(e){}return 0;}; global.clearTimeout=()=>{};

var tNow=0;
let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const G=window.__warp; if(!G){ console.error('hook missing'); process.exit(1); }

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
const S=G.state;
function noSpawn(){ S.nextSpawn=1e9; }

frames(5); ok(S.mode==='title','idle on title before start');

G.startGame(); noSpawn();
ok(S.mode==='play'&&S.score===0&&S.hearts===3&&S.combo===0,'startGame resets state');

// PERFECT: ring crosses z=0 dead-centre on the player
G.spawnRing(0,0,0.4); G.update(0.1);
ok(S.combo===1&&S.score===150,'centre ring = PERFECT 150, combo 1 (score='+S.score+')');
ok(G.parts.length>0&&G.pops.length>0,'perfect spawns particles & popup');
ok(G.waves.length>0,'perfect spawns shockwave');

// GOOD: inside ring but off-centre
let sc=S.score; G.spawnRing(0.25,0,0.4); G.update(0.1);
ok(S.combo===2&&S.score===sc+60,'off-centre ring = GOOD 60, combo continues');

// Whiff: ring missed entirely → combo resets, no damage
G.spawnRing(0.6,0.5,0.4); G.update(0.1);
ok(S.combo===0&&S.hearts===3,'missed ring resets combo, costs no heart');

// Rock collision costs a heart and grants invincibility
S.inv=0; G.spawnRock(0,0,0.4); G.update(0.1);
ok(S.hearts===2&&S.inv>0&&S.combo===0,'rock hit: heart lost, invincible, combo reset');

// Invincibility absorbs the next rock
G.spawnRock(0,0,0.4); G.update(0.1);
ok(S.hearts===2,'invincibility absorbs second rock');

// Star pickup
sc=S.score; G.spawnStar(0,0,0.4); G.update(0.1);
ok(S.score===sc+50,'star pickup +50');

// 10 consecutive PERFECTs trigger WARP FEVER
for(let i=0;i<10;i++){ G.spawnRing(0,0,0.4); G.update(0.1); }
ok(S.combo===10,'combo reaches 10');
ok(S.fever>0,'warp fever triggered at combo 10');
ok(G.floaters.length>0,'fever spawns flying cocco friends');

// Fever doubles the multiplier
sc=S.score; G.spawnRing(0,0,0.4); G.update(0.1);
const gained=S.score-sc;
ok(gained===150*Math.min(1+Math.floor(11/5),9)*2,'fever doubles perfect (gained='+gained+')');

// Fever smashes rocks for bonus instead of damage
sc=S.score; G.spawnRock(0,0,0.4); G.update(0.1);
ok(S.hearts===2&&S.score===sc+80,'fever smashes rock +80, no damage');

// Distance milestone fires a celebration
const popsBefore=G.pops.length; S.dist=499.5; S.nextMile=500; G.update(0.1);
ok(S.nextMile===1000&&G.pops.length>popsBefore,'500ly milestone fires celebration');

// Two more hits end the game (fever off)
S.fever=0; S.inv=0; G.spawnRock(0,0,0.4); G.update(0.1);
ok(S.hearts===1,'second real hit: hearts=1');
S.inv=0; G.spawnRock(0,0,0.4); G.update(0.1);
ok(S.hearts===0&&S.mode==='over','third hit ends game');
ok(!els['endOv']._cls.has('hidden'),'result overlay shown');
ok(+global.localStorage.getItem('warpBest')===G.getBest()&&G.getBest()>0,'best persisted: '+G.getBest());

// Restart works and best survives
G.startGame(); noSpawn();
ok(S.mode==='play'&&S.score===0&&S.hearts===3,'restart resets game');
G.spawnRing(0,0,0.4); G.update(0.1);
ok(S.score===150,'scoring works after restart');

frames(120); ok(true,'120 frames render without error');

console.log(fail?('\n'+fail+' FAILURES'):'\nALL TESTS PASSED');
process.exit(fail?1:0);
