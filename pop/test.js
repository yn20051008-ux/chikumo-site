/* Headless test for COCCO POP (tap-to-pop puzzle).
   Stubs DOM/Canvas/Audio, drives taps via window.__pop, asserts pops score,
   combos build & expire, fever triggers/ends, time-up ends the game and the
   best score persists.  Run: node pop/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function ctxStub(){const g={addColorStop(){}};return new Proxy({},{get(t,p){
  if(/createLinear|createRadial|createConic/.test(p))return()=>g; return ()=>{};}});}
const els={};
function el(id){ if(els[id])return els[id]; const e={id,style:{},textContent:'',_cls:new Set(),
  classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},toggle(c,f){if(f===undefined)f=!e._cls.has(c);f?e._cls.add(c):e._cls.delete(c);return f;},contains(c){return e._cls.has(c);}},
  addEventListener(){}, getContext:()=>ctxStub(), width:0, height:0};
  Object.defineProperty(e,'onclick',{set(){},get(){return null;},configurable:true}); els[id]=e; return e; }
const winH={};
global.window={innerWidth:430,innerHeight:880,devicePixelRatio:2,
  addEventListener:(t,c)=>{(winH[t]=winH[t]||[]).push(c);},removeEventListener(){},open(){},
  matchMedia:()=>({matches:false}),
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},suspend(){},
    createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}},connect(){}}),
    createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}}),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>({buffer:null,loop:false,connect(){},start(){},stop(){}}),
    createBiquadFilter:()=>({type:'',frequency:{value:0},connect(){}})};}};
global.navigator={standalone:false,maxTouchPoints:0};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);}};
global.getComputedStyle=()=>({getPropertyValue:()=>''});
global.document={getElementById:el,createElement:()=>el('c'+Math.random()),
  addEventListener:(t,c)=>{(winH[t]=winH[t]||[]).push(c);},hidden:false,documentElement:{},fullscreenElement:null};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){this.naturalWidth=298;this.naturalHeight=390;if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
global.setInterval=()=>0; global.clearInterval=()=>{}; global.setTimeout=(fn)=>{try{fn();}catch(e){}return 0;};

let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const P=window.__pop; if(!P){ console.error('hook missing'); process.exit(1); }

let t=0,frame=0;
function tick(){ t+=16; frame++; const c=raf; raf=[]; for(const cb of c){ try{cb(t);}catch(e){ console.error('FRAME ERR @'+frame,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
const D=P.dims();

frames(3);
ok(P.state==='title','boots into title state');
ok(P.info().bubbles===D.COLS*D.ROWS,'board prefilled ('+P.info().bubbles+' bubbles)');

P.start(); frames(2); P.settle();
ok(P.state==='play','start enters play state');
ok(P.hasMove(),'a playable group exists at start');

// find & pop a group of >=2
function findGroupCell(){ for(let c=0;c<D.COLS;c++) for(let r=0;r<D.ROWS;r++) if(P.groupAt(c,r)>=2) return {c,r,n:P.groupAt(c,r)}; return null; }
const g1=findGroupCell();
ok(!!g1,'found a tappable group (×'+(g1&&g1.n)+')');
const before=P.info();
P.tapCell(g1.c,g1.r); frames(2);
const after=P.info();
ok(after.score>before.score,'pop scores points (+'+(after.score-before.score)+')');
ok(after.combo===1,'first pop starts the combo');
ok(after.pops===before.pops+g1.n,'pop counter advances by group size');
ok(after.gauge>before.gauge,'pop charges the fever gauge');
ok(after.bubbles===D.COLS*D.ROWS,'board refills to full after pop');

// scoring formula: n*n*10*(1+combo*0.1)
P.settle();
const g2=findGroupCell();
if(g2){ const s0=P.info().score, c0=P.info().combo;
  P.tapCell(g2.c,g2.r);
  const exp=Math.round(g2.n*g2.n*10*(1+Math.min(c0+1,30)*0.1));
  ok(P.info().score-s0===exp,'score formula n²×10×combo holds (+'+(P.info().score-s0)+' = '+exp+')'); }

// singleton tap = no pop
P.settle();
P.setColor(0,7,0); P.setColor(1,7,1); P.setColor(0,6,2); P.setColor(1,6,3);
const s1=P.info().score, b1=P.info().bubbles;
P.tapCell(0,7);
ok(P.info().score===s1&&P.info().bubbles===b1,'tapping a lone bubble pops nothing');

// combo expires after the window
frames(Math.ceil((D.COMBO_WIN+0.5)/0.016));
ok(P.info().combo===0,'combo expires after '+D.COMBO_WIN+'s without a pop');

// fever: fill gauge, pop -> fever on, time frozen, bomb taps pop any colors
P.settle(); P.setGauge(D.FEVER_MAX-1);
const g3=findGroupCell();
P.tapCell(g3.c,g3.r); frames(2);
ok(P.info().fever,'full gauge triggers FEVER TIME');
const tF=P.info().time; frames(60);
ok(Math.abs(P.info().time-tF)<1e-9,'timer freezes during fever');
P.settle();
const pf0=P.info().pops;
P.tapXY(window.innerWidth/2, window.innerHeight/2);
ok(P.info().pops>pf0,'fever bomb tap pops bubbles regardless of color (+'+(P.info().pops-pf0)+')');
frames(Math.ceil((D.FEVER_TIME+0.5)/0.016));
ok(!P.info().fever,'fever ends after '+D.FEVER_TIME+'s');
ok(P.info().gauge===0,'gauge resets after fever');

// shuffle restores a playable board
for(let c=0;c<D.COLS;c++) for(let r=0;r<D.ROWS;r++) P.setColor(c,r,(c%2)+(r%2)*2);
ok(!P.hasMove(),'checkerboard board has no moves');
P.shuffle();
ok(P.hasMove(),'shuffle restores a playable board');

// time up -> game over, best persisted, retry works
const scoreEnd=P.info().score;
P.setTime(0.05); frames(10);
ok(P.state==='over','game ends at time up');
ok(global.localStorage.getItem('pop-best')===String(scoreEnd),'best score saved ('+global.localStorage.getItem('pop-best')+')');
frames(80);
P.start(); frames(2);
ok(P.state==='play'&&P.info().score===0,'retry restarts cleanly');

// long soak: random taps for ~30s of frames without errors
P.settle();
for(let i=0;i<400;i++){ const g=findGroupCell(); if(g) P.tapCell(g.c,g.r); frames(5); P.settle(); if(P.state!=='play') break; }
ok(true,'soak: '+P.info().pops+' pops, score '+P.info().score.toLocaleString()+', maxCombo ×'+P.info().maxCombo);

console.log('\nframes run: '+frame+'   '+(fail?(fail+' CHECK(S) FAILED'):'ALL CHECKS PASSED'));
process.exit(fail?1:0);
