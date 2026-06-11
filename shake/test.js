/* Headless test for COCCO SHAKE RESCUE (accelerometer-controlled Z-axis rescue).
   Stubs DOM/Canvas/Audio, drives the simulation via window.__shake, asserts
   accelerometer steering (iOS/Android gravity-sign handling), shake detection,
   shockwave clearing, cage catch → shake-time → rescue/escape paths,
   emoji item pickups (⭐💎❤️⏰🛡️🧲🌈), magnet pull, black-cocco collision &
   fever smash, combo→fever trigger, time-limit & HP game-over paths, best
   persistence, and the 76.6% / 23.4% difficulty mix.  Run: node shake/test.js */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function ctxStub(){const g={addColorStop(){}};return new Proxy({},{get(t,p){
  if(/createLinear|createRadial/.test(p))return()=>g; return ()=>{};}});}
const els={};
function el(id){ if(els[id])return els[id]; const e={id,style:{},textContent:'',_cls:new Set(),
  classList:{add(c){e._cls.add(c);},remove(c){e._cls.delete(c);},contains(c){return e._cls.has(c);}},
  addEventListener(){}, getContext:()=>ctxStub(), width:0, height:0};
  els[id]=e; return e; }
function audioNode(extra){const n={connect(){return n;},start(){},stop(){},
  gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},
  frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
  delayTime:{value:0},type:'',buffer:null,...extra};return n;}
global.window={innerWidth:430,innerHeight:880,devicePixelRatio:2,
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},suspend(){},
    createGain:()=>audioNode(),
    createOscillator:()=>audioNode(),
    createDelay:()=>audioNode(),
    createBiquadFilter:()=>audioNode(),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>audioNode()};}};
global.AudioContext=global.window.AudioContext;
global.CanvasRenderingContext2D=function(){};
global.innerWidth=430; global.innerHeight=880; global.devicePixelRatio=2;
global.addEventListener=()=>{};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);}};
global.document={getElementById:el,addEventListener(){},hidden:false,
  createElement:()=>({width:0,height:0,getContext:()=>ctxStub()})};
global.Image=function(){this.onload=null;Object.defineProperty(this,'src',{set(){if(this.onload)this.onload();}});};
let raf=[]; global.requestAnimationFrame=cb=>{raf.push(cb);};
global.getComputedStyle=()=>({getPropertyValue:()=>''});

var tNow=0;
let fail=0; function ok(c,m){console.log((c?'  ok  ':'  FAIL')+' '+m); if(!c)fail++;}
try{ eval(script); }catch(e){ console.error('INIT ERROR',e.stack||e); process.exit(1); }
const G=window.__shake; if(!G){ console.error('hook missing'); process.exit(1); }

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
/* place a fresh entity directly in front of the player plane */
function forge(props){ for(const e of G.ents) e.alive=false;
  const e=Object.assign({alive:true,done:false,nx:0,ny:0,z:10},props); G.ents.push(e); return e; }
function S(){ return G.get(); }

frames(5); ok(S().state==='menu','idle on menu before start');

/* startGame is async (motion permission) — settle microtasks via setImmediate */
function start(cb){ G.startGame(); setImmediate(()=>{ G.noSpawn(); cb(); }); }

