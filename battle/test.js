/* Headless test for COCCO RUMBLE. Stubs DOM/Canvas/Audio, drives the match via
   the window.__cocco debug hook + synthetic key events, and asserts core combat:
   hits raise %, off-stage = KO/stock loss, match resolves, and CPU runs clean.
   Run: node battle/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];

function ctxStub(){const g={addColorStop(){}};return new Proxy({},{get(t,p){
  if(p==='createLinearGradient'||p==='createRadialGradient'||p==='createConicGradient')return()=>g;
  return ()=>{};}});}
function canvasStub(){return {width:0,height:0,getContext:()=>ctxStub()};}
const els={};
function elStub(id){ if(els[id])return els[id];
  const e={id,style:{},innerHTML:'',textContent:'',_h:{},_cls:new Set(),
    classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},toggle(c,f){if(f===undefined)f=!e._cls.has(c);f?e._cls.add(c):e._cls.delete(c);return f;},contains(c){return e._cls.has(c);}},
    addEventListener:(t,cb)=>{(e._h[t]=e._h[t]||[]).push(cb);},
    querySelectorAll:()=>[], getContext:()=>ctxStub()};
  els[id]=e; return e; }

const winH={};
global.window={innerWidth:1280,innerHeight:720,devicePixelRatio:1,maxTouchPoints:0,
  addEventListener:(t,cb)=>{(winH[t]=winH[t]||[]).push(cb);},removeEventListener:()=>{},
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},
    createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}},connect(){}}),
    createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}}),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>({buffer:null,connect(){},start(){}}),
    createBiquadFilter:()=>({type:'',frequency:{value:0},connect(){}})};}};
global.navigator={maxTouchPoints:0};
global.document={ getElementById:elStub, createElement:(t)=>canvasStub(),
  body:{classList:{add(){},remove(){},contains(){return false;}}},
  addEventListener:(t,cb)=>{(winH[t]=winH[t]||[]).push(cb);} };
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){this.naturalWidth=298;this.naturalHeight=390;if(typeof this.onload==='function')this.onload();},configurable:true});};
let rafCbs=[];
global.requestAnimationFrame=cb=>{rafCbs.push(cb);return rafCbs.length;};
global.setInterval=()=>0; global.setTimeout=(fn)=>{try{fn();}catch(e){}return 0;};

let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}

try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const C=window.__cocco;
if(!C){ console.error('debug hook missing'); process.exit(1); }

let t=0,frame=0;
function tick(){ t+=16; frame++; const c=rafCbs; rafCbs=[]; for(const cb of c){ try{cb(t);}catch(e){ console.error('FRAME ERR @'+frame,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
function key(code,down){ const list=winH[down?'keydown':'keyup']||[]; for(const cb of list) cb({code,preventDefault(){}}); }

frames(4); // boot/title
C.mode='cpu'; C.diff=1; C.startStocks=2;
C.startMatch(); C.setCountReady();   // skip countdown -> fight
ok(C.state==='fight','match starts and enters fight');
let P=C.P();
ok(P.length===2 && P[1].cpu===true,'two fighters, P2 is CPU');

// --- hit raises percent: place P1 next to P2, jab ---
P=C.P(); P[0].x=600; P[0].y=540; P[0].onGround=true; P[0].facing=1; P[0].state='idle';
P[1].x=668; P[1].y=540; P[1].onGround=true; P[1].state='idle'; P[1].percent=0; P[1].cpu=false; // freeze CPU for this check
const before=P[1].percent;
key('KeyF',true); frames(8); key('KeyF',false); frames(4);
ok(C.P()[1].percent>before,'attack increases opponent % ('+before+' -> '+C.P()[1].percent.toFixed(0)+')');

// --- finite & sane positions ---
P=C.P(); ok(Number.isFinite(P[0].x)&&Number.isFinite(P[0].y)&&Number.isFinite(P[1].vx),'fighter state stays finite');

// --- off-stage causes KO + stock loss ---
P=C.P(); const st=P[1].stocks; P[1].x=3000; // way past right blast zone
frames(2);
ok(C.P()[1].stocks===st-1,'leaving blast zone costs a stock ('+st+' -> '+C.P()[1].stocks+')');

// --- knock out remaining stock -> match resolves with P1 as winner ---
let guard=0;
while(C.state==='fight' && guard++<20){ const pp=C.P(); pp[1].x=3000; pp[1].ko=0; frames(3); }
ok(C.state==='result','match ends when a fighter loses all stocks');

// --- CPU vs idle human runs clean for a while, something happens ---
C.mode='cpu'; C.diff=9; C.startStocks=3; C.startMatch(); C.setCountReady();
const dmg0=C.P()[0].percent;
frames(1800); // ~30s of CPU pressure on an idle P1
P=C.P();
ok(Number.isFinite(P[0].x)&&Number.isFinite(P[1].x),'no NaN after long CPU sim');
ok(P[0].x>-400&&P[0].x<VWcheck()+400,'fighters remain near the arena');
ok(P[0].percent>dmg0 || P[0].stocks<3 || C.state==='result','aggressive CPU actually fights (dmg/stock/end)');
function VWcheck(){return 1280;}

// --- landscape optimization: portrait on a touch device blocks play & pauses the loop ---
C.startMatch(); C.setCountReady();
global.navigator.maxTouchPoints=2;                 // pretend touch device
global.window.innerWidth=420; global.window.innerHeight=900; // portrait
C.resize();
ok(C.blocked===true,'portrait on touch is blocked (rotate prompt)');
ok(els['rotate']._cls.has('show'),'rotate-to-landscape overlay is shown');
const sBefore=JSON.stringify(C.P().map(f=>[f.x.toFixed(1),f.percent]));
frames(120);
ok(JSON.stringify(C.P().map(f=>[f.x.toFixed(1),f.percent]))===sBefore,'game is paused while portrait (no movement/dmg)');
global.window.innerWidth=1280; global.window.innerHeight=620; C.resize();   // back to landscape
ok(C.blocked===false && !els['rotate']._cls.has('show'),'landscape resumes play (prompt hidden)');

console.log('\nframes run: '+frame+'   '+(fail?(fail+' CHECK(S) FAILED'):'ALL CHECKS PASSED'));
process.exit(fail?1:0);
