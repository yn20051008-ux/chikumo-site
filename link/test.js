/* Headless test for COCCO LINK. Stubs DOM/Canvas/Audio, drives via window.__link.
   Asserts: chains of 3+ pop & score & refill, short/wrong-color chains don't,
   fever triggers & allows cross-color, time-up ends with best saved, retry.
   Run: node link/test.js */
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
const R=window.__link; if(!R){ console.error('hook missing'); process.exit(1); }

let t=0; function frames(n){ for(let i=0;i<(n||1);i++){ t+=16; const c=raf; raf=[]; for(const cb of c){ try{cb(t);}catch(e){ console.error('FRAME ERR',e.stack||e); process.exit(1);} } } }

frames(3);
R.start(); frames(2);
ok(R.state==='play','enters play on start');
let full=true; for(let c=0;c<6;c++) if(R.colCount(c)!==8) full=false;
ok(full,'grid starts full (6x8)');

// 3-chain pops, scores, refills
R.setColor(0,0,2); R.setColor(1,0,2); R.setColor(2,0,2);
R.chainStart(0,0); R.chainTry(1,0); R.chainTry(2,0);
ok(R.info().chain===3,'chain of 3 built');
R.release(); frames(2);
ok(R.info().score>0,'3-chain pops and scores ('+R.info().score+')');
ok(R.info().maxChain===3,'max chain recorded');
full=true; for(let c=0;c<6;c++) if(R.colCount(c)!==8) full=false;
ok(full,'grid refills to full after pop');

// 2-chain does NOT pop
const s2=R.info().score;
R.setColor(0,0,1); R.setColor(1,0,1); R.setColor(2,0,3);
R.chainStart(0,0); R.chainTry(1,0); R.release(); frames(2);
ok(R.info().score===s2,'2-chain does not pop');

// wrong color can't join
R.setColor(3,0,0); R.setColor(4,0,4);
R.chainStart(3,0); R.chainTry(4,0);
ok(R.info().chain===1,'different color cannot join the chain');
R.release();

// fever: fill gauge, pop a 3-chain -> fever on; cross-color chain allowed
R.setFeverGauge(41);
R.setColor(0,7,2); R.setColor(1,7,2); R.setColor(2,7,2);
R.chainStart(0,7); R.chainTry(1,7); R.chainTry(2,7); R.release(); frames(2);
ok(R.info().feverT>0,'fever triggers when gauge fills (feverT '+R.info().feverT+')');
R.setColor(0,0,0); R.setColor(1,0,3);
R.chainStart(0,0); R.chainTry(1,0);
ok(R.info().chain===2,'during fever any colors connect');
R.release(); frames(2);

// time up -> over + best saved
R.setTime(0.01); frames(3);
ok(R.state==='over','time up ends the round');
ok(global.localStorage.getItem('coccoLinkBest')!==null,'best score saved ('+global.localStorage.getItem('coccoLinkBest')+')');

R.start(); frames(2);
ok(R.state==='play' && R.info().score===0,'retry restarts fresh');

// fast drag must not skip bubbles: one big jump from cell0 to cell2 still links 0,1,2
R.start(); frames(2);
R.setColor(0,0,2); R.setColor(1,0,2); R.setColor(2,0,2);
var p0=R.cellXY(0,0), p2=R.cellXY(2,0);
R.pdown(p0[0],p0[1]);
R.pmove(p2[0],p2[1]);          // single fast move skipping cell (1,0)
ok(R.info().chain===3,'fast drag interpolates over skipped bubbles (chain '+R.info().chain+')');
R.pup();

// drag that leaves the screen and returns still continues the chain
R.start(); frames(2);
R.setColor(0,0,3); R.setColor(1,0,3); R.setColor(2,0,3);
var q0=R.cellXY(0,0), q1=R.cellXY(1,0), q2=R.cellXY(2,0);
R.pdown(q0[0],q0[1]);
R.pmove(q1[0],q1[1]);
R.pmove(-9999,-9999);          // finger slips off-screen
R.pmove(q2[0],q2[1]);          // and comes back onto cell 2
ok(R.info().chain===3,'off-screen-and-back keeps linking (chain '+R.info().chain+')');
R.pup();

console.log('\n'+(fail?(fail+' CHECK(S) FAILED'):'ALL CHECKS PASSED'));
process.exit(fail?1:0);