start(()=>{
ok(S().state==='play'&&S().score===0&&S().hp===3&&S().timeLeft===60,'startGame resets state (60s, ❤️×3)');
ok(S().rescued===0&&S().missed===0&&!S().shakeMode,'rescue counters and shake-time start clean');

/* ── 加速度センサー操縦: iOS(重力 -9.8系)とAndroid(反力 +9.8系)で同方向 ── */
G.onMotion({accelerationIncludingGravity:{x:0,y:-5,z:-8}});        /* iOS基準姿勢 */
G.onMotion({accelerationIncludingGravity:{x:3,y:-5,z:-8}});        /* 右にかたむけ */
ok(S().accSeen===true,'devicemotion marks accelerometer as active');
ok(S().tpx>0.3,'iOS-style gravity tilt-right steers right (tpx='+S().tpx.toFixed(2)+')');
G.set({tpx:0,tpy:0});
/* キャリブレーションし直してAndroid系 */
G.reset(); G.set({state:'play'}); G.noSpawn();
G.onMotion({accelerationIncludingGravity:{x:0,y:5,z:8}});          /* Android基準姿勢 */
G.onMotion({accelerationIncludingGravity:{x:-3,y:5,z:8}});         /* 右にかたむけ(反力系) */
ok(S().tpx>0.3,'Android-style reaction tilt-right also steers right (tpx='+S().tpx.toFixed(2)+')');

/* ── シェイク検出: 重力抜き加速度のスパイクで発火 ── */
G.reset(); G.set({state:'play'}); G.noSpawn();
const bA=forge({type:'black',z:600,nx:.5,ny:0,home:0,flap:0});
const bB=forge.call; /* keep single forge; add second manually */
const e2={alive:true,done:false,type:'mine',z:500,nx:-.5,ny:0,r:.16,ph:0}; G.ents.push(e2);
G.onMotion({acceleration:{x:25,y:0,z:0}});
ok(S().waveCD>0,'strong acceleration spike triggers shake shockwave');
ok(!bA.alive&&!e2.alive,'shockwave wipes black cocco and mines on screen');
ok(S().score>0,'shockwave kills award score');
const cdBefore=S().waveCD;
G.onMotion({acceleration:{x:25,y:0,z:0}});
ok(S().waveCD===cdBefore,'rapid double spike is debounced (240ms guard)');
G.doShake();
ok(S().waveCD===cdBefore,'shockwave respects cooldown');

/* ── 檻キャッチ → シェイクタイム → 救出 ── */
G.reset(); G.set({state:'play'}); G.noSpawn();
let cage=forge({type:'cage',z:130,nx:0,ny:0,need:3,got:0,tough:false,ph:0,drift:0});
tick();
ok(!!S().shakeMode,'aligned cage crossing the catch plane opens SHAKE TIME');
ok(S().shakeMode&&S().shakeMode.e===cage,'shake-time tracks the caught cage');
const t0=S().timeLeft, s0=S().score;
G.doShake(); G.doShake();
ok(cage.got===2&&!!S().shakeMode,'two shakes crack but do not break a 3-shake cage');
G.doShake();
ok(S().rescued===1&&!S().shakeMode&&!cage.alive,'third shake breaks the cage — こっこちゃん rescued!');
ok(S().score-s0>=1000,'rescue pays 1000+ streak bonus (got '+(S().score-s0)+')');
ok(S().timeLeft>t0+1,'rescue refunds ⏰+2s on the clock');

/* ── シェイクタイム時間切れ → 連れていかれる ── */
cage=forge({type:'cage',z:130,nx:0,ny:0,need:3,got:0,tough:false,ph:0,drift:0});
tick();
ok(!!S().shakeMode,'second cage caught');
S().shakeMode.t=0.001;
tick();
ok(!S().shakeMode&&S().missed===1&&!cage.alive,'shake window expiry loses the cage (missed=1)');

/* ── 位置ずれ檻 → にがした ── */
cage=forge({type:'cage',z:130,nx:.9,ny:.9,need:3,got:0,tough:false,ph:0,drift:0});
G.set({combo:5});
tick();
ok(!S().shakeMode&&S().missed===2&&S().combo===0,'misaligned cage escapes and resets combo');

/* ── 強化檻(23.4%側)は5シェイク ── */
cage=forge({type:'cage',z:130,nx:0,ny:0,need:5,got:0,tough:true,ph:0,drift:0});
tick();
for(let i=0;i<4;i++)G.doShake();
ok(!!S().shakeMode&&cage.got===4,'tough cage survives 4 shakes');
G.doShake();
ok(S().rescued===2&&!S().shakeMode,'5th shake cracks the reinforced cage');

/* ── フィーバー中の檻は一撃 ── */
G.set({fever:5});
cage=forge({type:'cage',z:130,nx:0,ny:0,need:3,got:0,tough:false,ph:0,drift:0});
tick();
G.doShake();
ok(S().rescued===3,'fever turns any cage into a 1-shake break');
G.set({fever:0,scoreMult:1});

/* ── 絵文字アイテム ── */
function pick(kind,emoji){ const e=forge({type:'item',kind,emoji,z:100}); tick(); return e; }
let sc=S().score; pick('star','⭐');
ok(S().score===sc+150,'⭐ star +150');
sc=S().score; pick('gem','💎');
ok(S().score===sc+500,'💎 gem +500');
G.set({hp:2}); pick('heart','❤️');
ok(S().hp===3,'❤️ heart heals to 3');
const tl=S().timeLeft; pick('clock','⏰');
ok(S().timeLeft>tl+3,'⏰ clock adds +4s');
pick('shield','🛡️');
ok(S().shield>0,'🛡️ shield arms 8s barrier');
pick('magnet','🧲');
ok(S().magnet>0,'🧲 magnet arms 7s pull');
pick('rainbow','🌈');
ok(S().fever>0&&S().scoreMult===2,'🌈 rainbow starts FEVER ×2');
G.set({fever:0,scoreMult:1});

/* ── 🧲マグネットが遠いアイテムを引き寄せる ── */
G.set({magnet:5,px:0,py:0});
const far=forge({type:'item',kind:'star',emoji:'⭐',z:600,nx:.6,ny:0});
const nx0=far.nx; frames(3);
ok(far.nx<nx0,'magnet pulls distant items toward the player');
G.set({magnet:0});

/* ── ブラックこっこ: 直撃ダメージ / フィーバー撃破 ── */
G.set({invuln:0,shield:0,fever:0,hp:3,combo:4});
forge({type:'black',z:100,nx:0,ny:0,home:0,flap:0});
tick();
ok(S().hp===2&&S().combo===0,'black cocco hit costs ❤️ and combo');
G.set({invuln:0,fever:5});
sc=S().score;
forge({type:'black',z:100,nx:0,ny:0,home:0,flap:0});
tick();
ok(S().hp===2&&S().score>sc,'fever smashes black cocco for points instead');
G.set({fever:0,scoreMult:1});

/* ── 💣機雷ダメージ ── */
G.set({invuln:0,shield:0,hp:3});
forge({type:'mine',z:10,nx:0,ny:0,r:.16,ph:0});
tick();
ok(S().hp===2,'💣 mine collision costs ❤️');

/* ── 🛡️シールド: ブラックは撃破・機雷は身代わり ── */
G.set({invuln:0,shield:6,hp:2,fever:0});
sc=S().score;
forge({type:'black',z:100,nx:0,ny:0,home:0,flap:0});
tick();
ok(S().hp===2&&S().score>sc&&S().shield>0&&S().shield<6,'shield smashes black cocco at a 2s cost');
G.set({invuln:0,shield:5,hp:2});
forge({type:'mine',z:10,nx:0,ny:0,r:.16,ph:0});
tick();
ok(S().hp===2&&S().shield===0,'shield absorbs a mine hit');

/* ── コンボ10でフィーバー ── */
G.set({fever:0,scoreMult:1,combo:10});
tick();
ok(S().fever>0&&S().scoreMult===2,'combo 10 auto-triggers FEVER');
G.set({fever:0,scoreMult:1});

/* ── 時間切れ ── */
G.set({timeLeft:.01,hp:3});
for(const e of G.ents)e.alive=false;
tick();
ok(S().state==='over','time limit ends the run');
ok(el('endReason').textContent.includes('タイムアップ'),'time-up reason shown');

/* ── HP切れ & ベスト保存 ── */
start(()=>{
  G.set({score:777777,invuln:0});
  G.damage(); G.set({invuln:0}); G.damage(); G.set({invuln:0}); G.damage();
  ok(S().state==='over','3 hits end the run');
  ok(el('endReason').textContent.includes('HP'),'hp-zero reason shown');
  ok(localStorage.getItem('shakeBest')==='777777','best score persists to localStorage');

  /* ── 76.6% / 23.4% 難易度ミックス ── */
  let fairN=0,N=4000;
  for(let i=0;i<N;i++){
    for(const e of G.ents)e.alive=false;
    G.spawnCage();
    const c=G.ents.find(e=>e.alive&&e.type==='cage');
    if(c.need===3)fairN++;
  }
  const rate=fairN/N;
  ok(Math.abs(rate-G.CLEAR_RATE)<.04,'cage difficulty mix ≈76.6% fair (measured '+(rate*100).toFixed(1)+'%)');
  ok(G.CLEAR_RATE===0.766,'CLEAR_RATE constant is exactly 76.6%');

  console.log(fail? '\n'+fail+' FAILURES' : '\nALL TESTS PASSED');
  process.exit(fail?1:0);
});
});
