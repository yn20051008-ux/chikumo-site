/* Headless test for COCCO INVADERS. Stubs DOM/Canvas/Audio, drives via window.__invaders.
   Asserts: play starts, auto/forced fire spawns a rising bullet, killing an invader scores,
   clearing the formation advances the wave, a bomb hits the cannon (life lost), running out
   of lives ends the run + persists hi-score, retry works.  Run: node invaders/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function ctxStub(){const g={addColorStop(){}};return new Proxy({},{get(t,p){
  if(/createLinear|createRadial|createConic|createPattern/.test(p))return()=>g; return ()=>{};}});}
const els={};
function el(id){ if(els[id])return els[id]; const e={id,style:{},textContent:'',_cls:new Set(),
  classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},toggle(c,f){if(f===undefined)f=!e._cls.has(c);f?e._cls.add(c):e._cls.delete(c);return f;},contains(c){return e._cls.has(c);}},
  closest(){return null;}, addEventListener(){}, getContext:()=>ctxStub()};
  Object.defineProperty(e,'onclick',{set(){},get(){return null;},configurable:true}); els[id]=e; return e; }
const winH={};
global.performance={now:()=>0};
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
global.document={getElementById:el,documentElement:{requestFullscreen(){}},exitFullscreen(){},
  addEventListener:(t,c)=>{(winH[t]=winH[t]||[]).push(c);}};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){this.naturalWidth=298;this.naturalHeight=390;if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
global.setInterval=()=>0; global.clearInterval=()=>{}; global.setTimeout=(fn)=>{try{fn();}catch(e){}return 0;};

let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const R=window.__invaders; if(!R){ console.error('hook missing'); process.exit(1); }

let t=0,frame=0;
function tick(){ t+=16; frame++; const c=raf; raf=[]; for(const cb of c){ try{cb(t);}catch(e){ console.error('FRAME ERR @'+frame,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }

frames(3);
R.start(); frames(2);
ok(R.state==='play','enters play on start');
ok(R.info().invaders===55,'full formation of 55 invaders ('+R.info().invaders+')');
ok(R.info().lives===3,'starts with 3 lives');

// forced fire spawns a bullet that travels upward
R.fire();
const y0=R.pbY();
ok(y0!==null,'firing spawns a player bullet');
frames(3);
const y1=R.pbY();
ok(y1!==null && y1<y0,'player bullet rises up the screen ('+y0+'→'+y1+')');

// killing an invader raises the score
const sc0=R.info().score;
const left0=R.info().invaders;
R.killOne();
ok(R.info().score>sc0,'destroying an invader scores points ('+sc0+'→'+R.info().score+')');
ok(R.info().invaders===left0-1,'formation count drops by one');

// clearing the whole formation advances to the next wave
R.start(); frames(2);
ok(R.info().wave===1,'starts on wave 1');
R.clearWave();
frames(2);
ok(R.state==='clear','emptying the formation triggers wave-clear');
frames(100); // ride out the ~1.3s banner
ok(R.state==='play' && R.info().wave===2,'next wave begins ('+R.info().wave+', '+R.info().invaders+' invaders)');

// a bomb dropped onto the cannon costs a life
R.start(); frames(2);
const px=R.playerX(), py=R.playerY();
ok(R.info().lives===3,'3 lives at the start of the run');
for(let i=0;i<70;i++){ R.setX(px); frames(1); } // ride out the spawn-invulnerability
ok(R.info().lives===3,'cannon survives the invulnerable spawn window');
R.dropBombAt(px, py-30);
let safety=0;
while(R.info().lives===3 && safety++<40){ R.setX(px); frames(1); }
ok(R.info().lives===2,'a bomb hitting the cannon costs a life');

// depleting lives ends the run and persists the hi-score
R.start(); frames(2);
for(let i=0;i<40;i++){ R.killOne(); }   // bank some score first
R.loseLife(); R.loseLife(); R.loseLife();
frames(2);
ok(R.state==='over','losing every life ends the run');
ok(R.best()!==0 && global.localStorage.getItem('coccoInvadersBest')!==null,'hi-score persists ('+R.best()+')');

// retry
R.start(); frames(2);
ok(R.state==='play','retry restarts the run');
ok(R.info().score===0 && R.info().invaders===55,'retry resets score and formation');

console.log('\nframes run: '+frame+'   '+(fail?(fail+' CHECK(S) FAILED'):'ALL CHECKS PASSED'));
process.exit(fail?1:0);
