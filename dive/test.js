/* Headless smoke/regression test for COCCO DIVE.
   Stubs DOM/Canvas/Audio, injects debug hooks, drives a competent player,
   and asserts: kills register, waves advance, a boss is defeated, taking
   crashes ends the game, and the hi-score persists.   Run: node dive/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const inject=
 'global.__dbg=()=>({state:G.state,score:G.score,en:enemies.length,wave:G.wave,'+
 'boss:enemies.some(e=>e.boss),shield:Math.round(G.shield),kills:G.enemiesKilled,spread:G.spread,bombs:G.bombs});'+
 'global.__pos=()=>enemies.filter(e=>!e.dead).map(e=>{const p=FOCAL/(e.zz+FOCAL),sp=Math.min(W,H)*0.62;'+
 'return{boss:!!e.boss,x:CX+(e.ex+e.drift*(1-e.zz))*sp*p,y:CY+(e.ey+e.driftY*(1-e.zz))*sp*p*0.92,zz:e.zz};});'+
 'global.__aim=(x,y)=>{G.aimX=x;G.aimY=y;};})();';
script=script.slice(0,script.lastIndexOf('})();'))+inject;

let rafCbs=[];
function makeCtx(){const g={addColorStop(){}};return new Proxy({canvas:{width:800,height:600},createRadialGradient:()=>g,createLinearGradient:()=>g,createConicGradient:()=>g},{get(t,p){return p in t?t[p]:()=>{};},set(t,p,v){t[p]=v;return true;}});}
const E={};
function el(id){if(E[id])return E[id];const h={};const e={id,_cls:new Set(),style:{},textContent:'',_on:{},_h:h,getContext:()=>makeCtx(),addEventListener:(t,c)=>{(h[t]=h[t]||[]).push(c);},querySelector:()=>el(id+'_q'),classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},toggle(c,f){if(f===undefined)f=!e._cls.has(c);f?e._cls.add(c):e._cls.delete(c);return f;},contains(c){return e._cls.has(c);}}};Object.defineProperty(e,'onclick',{set(v){e._on.onclick=v;},get(){return e._on.onclick||null;},configurable:true});E[id]=e;return e;}
const win={};
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:2,addEventListener:(t,c)=>{(win[t]=win[t]||[]).push(c);},removeEventListener:()=>{},open:()=>{},AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}),createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}}),createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>({buffer:null,connect(){},start(){}}),createBiquadFilter:()=>({type:'',frequency:{value:0},connect(){}})};}};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){if(typeof this.onload==='function')this.onload();},configurable:true});};
global.navigator={share:null};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);}};
global.document={getElementById:el,addEventListener:(t,c)=>{(win[t]=win[t]||[]).push(c);}};
global.setTimeout=fn=>{try{fn();}catch(e){}return 0;};
global.requestAnimationFrame=cb=>{rafCbs.push(cb);return rafCbs.length;};

let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m);if(!c)fail++;}
try{eval(script);}catch(e){console.error('INIT ERROR',e.stack||e);process.exit(1);}

let t=0,frame=0;
function tick(){t+=16;frame++;const c=rafCbs;rafCbs=[];for(const cb of c)cb(t);}
function frames(n){for(let i=0;i<n;i++){try{tick();}catch(e){console.error('FRAME ERROR @'+frame+':',e.stack||e);process.exit(1);}}}
function cv(type,ev){const l=E['game']._h[type];if(l)for(const cb of l)cb(ev);}
function aimNearest(){const p=global.__pos();if(!p.length)return;p.sort((a,b)=>a.zz-b.zz);global.__aim(p[0].x,p[0].y);}

frames(6);
ok(!E['titleScreen']._cls.has('hidden'),'title visible at boot');
E['startBtn']._on.onclick();
cv('mousedown',{clientX:400,clientY:276});
ok(global.__dbg().state==='play','game enters play state');

// competent player: track nearest enemy, fire continuously
let maxWave=1, sawBoss=false, bossKilled=false, prevBoss=false;
for(let i=0;i<8000 && global.__dbg().state==='play';i++){
  aimNearest(); frames(1);
  const d=global.__dbg();
  maxWave=Math.max(maxWave,d.wave);
  if(d.boss) sawBoss=true;
  if(prevBoss && !d.boss && d.state==='play') bossKilled=true;
  prevBoss=d.boss;
  if(maxWave>=6 && bossKilled) break;
}
const mid=global.__dbg();
ok(mid.score>0,'score increases from kills ('+mid.score+')');
ok(mid.kills>10,'many enemies destroyed ('+mid.kills+')');
ok(maxWave>=5,'progressed to wave '+maxWave+' (>=5)');
ok(sawBoss,'boss wave appeared');
ok(bossKilled,'boss defeated');

// Now stop defending: don't aim, let enemies crash -> shield drains -> game over
cv('mouseup',{});
let died=false;
for(let i=0;i<4000;i++){ frames(1); if(global.__dbg().state==='over'){died=true;break;} }
ok(died,'game over when shield depletes');
ok(E['overScreen']._cls.has('hidden')===false,'game over screen shown');
ok(global.localStorage.getItem('coccoDiveHi')!==null,'hi-score saved to localStorage ('+global.localStorage.getItem('coccoDiveHi')+')');

// share + retry + pause should not throw
if(E['shareBtn']._h.click) E['shareBtn']._h.click.forEach(f=>f({}));
E['retryBtn']._on.onclick(); frames(60);
ok(global.__dbg().state==='play','retry restarts game');
const wh=win.keydown||[]; wh.forEach(f=>f({code:'KeyP',preventDefault(){}})); frames(3);
ok(global.__dbg().state==='pause','pause works'); wh.forEach(f=>f({code:'KeyP',preventDefault(){}}));

console.log('\nframes run: '+frame+'   '+(fail?(fail+' CHECK(S) FAILED'):'ALL CHECKS PASSED'));
process.exit(fail?1:0);
