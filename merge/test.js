/* Headless test for COCCO MERGE. Stubs DOM/Canvas/Audio, drives via window.__merge.
   Asserts: same-level coccos merge (score up, level up, count drops), drops work,
   game over + best persist, retry.  Run: node merge/test.js */
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
const R=window.__merge; if(!R){ console.error('hook missing'); process.exit(1); }

R.start();
ok(R.state==='play','enters play on start');
ok(R.info().balls===0,'starts empty');

// merge: two overlapping level-0 coccos fuse into one level-1
const cx=R.cx();
R.dropAt(cx-2,0); R.dropAt(cx+2,0);
ok(R.ballCount()===2,'two coccos placed');
R.step(20);
ok(R.info().maxLv>=1,'same-level coccos merge into a bigger one (maxLv '+R.info().maxLv+')');
ok(R.info().score>0,'merging scores points ('+R.info().score+')');
ok(R.ballCount()===1,'two became one ('+R.ballCount()+')');

// dropping via the normal path doesn't crash and adds a ball
const before=R.ballCount(); R.setX(cx); R.drop(); R.step(3);
ok(R.ballCount()===before+1,'drop adds a cocco');

// physics settles without NaN
R.step(120);
ok(R.info().balls>=0 && Number.isFinite(R.info().score),'physics runs clean');

// game over + best save (score already > 0)
R.forceOver();
ok(R.state==='over','game over works');
ok(global.localStorage.getItem('coccoMergeBest')!==null,'best score saved ('+global.localStorage.getItem('coccoMergeBest')+')');

R.start();
ok(R.state==='play','retry restarts');

console.log('\n'+(fail?(fail+' CHECK(S) FAILED'):'ALL CHECKS PASSED'));
process.exit(fail?1:0);
