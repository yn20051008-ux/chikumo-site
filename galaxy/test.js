/* Headless test for COCCO GALAXY (beat-synced color-match chain shooter).
   Stubs DOM/Canvas/Audio (WebGL returns null → exercises the context-loss
   fallback path), drives the simulation via window.__galaxy and asserts:
   color-match popping, chain cascades, wrong-color fizzle, JUST star shots,
   black-cocco bullet absorption / fever smash / contact damage / 3-hit KO,
   emoji item effects (heal/time/gem/star/rainbow), combo→fever, the 90s
   time-limit ending, escape combo reset, the 76.6/23.4 clearable/hazard
   spawn ratio, dynamic resolution throttling and the generative BGM.
   Run: node galaxy/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function ctxStub(){const g={addColorStop(){}};return new Proxy({},{get(t,p){
  if(/createLinear|createRadial/.test(p))return()=>g; return ()=>{};}});}
const els={};
function el(id){ if(els[id])return els[id]; const e={id,style:{},textContent:'',_cls:new Set(),
  classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},contains(c){return e._cls.has(c);}},
  addEventListener(){}, getContext:(t)=>t==='2d'?ctxStub():null, width:0, height:0};
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
const G=window.__galaxy; if(!G){ console.error('hook missing'); process.exit(1); }

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
const S=G.state, W=430, H=880, K=430;
const py=H*.84;
function noSpawn(){ S.nextFire=1e9; S.nextStep=1e9; }
function clearAll(){ G.orbs.clear(); G.bullets.clear(); G.items.clear(); G.foes.clear(); }
function settle(o){ o.t=0; o.x=o.x0; return o; }
function flight(n=16){ for(let i=0;i<n;i++) G.update(0.016); }

ok(G.glOK()===false,'WebGL unavailable → context-loss fallback path active');
frames(5); ok(S.mode==='title','idle on title before start');

G.startGame(); noSpawn();
ok(S.mode==='play'&&S.score===0&&S.hearts===3&&S.combo===0&&Math.abs(S.time-90)<.001,
  'startGame resets state (90s timer, 3 hearts)');

// Matching-color shot pops the orb
settle(G.spawnOrb(S.px,640,0)); S.color=0; G.fireBullet(); flight();
ok(S.score===100&&S.combo===1,'matching shot pops orb: +100, combo 1 (score='+S.score+')');
ok(G.orbs.n===0&&G.bullets.n===0,'orb and bullet returned to their pools');
ok(G.parts.length>0&&G.pops.length>0,'pop spawns particles & popup');
clearAll();

// Same-color cluster cascades as a chain (puzzle element)
let sc=S.score, cb=S.combo;
settle(G.spawnOrb(S.px,600,1)); settle(G.spawnOrb(S.px+40,560,1)); settle(G.spawnOrb(S.px+40,640,1));
S.color=1; G.fireBullet(); flight();
ok(S.score===sc+450,'3-chain cascade pays 100+150+200 (+'+(S.score-sc)+')');
ok(S.chainBest>=3&&S.combo===cb+3,'chainBest recorded, combo +3');
ok(G.waves.length>0,'chain fires a ring shockwave');
clearAll();

// Wrong color fizzles: orb survives, no score, no combo gain
sc=S.score; cb=S.combo;
const wo=settle(G.spawnOrb(S.px,640,2)); S.color=0; G.fireBullet(); flight();
ok(G.orbs.n===1&&G.bullets.n===0&&S.score===sc&&S.combo===cb,'wrong color: bullet fizzles, orb survives');
ok(wo.wrong>0,'orb flashes the いろちがい feedback');
clearAll();

// On-beat tap = JUST → star shots that pierce and pop any color (rhythm element)
S.mt=0.115*8; S.nextFire=1e9; sc=S.score; const col0=S.color;
G.tapSwap();
ok(S.color===(col0+1)%3,'tap cycles bullet color');
ok(S.justShots===4&&S.score===sc+30,'on-beat tap = JUST: 4 star shots + 30pt');
settle(G.spawnOrb(S.px,660,0)); settle(G.spawnOrb(S.px,520,2));
G.fireBullet(); flight(20);
ok(G.orbs.n===0,'JUST star shot pierces and pops both colors');
S.justShots=0; clearAll();

// Popping an item orb drops a falling emoji item
settle(G.spawnOrb(S.px,600,0,{e:'🍰',v:200,kind:'food'}));
G.popChain(G.orbs.a[0],null);
G.update(0.016);
ok(G.items.n===1&&G.items.a[0].it.e==='🍰','popped item orb drops 🍰 item');
clearAll();

// Catching items applies their effect
sc=S.score; G.spawnItem(S.px,py-10,{e:'💎',v:300,kind:'gem'}); G.update(0.016);
ok(S.score===sc+300&&G.items.n===0,'💎 caught: +300');
S.hearts=2; G.applyItem({e:'❤️',kind:'heal'},100,100);
ok(S.hearts===3,'❤️ item restores a heart');
S.time=50; G.applyItem({e:'⏰',kind:'time'},100,100);
ok(Math.abs(S.time-56)<.001,'⏰ item adds +6 seconds');
G.applyItem({e:'🌟',kind:'star'},100,100);
ok(S.fever>0,'🌟 item grants mini fever');
ok(G.rains.length>0,'star fires emoji rain');
S.fever=0; G.applyItem({e:'🌈',kind:'rb'},100,100);
ok(S.rainbow===5,'🌈 item grants rainbow shots');
S.rainbow=0; clearAll();

// Combo 20 triggers COCCO FEVER
S.combo=19; S.fever=0;
settle(G.spawnOrb(S.px,600,0)); G.popChain(G.orbs.a[0],null);
ok(S.combo===20,'combo reaches 20');
ok(S.fever>0,'cocco fever triggered at combo 20');
S.fever=0; G.update(0.016); clearAll();

// Black cocco: bullets are absorbed, it cannot be cleared
S.fever=0; S.rainbow=0; S.justShots=0; sc=S.score;
let f=G.spawnFoe(S.px); f.y=650; f.vy=0; S.color=0; G.fireBullet(); flight(4);
ok(G.foes.n===1&&G.bullets.n===0&&S.score===sc,'black cocco absorbs normal shots (きかない!)');
clearAll();

// Fever lets you smash black cocco for bonus
S.fever=5; sc=S.score;
f=G.spawnFoe(S.px); f.y=650; f.vy=0; G.fireBullet(); flight(4);
ok(G.foes.n===0&&S.score===sc+200,'fever star shot smashes black cocco +200');
S.fever=0; clearAll();

// Black cocco contact: heart lost, combo reset (HP element)
S.combo=7;
f=G.spawnFoe(S.px); f.y=py; f.vy=0; G.update(0.016);
ok(S.hearts===2&&S.combo===0,'black cocco contact: heart lost, combo reset');
ok(G.foes.n===0,'foe removed after the hit');
clearAll();

// Two more hits end the game (3-hit KO)
f=G.spawnFoe(S.px); f.y=py; f.vy=0; G.update(0.016);
ok(S.hearts===1,'second hit: hearts=1'); clearAll();
f=G.spawnFoe(S.px); f.y=py; f.vy=0; G.update(0.016);
ok(S.hearts===0&&S.mode==='over'&&S.reason==='ko','third hit ends the game (KO)');
ok(!els['endOv']._cls.has('hidden'),'result overlay shown');
ok(els['endTitle'].textContent.includes('ブラックこっこ'),'KO result title shown');
ok(+global.localStorage.getItem('galaxyBest')===G.getBest()&&G.getBest()>0,'best persisted: '+G.getBest());

// Restart works; escaped orbs reset the combo
G.startGame(); noSpawn();
ok(S.mode==='play'&&S.score===0&&S.hearts===3,'restart resets game');
S.combo=5; const eo=settle(G.spawnOrb(S.px,H*.945,0)); eo.x0=S.px; G.update(0.016);
ok(G.orbs.n===0&&S.combo===0,'escaped orb resets combo (にがした…)');
clearAll();

// Procedural wave generation fills the field
G.waveGen(3);
ok(G.orbs.n>0,'waveGen spawns a procedural formation ('+G.orbs.n+' orbs, '+G.foes.n+' foes)');
clearAll();

// Time limit ends the game
S.time=0.01; G.update(0.05);
ok(S.mode==='over'&&S.reason==='time','timer hits 0 → time-up ending');
ok(els['endTitle'].textContent.includes('タイムアップ'),'time-up result title shown');

// Difficulty spec: clearable (orbs/items) 76.6% vs hazards (black cocco) 23.4%
{ const realRandom=Math.random; let seed=42;
  Math.random=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
  let C=0,U=0;
  for(let i=0;i<200000;i++){ if(G.pickType()==='black')U++; else C++; }
  Math.random=realRandom;
  const pc=C/(C+U)*100;
  ok(Math.abs(pc-76.6)<0.5,'difficulty mix: clearable '+pc.toFixed(2)+'% / hazards '+(100-pc).toFixed(2)+'% (spec 76.6/23.4)');
}

// Generative music: hook phrases are fixed, every 4th phrase is generated in-scale
{ const SCALE=[659,784,880,1047,1175,1319,1568];
  let diff=false, inScale=true;
  for(let i=0;i<32;i++){ const m=G.melodyAt(64+i); // phrase 2 = generated
    if(m!==0&&SCALE.indexOf(m)<0)inScale=false;
    const hook=G.melodyAt(i); if(m!==hook)diff=true; }
  ok(diff,'generated phrase differs from the hook');
  ok(inScale,'generated notes stay on the Am pentatonic scale');
  ok(G.genPhrase(2)[28]===880,'generated phrase resolves home (loops in your head)');
}

// Dynamic resolution throttling reacts to frame cost
{ const s0=G.perf.scale;
  for(let i=0;i<200;i++)G.perf.push(40);
  const dropped=G.perf.scale;
  ok(dropped<s0,'sustained 40ms frames lower render scale ('+s0+'→'+dropped+')');
  for(let i=0;i<400;i++)G.perf.push(8);
  ok(G.perf.scale>dropped,'fast frames recover render scale ('+dropped+'→'+G.perf.scale.toFixed(2)+')');
}

// Live run: real spawning/autofire keeps the game flowing without errors
G.startGame(); frames(300);
ok(G.bullets.n>0||G.orbs.n>0||S.nextStep>16,'autofire & waves run during play');
frames(120); ok(true,'420 frames render without error');

console.log(fail?('\n'+fail+' FAILURES'):'\nALL TESTS PASSED');
process.exit(fail?1:0);
