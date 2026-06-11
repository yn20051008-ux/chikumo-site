/* Headless test for COCCO FEVER (one-tap timing game).
   Stubs DOM/Canvas/Audio, drives judgements via window.__fever, asserts
   PERFECT/GREAT/MISS scoring, combo & fever triggers, 3-miss game over and
   best-score persistence.  Run: node fever/test.js */
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
global.window={innerWidth:430,innerHeight:880,devicePixelRatio:2,
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},
    createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return{connect(){}};}}),
    createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return{connect(){}};},start(){},stop(){}}),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>({buffer:null,connect(){return{connect(){}};},start(){}})};}};
global.AudioContext=global.window.AudioContext;
global.innerWidth=430; global.innerHeight=880; global.devicePixelRatio=2;
global.addEventListener=()=>{};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);}};
global.document={getElementById:el};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
global.performance={now:()=>tNow};
global.setTimeout=(fn)=>{try{fn();}catch(e){}return 0;}; global.clearTimeout=()=>{};

var tNow=0;
let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const F=window.__fever; if(!F){ console.error('hook missing'); process.exit(1); }

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
const S=F.state;

frames(5); ok(!S.playing,'idle before start');

F.startGame(); ok(S.playing&&S.score===0&&S.miss===0,'startGame resets state');

// PERFECT: ring at exactly 1.0
S.ring=1.0; F.judge();
ok(S.combo===1&&S.score===100,'perfect scores 100 and combo 1 (score='+S.score+')');
ok(F.parts.length>0&&F.pops.length>0,'perfect spawns particles & popup');

// GREAT: ring in outer window
S.ring=1.15; const sc=S.score; F.judge();
ok(S.combo===2&&S.score===sc+40,'great scores 40, combo continues');

// MISS resets combo, costs a life
S.ring=1.5; F.judge();
ok(S.combo===0&&S.miss===1,'miss resets combo, miss=1');

// Fever at combo 10
for(let i=0;i<10;i++){ S.ring=1.0; F.judge(); }
ok(S.combo===10,'combo reaches 10');
ok(S.fever>0,'fever triggered at combo 10');
ok(F.floaters.length>0,'fever spawns flying coccos');

// Fever doubles perfect score
const before=S.score; S.ring=1.0; F.judge();
const gained=S.score-before;
ok(gained===100*Math.min(1+Math.floor(11/5),9)*2,'fever doubles multiplier (gained='+gained+')');

// Ring run-out counts as miss
S.ring=0.55; tick();
ok(S.miss===2,'ring run-out is a miss (miss='+S.miss+')');

// Third miss ends game
S.ring=1.5; F.judge();
ok(S.miss===3&&!S.playing,'third miss ends game');
ok(!els['endOv']._cls.has('hidden'),'result overlay shown');
ok(+global.localStorage.getItem('feverBest')===F.getBest()&&F.getBest()>0,'best persisted: '+F.getBest());

// Restart works and best survives
F.startGame(); ok(S.playing&&S.score===0,'restart resets game');
S.ring=1.0; F.judge(); ok(S.score===100,'scoring works after restart');

frames(120); ok(true,'120 frames render without error');

console.log(fail?('\n'+fail+' FAILURES'):'\nALL TESTS PASSED');
process.exit(fail?1:0);
