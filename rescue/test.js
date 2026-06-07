/* Headless test for COCCO RESCUE (ball & block puzzle).
   Stubs DOM/Canvas/Audio, drives shots via window.__rescue, asserts hits score,
   turns advance & blocks descend, the game ends, and the best score persists.
   Run: node rescue/test.js */
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
const R=window.__rescue; if(!R){ console.error('hook missing'); process.exit(1); }

let t=0,frame=0;
function tick(){ t+=16; frame++; const c=raf; raf=[]; for(const cb of c){ try{cb(t);}catch(e){ console.error('FRAME ERR @'+frame,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }

frames(3);
R.start(); frames(2);
ok(R.phase==='aim','game starts in aim phase');
ok(R.info().blocks>0,'blocks present at start ('+R.info().blocks+')');

let sawScore=false, maxTurn=0, sawShift=false, prevTurn=R.info().turn;
for(let shot=0; shot<80 && R.phase!=='over'; shot++){
  if(R.phase==='aim'){
    const ang = -Math.PI/2 + (Math.random()*1.0-0.5);
    R.fire(ang);
  }
  // resolve this shot: run frames until back to aim or over (cap), settle if stuck
  let guard=0;
  while(R.phase==='shoot' && guard++<200){ frames(1); if(guard===180) R.settle(); }
  frames(2);
  const inf=R.info();
  if(inf.score>0) sawScore=true;
  if(inf.turn>prevTurn){ sawShift=true; } prevTurn=inf.turn; maxTurn=Math.max(maxTurn,inf.turn);
}
const inf=R.info();
ok(sawScore,'hitting blocks scores points ('+inf.score+')');
ok(sawShift && maxTurn>3,'turns advance & new rows spawn (turn '+maxTurn+')');
ok(R.phase==='over','game ends when blocks reach the deadline');
ok(global.localStorage.getItem('coccoRescueBest')!==null,'best score saved ('+global.localStorage.getItem('coccoRescueBest')+')');

// restart works
R.start(); frames(2);
ok(R.phase==='aim','retry restarts into aim phase');

// each of the 5 special effects activates & runs without error
for(const id of ['fire','thunder','split','pierce','giant']){
  if(R.phase!=='aim'){ R.start(); frames(2); }
  R.setSpecial(id);
  R.fire(-Math.PI/2 + (Math.random()*0.6-0.3));
  let g=0; while(R.phase==='shoot' && g++<240){ frames(1); if(g===200) R.settle(); }
  frames(2);
  ok(R.getSpecial()===null,'special "'+id+'" activates & is consumed');
}

console.log('\nframes run: '+frame+'   '+(fail?(fail+' CHECK(S) FAILED'):'ALL CHECKS PASSED'));
process.exit(fail?1:0);
