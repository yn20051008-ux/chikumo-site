/* Headless test for COCCO BEAT (two-lane tap rhythm game).
   Stubs DOM/Canvas/Audio, drives the simulation via window.__beat, asserts
   PERFECT/GOOD/whiff/miss judging, black-cocco tap damage & untapped dodge bonus,
   emoji item bonuses (heal/star), combo→fever trigger, fever double score &
   black smashing, 3-hit game over, best persistence and the 76.6/23.4
   clearable/hazard spawn ratio.  Run: node beat/test.js */
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
global.document={getElementById:el,addEventListener(){},hidden:false,
  createElement:()=>({getContext:()=>ctxStub(),width:0,height:0})};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
global.performance={now:()=>tNow};
global.setTimeout=(fn)=>{try{fn();}catch(e){}return 0;}; global.clearTimeout=()=>{};

var tNow=0;
let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const G=window.__beat; if(!G){ console.error('hook missing'); process.exit(1); }

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
const S=G.state;
function noSpawn(){ S.nextStep=1e9; }
function clearNotes(){ G.notes.length=0; }

frames(5); ok(S.mode==='title','idle on title before start');

G.startGame(); noSpawn(); S.mt=0;
ok(S.mode==='play'&&S.score===0&&S.hearts===3&&S.combo===0,'startGame resets state');

// PERFECT: tap exactly on the beat
G.spawnNote(0,'normal',S.mt); G.judgeTap(0);
ok(S.combo===1&&S.score===100,'on-beat tap = PERFECT 100, combo 1 (score='+S.score+')');
ok(G.parts.length>0&&G.pops.length>0,'perfect spawns particles & popup');
ok(G.waves.length>0,'perfect spawns shockwave');
ok(S.slow>0,'perfect triggers hit-stop slow-mo');
clearNotes();

// GOOD: tap slightly off the beat
let sc=S.score; G.spawnNote(1,'normal',S.mt+0.11); G.judgeTap(1);
ok(S.combo===2&&S.score===sc+50,'off-beat tap = GOOD 50, combo continues');
clearNotes();

// Whiff: tap with no note in the window → combo resets, no damage
G.judgeTap(0);
ok(S.combo===0&&S.hearts===3,'empty tap resets combo, costs no heart');

// Miss: note passes the window untapped → combo resets, no damage
G.spawnNote(0,'normal',S.mt); S.combo=5; G.update(0.3);
ok(S.combo===0&&S.hearts===3,'missed note resets combo, costs no heart');
clearNotes(); S.mt=0;

// Black cocco tapped = heart lost, combo reset
G.spawnNote(0,'black',S.mt); G.judgeTap(0);
ok(S.hearts===2&&S.combo===0,'tapping black cocco: heart lost, combo reset');
clearNotes();

// Black cocco left alone = dodge bonus, no damage
sc=S.score; G.spawnNote(1,'black',S.mt); G.update(0.3);
ok(S.hearts===2&&S.score===sc+20,'untapped black cocco passes: +20 dodge, no damage');
clearNotes(); S.mt=0;

// Item pickup pays its bonus (perfect doubles it)
sc=S.score; { const o=G.spawnNote(0,'item',S.mt); o.item={e:'🍰',v:200}; }
G.judgeTap(0);
ok(S.score===sc+400,'perfect item tap doubles bonus (+400)');
clearNotes();

// Heart item heals
{ const o=G.spawnNote(1,'item',S.mt); o.item={e:'❤️',v:100,heal:true}; }
G.judgeTap(1);
ok(S.hearts===3,'❤️ item restores a heart');
clearNotes();

// Star item grants a mini fever
{ const o=G.spawnNote(0,'item',S.mt); o.item={e:'🌟',v:200,star:true}; }
G.judgeTap(0);
ok(S.fever>0,'🌟 item grants mini fever');
ok(G.rains.length>0,'star fires emoji rain');
S.fever=0; clearNotes();

// 20-combo triggers COCCO FEVER
S.combo=0;
for(let i=0;i<20;i++){ G.spawnNote(i%2,'normal',S.mt); G.judgeTap(i%2); }
ok(S.combo===20,'combo reaches 20');
ok(S.fever>0,'cocco fever triggered at combo 20');
clearNotes();

// Fever doubles the multiplier
sc=S.score; G.spawnNote(0,'normal',S.mt); G.judgeTap(0);
const gained=S.score-sc;
ok(gained===100*Math.min(1+Math.floor(21/10),9)*2,'fever doubles perfect (gained='+gained+')');
clearNotes();

// Fever lets you smash black cocco for bonus instead of damage
sc=S.score; G.spawnNote(1,'black',S.mt); G.judgeTap(1);
ok(S.hearts===3&&S.score===sc+100,'fever smashes black cocco +100, no damage');
clearNotes();

// Two more real black taps end the game (fever off)
S.fever=0;
G.spawnNote(0,'black',S.mt); G.judgeTap(0);
ok(S.hearts===2,'second real black tap: hearts=2'); clearNotes();
G.spawnNote(0,'black',S.mt); G.judgeTap(0);
ok(S.hearts===1,'third real black tap: hearts=1'); clearNotes();
G.spawnNote(0,'black',S.mt); G.judgeTap(0);
ok(S.hearts===0&&S.mode==='over','final black tap ends game');
ok(!els['endOv']._cls.has('hidden'),'result overlay shown');
ok(+global.localStorage.getItem('beatBest')===G.getBest()&&G.getBest()>0,'best persisted: '+G.getBest());

// Restart works and scoring still functions
G.startGame(); noSpawn(); S.mt=0;
ok(S.mode==='play'&&S.score===0&&S.hearts===3,'restart resets game');
G.spawnNote(0,'normal',S.mt); G.judgeTap(0);
ok(S.score===100,'scoring works after restart');
clearNotes();

// Chart density grows with level
{ S.lv=1; let n1=0; for(let i=0;i<32;i++)if(G.chartHasNote(i))n1++;
  S.lv=4; let n4=0; for(let i=0;i<32;i++)if(G.chartHasNote(i))n4++;
  ok(n4>n1,'chart densifies with level ('+n1+'→'+n4+' notes/loop)'); }

// Difficulty spec: clearable notes (cocco/items) 76.6% vs hazards (black cocco) 23.4%
{ const realRandom=Math.random; let seed=42;
  Math.random=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
  let C=0,U=0;
  for(let i=0;i<200000;i++){ if(G.pickType()==='black')U++; else C++; }
  Math.random=realRandom;
  const pc=C/(C+U)*100;
  ok(Math.abs(pc-76.6)<0.5,'difficulty mix: clearable '+pc.toFixed(2)+'% / hazards '+(100-pc).toFixed(2)+'% (spec 76.6/23.4)');
}

// Live run: real spawning keeps the game flowing without errors
G.startGame(); S.mt=0; frames(300);
ok(G.notes.length>0||S.nextStep>8,'chart auto-spawns notes during play');
frames(120); ok(true,'420 frames render without error');

console.log(fail?('\n'+fail+' FAILURES'):'\nALL TESTS PASSED');
process.exit(fail?1:0);
