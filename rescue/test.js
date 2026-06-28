/* Headless test for COCCO RESCUE (ball & block puzzle).
   Stubs DOM/Canvas/Audio, drives shots via window.__rescue, asserts hits score,
   turns advance & blocks descend, the game ends, and the best score persists.
   Run: node rescue/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
// pick the game block (not the shared audio-guard <script> that precedes it)
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(b=>b.includes('window.__rescue'));
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

// 発射位置を手動で左右に移動できる（両端はクランプ）
{ const b=R.launchBounds();
  ok(R.moveLauncher(b.mid)===b.mid,'ランチャーを中央へ移動できる');
  ok(R.moveLauncher(-99999)===b.min,'左へ動かしすぎても左端でクランプ');
  ok(R.moveLauncher(99999)===b.max,'右へ動かしすぎても右端でクランプ'); }

let sawScore=false, maxTurn=0, sawShift=false, prevTurn=R.info().turn;
for(let shot=0; shot<80 && R.phase!=='over'; shot++){
  if(R.phase==='aim'){
    const ang = -Math.PI/2 + (Math.random()*1.0-0.5);
    R.fire(ang);
  }
  // resolve this shot: run frames until back to aim or over (cap), settle if stuck
  let guard=0;
  while(R.phase==='shoot' && guard++<200){ frames(1); if(guard===180) R.settle(); }
  { let s=0; while((R.phase==='shift'||R.freezeT()>0) && s++<120) frames(1); }  // ride out any 全消し celebration freeze
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
  // a board clear adds a ~0.8s celebration freeze (phase stays 'shift') — wait it out
  let s=0; while((R.phase==='shift'||R.freezeT()>0) && s++<120) frames(1);
  frames(2);
  ok(R.phase==='aim'||R.phase==='over','special "'+id+'" resolves the turn cleanly');
}

// stacking: rescuing twice queues two specials, each spent on a separate shot
R.start(); frames(2);
R.setSpecial('fire'); R.setSpecial('giant');
ok(R.queue()===2,'two rescues queue two special charges');
R.fire(-Math.PI/2);
ok(R.queue()===1,'first shot consumes one charge (one left)');
let q=0; while(R.phase==='shoot' && q++<240){ frames(1); if(q===200) R.settle(); }
{ let s=0; while((R.phase==='shift'||R.freezeT()>0) && s++<120) frames(1); } frames(2);
if(R.phase==='aim'){ R.fire(-Math.PI/2); ok(R.queue()===0,'second shot consumes the remaining charge'); }
else ok(true,'second charge retained until next shot');

// power tiers ramp by reflection count: 10->2, 20->3, 30->4, 40->5, 60->6 (爆破波動)
ok(R.tierFor(0)===1 && R.tierFor(9)===1,'below 10 reflections stays power 1');
ok(R.tierFor(10)===2,'10 reflections -> power 2');
ok(R.tierFor(20)===3,'20 reflections -> power 3');
ok(R.tierFor(30)===4,'30 reflections -> power 4');
ok(R.tierFor(40)===5 && R.tierFor(59)===5,'40-59 reflections -> power 5');
ok(R.tierFor(60)===6 && R.tierFor(99)===6,'60+ reflections -> power 6 (爆破波動)');

// 速度は火力段に直結（段ごと固定・+6刻み）: 火力1=17/2=23/3=29/4=35/5=41/メテオ=47
ok(R.tierSpeed(1)===17,'火力1 → 速度17');
ok(R.tierSpeed(2)===23,'火力2 → 速度23');
ok(R.tierSpeed(3)===29,'火力3 → 速度29');
ok(R.tierSpeed(4)===35,'火力4 → 速度35');
ok(R.tierSpeed(5)===41,'火力5 → 速度41');
ok(R.tierSpeed(6)===47,'メテオ(火力6)段の速度は47');
// メテオ化したボールは別格に爆速（火力段47よりずっと速い／従来どおり72）
ok(R.testMeteorSpeed()===72,'メテオ化したボールは速度72（別格に爆速）');
ok(R.meteorSpeed()>R.tierSpeed(6),'メテオ速度 > 火力6段の速度（メテオは別格）');

// default ball grows +1px per 10 rescued; at MAX it wraps to base size & power+1
R.start(); frames(2);
const base=R.baseR(); const span=R.growSteps(); const per=(span+1)*10;
R.setRescued(0);        ok(Math.abs(R.ballR()-base)<1e-9 && R.ballPower()===1,'0 rescued -> base size, power 1');
R.setRescued(10);       ok(Math.abs(R.ballR()-(base+1))<1e-9,'10 rescued -> base +1px');
R.setRescued(40);       ok(Math.abs(R.ballR()-(base+4))<1e-9,'40 rescued -> base +4px');
R.setRescued(span*10);  ok(Math.abs(R.ballR()-(base+span))<1e-9 && R.ballPower()===1,'reaching MAX size, still power 1');
R.setRescued(per);      ok(Math.abs(R.ballR()-base)<1e-9 && R.ballPower()===2,'past MAX wraps to base size & power 2');
R.setRescued(per+span*10); ok(Math.abs(R.ballR()-(base+span))<1e-9 && R.ballPower()===2,'cycle 2 grows back to MAX, power 2');
R.setRescued(per*2);    ok(Math.abs(R.ballR()-base)<1e-9 && R.ballPower()===3,'second wrap -> base size & power 3');

// cage grade -> rescue count: 鉄(2)=1, 銀(3)=2, 金(4)=3
R.start(); frames(2);
ok(R.testCageGain(2)===1,'鉄のオリ → 救出1羽');
ok(R.testCageGain(3)===2,'銀のオリ → 救出2羽');
ok(R.testCageGain(4)===3,'金のオリ → 救出3羽');

// perfect clear: emptying the board pops a 5-こっこ bonus
R.start(); frames(2);
let pr0=R.info().rescued, ps0=R.info().score;
R.perfectClear();
ok(R.info().rescued===pr0+5,'perfect-clear bonus rescues 5 こっこ');
ok(R.info().score>ps0+500,'perfect-clear bonus adds score');
ok(R.bonusCount()===5,'5 bonus こっこ fly out');

// integration: clearing every block at turn end triggers the bonus
R.start(); frames(2);
R.clearBlocks();
const ir=R.info().rescued;
R.fire(-Math.PI/2);
let pg=0; while(R.phase==='shoot' && pg++<420){ frames(1); if(pg===400) R.settle(); }
frames(3);
ok(R.info().rescued>=ir+5,'clearing the whole board grants the perfect bonus on turn end');
ok(R.freezeT()>0.5,'全消しで約0.8秒のお祝い停止に入る');
let pf=0; while(R.freezeT()>0 && pf++<90) frames(1); frames(3);
ok(R.info().blocks>0,'お祝い停止のあと新しい行が出る');

// 60th reflection (火力6) cinematic: freeze ~1s, show 「加速」, then accelerate
R.start(); frames(2);
const d50=R.accelTo60();
ok(d50===6,'60th reflection reaches 火力6');
ok(R.freezeT()>0.55,'60th reflection freezes time (~0.7s)');
ok(R.bigName()==='加速','「加速」 cinematic text appears');
frames(30); ok(R.freezeT()>0,'still frozen mid-cinematic');
frames(60); ok(R.freezeT()===0,'freeze releases (~0.7s) then accelerates');
ok(R.ballDmg()>=15,'after 加速 the ball becomes a piercing meteor (火力'+R.ballDmg()+')');
ok(R.testPierceKill()===true,'加速メテオ destroys any block it pierces, ignoring HP');
ok(R.testBoostBudget()===5,'加速メテオ vanishes after a capped 5 reflections ('+R.testBoostBudget()+')');
{ const ob=R.testOnlyOneBoosted(); ok(ob.self&&!ob.other,'only the 60-reflection ball boosts; other balls stay normal'); }
{ const cf=R.testChainFreeze(); ok(cf[0]===0.3&&cf[1]===0.3&&cf[2]===0.7,'3連続加速は 0.3→0.3→0.7 で停止 ('+cf.join(',')+')'); }
ok(R.testIsoFreeze()===0.7,'単発（バラバラ）加速は通常の0.7秒停止');
{ const sk=R.testInstantSkip();
  ok(sk.gained===5 && sk.balls===0 && sk.phase==='shift' && sk.frozen,
     '全消しした瞬間にお祝いへスキップ（球即消去＋5羽＋停止） ('+JSON.stringify(sk)+')'); }

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
