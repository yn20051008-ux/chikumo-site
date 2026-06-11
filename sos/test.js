/* Headless test for COCCO SOS RESCUE RACER (gyro-controlled Z-axis chase racer).
   Stubs DOM/Canvas/Audio, drives the simulation via window.__sos, asserts
   crash/HP loss, shield consumption, near-miss bonus, emoji item pickups
   (⭐💎❤️⏰🛡️🌈🚀), black-cocco collision & fever smash, combo→fever trigger,
   gap-closing rescue event, time-limit & HP game-over paths, best persistence,
   and the 76.6% / 23.4% difficulty mix.  Run: node sos/test.js */
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
const G=window.__sos; if(!G){ console.error('hook missing'); process.exit(1); }

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
/* place a fresh entity directly in front of the player plane */
function forge(props){ for(const e of G.ents) e.alive=false;
  const e=Object.assign({alive:true,done:false,nx:0,z:10},props); G.ents.push(e); return e; }
function S(){ return G.get(); }

frames(5); ok(S().state==='menu','idle on menu before start');

/* startGame is async (gyro permission) — settle microtasks via setImmediate */
function start(cb){ G.startGame(); setImmediate(()=>{ G.noSpawn(); cb(); }); }

start(()=>{
ok(S().state==='play'&&S().score===0&&S().hp===3,'startGame resets state (❤️×3)');
ok(S().timeLeft===65&&S().gap===400&&S().rescued===0,'time limit 65s, rival gap 400m, no rescues yet');
frames(3); /* run a few real frames (draw + BGM scheduler must not throw) */

/* ─ 絵文字アイテム ─ */
let sc=S().score;
forge({type:'item',kind:'star',emoji:'⭐'}); G.update(0.05);
ok(S().score===sc+150&&S().combo===1,'⭐ star pickup +150, combo 1 (score='+S().score+')');
sc=S().score; forge({type:'item',kind:'gem',emoji:'💎'}); G.update(0.05);
ok(S().score===sc+500,'💎 gem pickup +500');
G.set({hp:2}); forge({type:'item',kind:'heart',emoji:'❤️'}); G.update(0.05);
ok(S().hp===3,'❤️ heart heals 2→3');
let t0=S().timeLeft; forge({type:'item',kind:'clock',emoji:'⏰'}); G.update(0.05);
ok(S().timeLeft>t0+2.5,'⏰ clock adds +3s');
forge({type:'item',kind:'shield',emoji:'🛡️'}); G.update(0.05);
ok(S().shield>6,'🛡️ shield pickup arms 8s shield');
G.set({shield:0});
sc=S().score; forge({type:'item',kind:'rocket',emoji:'🚀'}); G.update(0.05);
ok(S().boost>2&&S().score===sc+200,'🚀 rocket pickup +200 & boost (racing!)');
G.set({boost:0});
forge({type:'item',kind:'rainbow',emoji:'🌈'}); G.update(0.05);
ok(S().fever>0&&S().scoreMult===2,'🌈 rainbow triggers FEVER ×2');
G.set({fever:0,scoreMult:1});

/* ─ ニアミスボーナス(レーシングのスリル) ─ */
G.set({px:0,combo:0,invuln:0,kmh:300});
sc=S().score;
forge({type:'block',nx:.4,r:.3}); G.update(0.05);
ok(S().score===sc+50&&S().combo===1&&S().hp===3,'🚧 near-miss = +50 combo, no damage');

/* ─ クラッシュ: HP減 + ギャップペナルティ ─ */
G.set({invuln:0,kmh:300}); let g0=S().gap;
forge({type:'block',nx:0,r:.3}); G.update(0.05);
ok(S().hp===2&&S().combo===0,'🚧 head-on crash costs ❤️ and resets combo');
ok(S().gap>g0+15,'crash lets Black Cocco escape ~+20m (gap '+S().gap.toFixed(1)+')');
ok(S().kmh<200,'crash kills speed (kmh='+S().kmh.toFixed(0)+')');

/* ─ シールドはダメージを1回防ぐ ─ */
G.set({invuln:0,shield:5,kmh:300});
forge({type:'block',nx:0,r:.3}); G.update(0.05);
ok(S().hp===2&&S().shield===0,'🛡️ shield absorbs a crash and breaks');

/* ─ ブラックこっこちゃん ─ */
G.set({invuln:0,shield:0,fever:0,kmh:300});
forge({type:'black',nx:0,home:0,flap:0}); G.update(0.05);
ok(S().hp===1,'🖤 black cocco contact = crash');
G.set({invuln:0,fever:5,scoreMult:2,kmh:300});
sc=S().score;
let bk=forge({type:'black',nx:0,home:0,flap:0}); G.update(0.05);
ok(S().score===sc+800&&bk.alive===false&&S().hp===1,'fever smashes black cocco +400×2');
G.set({fever:0,scoreMult:1});

/* ─ コンボ10でフィーバー ─ */
G.set({combo:10,fever:0,scoreMult:1}); for(const e of G.ents)e.alive=false; G.update(0.016);
ok(S().fever>0&&S().scoreMult===2,'combo 10 auto-triggers 🌈 FEVER');
G.set({fever:0,scoreMult:1,combo:0});

/* ─ 救出イベント(レース勝利) ─ */
for(const e of G.ents)e.alive=false;
G.set({gap:1,kmh:500,invuln:0});
t0=S().timeLeft; sc=S().score;
G.update(0.05);
ok(S().rescued===1,'closing the gap rescues こっこちゃん!');
ok(S().score===sc+3000,'rescue pays +3000 bonus');
ok(S().timeLeft>t0+11,'rescue extends the clock +12s');
ok(S().gap>450&&S().cele>0,'next Black Cocco escapes & celebration plays');

/* ─ HP切れでゲームオーバー + ベスト保存 ─ */
G.set({invuln:0,shield:0,fever:0,hp:1,kmh:300,cele:0});
forge({type:'block',nx:0,r:.3}); G.update(0.05);
ok(S().state==='over','💔 last heart crash = game over');
ok(localStorage._d.sosBest===String(S().score),'best score persisted ('+localStorage._d.sosBest+')');
ok(localStorage._d.sosResc==='1','best rescue count persisted');

/* ─ タイムアップでゲームオーバー ─ */
start(()=>{
ok(S().state==='play'&&S().hp===3&&S().rescued===0,'retry resets the chase');
for(const e of G.ents)e.alive=false;
G.set({timeLeft:0.04});
G.update(0.05);
ok(S().state==='over','⏰ clock hitting zero ends the run');
ok(els['endReason'].textContent.indexOf('タイムアップ')>=0,'time-up reason shown');

/* ─ スポーン関数 ─ */
G.reset();
G.spawnBlock();
let nb=G.ents.filter(e=>e.alive&&e.type==='block').length;
ok(nb===3||nb===4,'🚧 barrier row spawns 3 (fair) or 4 (unfair) blocks (n='+nb+')');
G.reset(); G.spawnRock();
ok(G.ents.filter(e=>e.alive&&e.type==='rock').length===1,'☄️ rock spawns');
G.reset(); G.spawnItems();
ok(G.ents.filter(e=>e.alive&&e.type==='item').length>=1,'emoji item spawns');
G.reset(); G.spawnBlack();
let nk=G.ents.filter(e=>e.alive&&e.type==='black').length;
ok(nk===1||nk===2,'🖤 black cocco spawns 1 (fair) or 2 (unfair)');

/* ─ 76.6% / 23.4% 難易度ミックス ─ */
ok(G.CLEAR_RATE===0.766,'CLEAR_RATE is exactly 76.6%');
let fairN=0,N=3000;
for(let i=0;i<N;i++){ for(const e of G.ents)e.alive=false; G.spawnBlack();
  if(G.ents.filter(e=>e.alive&&e.type==='black').length===1)fairN++; }
const ratio=fairN/N;
ok(Math.abs(ratio-0.766)<0.04,'spawn fairness ≈76.6% (measured '+(ratio*100).toFixed(1)+'%)');
G.reset();
ok(G.ents.every(e=>!e.alive)&&S().rescued===0,'reset clears the world');

/* ─ 実フレーム耐久ソーク(スポーン有効のまま) ─ */
G.startGame(); setImmediate(()=>{
frames(240);
ok(S().state==='play','240 frames of full play (spawns+BGM+draw) render without error');
ok(S().distKm>0&&S().elapsed>3,'the racer actually races (dist '+S().distKm.toFixed(2)+'km)');

console.log(fail? '\n'+fail+' FAILURES':'\nALL TESTS PASSED');
process.exit(fail?1:0);
});
});
});
