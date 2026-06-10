/* Headless test for COCCO RUSH (one-tap commuter-train runner).
   Stubs DOM/Canvas/Audio, drives the run via window.__rush (autopilot),
   asserts distance/score grow, eggs build combo & fever, death ends the game,
   and the best score persists.
   Run: node rush/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function ctxStub(){const g={addColorStop(){}};return new Proxy({},{get(t,p){
  if(/createLinear|createRadial|createConic/.test(p))return()=>g; return ()=>{};}});}
const els={};
function el(id){ if(els[id])return els[id]; const e={id,style:{},textContent:'',_cls:new Set(),
  classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},toggle(c,f){if(f===undefined)f=!e._cls.has(c);f?e._cls.add(c):e._cls.delete(c);return f;},contains(c){return e._cls.has(c);}},
  addEventListener(){}, getContext:()=>ctxStub()};
  Object.defineProperty(e,'onclick',{set(){},get(){return null;},configurable:true}); els[id]=e; return e; }
const winH={};
global.window={innerWidth:430,innerHeight:880,devicePixelRatio:2,
  addEventListener:(t,c)=>{(winH[t]=winH[t]||[]).push(c);},removeEventListener(){},open(){},
  matchMedia:()=>({matches:false}),
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},
    createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}},connect(){}}),
    createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}}),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>({buffer:null,connect(){},start(){}}),
    createBiquadFilter:()=>({type:'',frequency:{value:0},connect(){}})};}};
global.navigator={standalone:false,maxTouchPoints:0};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);}};
global.getComputedStyle=()=>({getPropertyValue:()=>''});
global.document={getElementById:el,addEventListener:(t,c)=>{(winH[t]=winH[t]||[]).push(c);}};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){this.naturalWidth=298;this.naturalHeight=390;if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
global.setInterval=()=>0; global.clearInterval=()=>{}; global.setTimeout=(fn)=>{try{fn();}catch(e){}return 0;};

let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const R=window.__rush; if(!R){ console.error('hook missing'); process.exit(1); }

let t=0,frame=0;
function tick(){ t+=16; frame++; const c=raf; raf=[]; for(const cb of c){ try{cb(t);}catch(e){ console.error('FRAME ERR @'+frame,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }

frames(3);
ok(R.state==='title','boots to title screen');

/* --- run 1: autopilot survives & scores --- */
R.start(); frames(2);
ok(R.state==='play','game starts');
ok(R.info().segs>1,'world segments generated ('+R.info().segs+')');
R.auto(true);
frames(1500);                                   // ~24s of play
const i1=R.info();
console.log('  .. after autopilot:',JSON.stringify(i1));
ok(i1.dist>50,'distance grows under autopilot ('+i1.dist+'m)');
ok(i1.score>100,'score grows ('+i1.score+')');
ok(i1.spd>300,'speed ramps up ('+i1.spd+')');

/* --- eggs & combo (autopilot should have grabbed some arcs) --- */
ok(i1.eggs>0,'eggs collected ('+i1.eggs+')');

/* --- fever: force-trigger and verify effects --- */
if(R.state!=='play'){ R.start(); frames(2); R.auto(true); frames(60); }
if(R.state==='play'){
  R.fever(); frames(2);
  const f=R.info();
  ok(f.fever>6,'fever triggers ('+f.fever+'s left)');
  ok(R.praised(),'fever shows praise text');
  ok(f.flock>0,'fever spawns cocco flock ('+f.flock+')');
  frames(560);                                  // fever should run out (~9s)
  ok(R.info().fever===0,'fever ends');
}

/* --- death: stop jumping, fall into a gap --- */
R.auto(false); R.hold(false);
let guard=0; while(R.state==='play'&&guard++<4000) frames(1);
ok(R.state==='over','game ends after falling ('+guard+' frames)');
const s1=R.info().score, b1=R.info().best;
ok(s1>0,'final score recorded ('+s1+')');
ok(b1>=s1&&b1>0,'best saved ('+b1+')');
ok(els['finalScore'].textContent!=='','final score rendered to UI');
ok(localStorage.getItem('coccoRushBest')===String(b1),'best persists to localStorage');

/* --- run 2: best survives restart; immediate death keeps best --- */
R.start(); frames(2);
ok(R.state==='play','restart works');
R.kill(); frames(5);
ok(R.state==='over','kill ends run 2');
ok(R.info().best===b1,'best kept after worse run');

/* --- jump mechanics: buffered/double jump should not throw --- */
R.start(); frames(2); R.jump(); frames(3); R.jump(); frames(30); R.jump(); frames(60);
ok(R.state==='play'||R.state==='over','jump spam is safe');

console.log(fail? '\n'+fail+' FAILURES':'\nALL TESTS PASSED');
process.exit(fail?1:0);
