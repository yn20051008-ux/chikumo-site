/* Headless test for COCCO GRAZE. Stubs DOM/Canvas/Audio, drives via window.__graze.
   Asserts: bullets spawn & score climbs, grazing builds combo, a hit ends the run,
   best score persists, retry works.  Run: node graze/test.js */
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
  addEventListener:(t,c)=>{(winH[t]=winH[t]||[]).push(c);},removeEventListener(){},open(){},matchMedia:()=>({matches:false}),
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},
    createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}},connect(){}}),
    createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}}),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>({buffer:null,connect(){},start(){}}),
    createBiquadFilter:()=>({type:'',frequency:{value:0},connect(){}})};}};
global.navigator={standalone:false,maxTouchPoints:0};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);}};
global.document={getElementById:el,addEventListener:(t,c)=>{(winH[t]=winH[t]||[]).push(c);}};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){this.naturalWidth=298;this.naturalHeight=390;if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
global.setInterval=()=>0; global.clearInterval=()=>{}; global.setTimeout=(fn)=>{try{fn();}catch(e){}return 0;};

let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const R=window.__graze; if(!R){ console.error('hook missing'); process.exit(1); }

let t=0,frame=0;
function tick(){ t+=16; frame++; const c=raf; raf=[]; for(const cb of c){ try{cb(t);}catch(e){ console.error('FRAME ERR @'+frame,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }

frames(3);
R.start(); frames(2);
ok(R.state==='play','enters play on start');
// park player in a corner so director bullets rarely hit; let patterns spawn
R.setPos(20,20);
let maxB=0, sc0=R.info().score;
for(let i=0;i<120 && R.state==='play';i++){ R.setPos(20,20); frames(1); maxB=Math.max(maxB,R.info().bullets); }
ok(maxB>0,'bullets spawn from patterns ('+maxB+')');
ok(R.info().score>sc0,'score climbs over time ('+R.info().score+')');

// graze: a fresh run, stationary bullet placed inside graze ring but outside hit ring
R.start(); frames(2); R.setPos(215,440);
R.spawnAt(215+25,440,0,0,8);   // dist 25: >hit(14) and <graze(42)
frames(1);
ok(R.info().combo>=1,'grazing a near bullet builds combo (combo '+R.info().combo+')');

// death: accrue some score then take a hit
R.start(); frames(2); R.setPos(215,440);
for(let i=0;i<40;i++){ R.setPos(215,440); frames(1); }
R.spawnAt(215,440,0,0,8);  // bullet right on the player -> hit
frames(2);
ok(R.state==='over','a direct hit ends the run');
ok(global.localStorage.getItem('coccoGrazeBest')!==null,'best score saved ('+global.localStorage.getItem('coccoGrazeBest')+')');

// retry
R.start(); frames(2);
ok(R.state==='play','retry restarts the run');

console.log('\nframes run: '+frame+'   '+(fail?(fail+' CHECK(S) FAILED'):'ALL CHECKS PASSED'));
process.exit(fail?1:0);
