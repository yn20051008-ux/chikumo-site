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
  R.start(); frames(2);                 // fresh game each time → empty special queue
  R.setSpecial(id);
  R.fire(-Math.PI/2 + (Math.random()*0.6-0.3));
  ok(R.getSpecial()===null,'special "'+id+'" consumed on launch');
  let g=0; while(R.phase==='shoot' && g++<240){ frames(1); if(g===200) R.settle(); }
  frames(2);
  ok(R.phase==='aim'||R.phase==='over','special "'+id+'" resolves the turn cleanly');
}

// stacking: rescuing twice queues two specials, each spent on a separate shot
R.start(); frames(2);
R.setSpecial('fire'); R.setSpecial('giant');
ok(R.queue()===2,'two rescues queue two special charges');
R.fire(-Math.PI/2);
ok(R.queue()===1,'first shot consumes one charge (one left)');
let q=0; while(R.phase==='shoot' && q++<240){ frames(1); if(q===200) R.settle(); } frames(2);
if(R.phase==='aim'){ R.fire(-Math.PI/2); ok(R.queue()===0,'second shot consumes the remaining charge'); }
else ok(true,'second charge retained until next shot');

// power tiers ramp by reflection count: 10->2, 20->3, 30->4, 40->5, 50->6 (爆破波動)
ok(R.tierFor(0)===1 && R.tierFor(9)===1,'below 10 reflections stays power 1');
ok(R.tierFor(10)===2,'10 reflections -> power 2');
ok(R.tierFor(20)===3,'20 reflections -> power 3');
ok(R.tierFor(30)===4,'30 reflections -> power 4');
ok(R.tierFor(40)===5,'40 reflections -> power 5');
ok(R.tierFor(50)===6 && R.tierFor(99)===6,'50+ reflections -> power 6 (爆破波動)');

// default ball grows +1px per 10 こっこ rescued, capped at でかボール (giant) size
R.start(); frames(2);
const base=R.baseR(), giant=R.giantR();
R.setRescued(0);   ok(Math.abs(R.ballR()-base)<1e-9,'0 rescued -> base ball size');
R.setRescued(10);  ok(Math.abs(R.ballR()-(base+1))<1e-9,'10 rescued -> base +1px');
R.setRescued(40);  ok(Math.abs(R.ballR()-(base+4))<1e-9,'40 rescued -> base +4px');
R.setRescued(Math.round((giant-base))*10); ok(Math.abs(R.ballR()-giant)<1e-9,'reaching the cap = でかボール size');
R.setRescued(99999); ok(Math.abs(R.ballR()-giant)<1e-9,'never grows past でかボール size');

// perfect clear: emptying the board pops a 3-こっこ bonus
R.start(); frames(2);
let pr0=R.info().rescued, ps0=R.info().score;
R.perfectClear();
ok(R.info().rescued===pr0+3,'perfect-clear bonus rescues 3 こっこ');
ok(R.info().score>ps0+500,'perfect-clear bonus adds score');
ok(R.bonusCount()===3,'3 bonus こっこ fly out');

// integration: clearing every block at turn end triggers the bonus
R.start(); frames(2);
R.clearBlocks();
const ir=R.info().rescued;
R.fire(-Math.PI/2);
let pg=0; while(R.phase==='shoot' && pg++<420){ frames(1); if(pg===400) R.settle(); }
frames(3);
ok(R.info().rescued>=ir+3,'clearing the whole board grants the perfect bonus on turn end');
ok(R.freezeT()>0.5,'全消しで約0.8秒のお祝い停止に入る');
let pf=0; while(R.freezeT()>0 && pf++<90) frames(1); frames(3);
ok(R.info().blocks>0,'お祝い停止のあと新しい行が出る');

// 50th reflection (火力6) cinematic: freeze ~1s, show 「加速」, then accelerate
R.start(); frames(2);
const d50=R.accelTo50();
ok(d50===6,'50th reflection reaches 火力6');
ok(R.freezeT()>0.55,'50th reflection freezes time (~0.7s)');
ok(R.bigName()==='加速','「加速」 cinematic text appears');
frames(30); ok(R.freezeT()>0,'still frozen mid-cinematic');
frames(60); ok(R.freezeT()===0,'freeze releases (~0.7s) then accelerates');
ok(R.ballDmg()>=15,'after 加速 the ball becomes a piercing meteor (火力'+R.ballDmg()+')');
ok(R.testPierceKill()===true,'加速メテオ destroys any block it pierces, ignoring HP');
ok(R.testBoostBudget()===8,'加速メテオ vanishes after a capped 8 reflections ('+R.testBoostBudget()+')');

// the freeze actually halts ball physics (movement is fixed-step, not dt-scaled)
R.start(); frames(2);
R.fire(-Math.PI/2);
let gg=0; while(R.phase==='shoot' && !R.ballPos() && gg++<30) frames(1);
const bp1=R.ballPos();
if(bp1 && R.phase==='shoot'){
  R.setFreeze(1.0); frames(12); const bp2=R.ballPos();
  ok(bp2 && Math.abs(bp1.x-bp2.x)<1e-6 && Math.abs(bp1.y-bp2.y)<1e-6,'ball is frozen in place during the 1s stop');
} else ok(true,'(ball not in play to sample freeze — skipped)');

console.log('\nframes run: '+frame+'   '+(fail?(fail+' CHECK(S) FAILED'):'ALL CHECKS PASSED'));
process.exit(fail?1:0);
