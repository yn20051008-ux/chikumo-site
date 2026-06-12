/* Headless test for COCCO GP RESCUE (gyro-steered Z-axis rescue racing vs CPU).
   Stubs DOM/Canvas/Audio, drives the simulation via window.__gp, asserts
   gyro tilt steering (deviceorientation) + accelerometer fallback, shake
   detection & debounce, the 20-level CPU difficulty system (clamping,
   persistence, monotonic rival speed), catch-the-truck → shake → rescue /
   escape paths, crash → breakdown → shake-to-repair recovery, nitro launch,
   emoji item pickups (⭐💎🚀⏰🔧🛡️🧲🌈), magnet pull, shield, combo→fever,
   time-limit game over, best persistence, and the 76.6%/23.4% mix on both
   obstacle rows and truck cages.  Run: node gp/test.js */
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
  frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},
  delayTime:{value:0},type:'',buffer:null,...extra};return n;}
global.window={innerWidth:430,innerHeight:880,devicePixelRatio:2,
  AudioContext:function(){return{currentTime:0,state:'running',sampleRate:44100,destination:{},resume(){},suspend(){},
    createGain:()=>audioNode(),
    createOscillator:()=>audioNode(),
    createDelay:()=>audioNode(),
    createBiquadFilter:()=>audioNode(),
    createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
    createBufferSource:()=>audioNode(),
    createWaveShaper:()=>audioNode()};}};
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
const G=window.__gp; if(!G){ console.error('hook missing'); process.exit(1); }

let fr=0;
function tick(ms=16){ tNow+=ms; fr++; const c=raf; raf=[];
  for(const cb of c){ try{cb(tNow);}catch(e){ console.error('FRAME ERR @'+fr,e.stack||e); process.exit(1);} } }
function frames(n){ for(let i=0;i<n;i++) tick(); }
/* place a fresh entity directly in front of the player */
function forge(props){ for(const e of G.ents) e.alive=false;
  const e=Object.assign({alive:true,done:false,x:0,z:13,vx:0},props); G.ents.push(e); return e; }
function S(){ return G.get(); }

frames(5); ok(S().state==='menu','idle on menu before start');

/* ── CPU難易度 20段階 ── */
ok(G.LV_MAX===20,'CPU difficulty has exactly 20 levels');
G.setLv(0);  ok(S().lv===1,'level clamps low to Lv1');
G.setLv(99); ok(S().lv===20,'level clamps high to Lv20');
G.setLv(1);  const r1=G.rivalBase(), p1=G.playerMax();
G.setLv(20); const r20=G.rivalBase(), p20=G.playerMax();
ok(r20>r1,'Lv20 rival cruises faster than Lv1 ('+r1+' → '+r20+' km/h)');
ok(p20>p1&&p20>r20,'player top speed scales and stays above the rival cruise');
ok(localStorage.getItem('gpLv')==='20','difficulty level persists to localStorage');
G.setLv(7);

/* startGame is async (sensor permission) — settle microtasks via setImmediate */
function start(cb){ G.startGame(); setImmediate(()=>{ G.noSpawn(); G.set({goT:0}); cb(); }); }

start(()=>{
ok(S().state==='play'&&S().score===0&&S().hp===3&&S().timeLeft===60,'startGame resets state (60s, 🔧×3)');
ok(S().rescued===0&&S().missed===0&&!S().rescueMode&&!S().broken,'rescue/repair state starts clean');
ok(S().gap>300,'CPU truck starts well ahead (gap='+Math.round(S().gap)+'m)');
ok(S().nitroStock===1,'one starter 🚀 nitro in stock');

/* ── ジャイロ(傾け)ステアリング ── */
G.onOrient({gamma:5});                 /* 基準姿勢でキャリブレーション */
G.onOrient({gamma:18});                /* 右にかたむけ */
ok(S().orientSeen===true,'deviceorientation marks gyro as active');
ok(S().tilt>0.3,'gyro tilt-right steers right (tilt='+S().tilt.toFixed(2)+')');
G.set({spd:200});
const px0=S().px; frames(4);
ok(S().px>px0,'tilt moves the car across the road at speed');
G.onOrient({gamma:5});
/* ── 加速度センサーフォールバック(ジャイロ未使用時) ── */
G.reset(); G.set({state:'play',goT:0}); G.noSpawn();
G.onMotion({accelerationIncludingGravity:{x:0,y:-5,z:-8}});   /* iOS基準姿勢 */
G.onMotion({accelerationIncludingGravity:{x:3,y:-5,z:-8}});   /* 右にかたむけ */
ok(S().accSeen===true,'devicemotion marks accelerometer as active');

/* ── シェイク検出: 重力抜き加速度のスパイク＋デバウンス ── */
G.reset(); G.set({state:'play',goT:0,nitroStock:1,nitroT:0}); G.noSpawn();
G.onMotion({acceleration:{x:25,y:0,z:0}});
ok(S().nitroT>0&&S().nitroStock===0,'strong acceleration spike fires the 🚀 nitro shake');
const nt=S().nitroT;
G.onMotion({acceleration:{x:25,y:0,z:0}});
ok(S().nitroT===nt,'rapid double spike is debounced (230ms guard)');

/* ── 超スピード: ニトロが最高速を押し上げる ── */
G.set({spd:G.playerMax()});
tick();
ok(S().spd>G.playerMax(),'nitro pushes past normal top speed ('+Math.round(S().spd)+' km/h)');

/* ── クラッシュ → 3発でエンスト(breakdown) ── */
G.reset(); G.set({state:'play',goT:0,spd:250,invuln:0,celeT:0}); G.noSpawn();
forge({type:'obs',kind:'cone',emoji:'🚧'});
tick();
ok(S().hp===2,'🚧 obstacle crash costs 🔧 integrity');
ok(S().spd<200,'crash bleeds off speed');
G.set({invuln:0,spd:250}); forge({type:'obs',kind:'barrel',emoji:'🛢️'}); tick();
G.set({invuln:0,spd:250}); forge({type:'obs',kind:'bomb',emoji:'💣'}); tick();
ok(S().hp===0&&S().broken===true,'third crash breaks the car down (エンスト)');
ok(S().spd<=62,'breakdown caps speed to a crawl');

/* ── シェイクで車体修理(復旧作業) ── */
const need=S().repairNeed;
for(let i=0;i<need-1;i++)G.doShake();
ok(S().broken===true&&S().repairGot===need-1,'repair needs all '+need+' shakes');
G.doShake();
ok(S().broken===false&&S().hp===3,'final shake completes the repair (hp back to 3)');
ok(S().invuln>0,'fresh repair grants brief invulnerability');

/* ── エンスト中の追突: 1回目=破損悪化(+2シェイク) → 2回目=大破ゲームオーバー ── */
G.reset(); G.set({state:'play',goT:0,spd:250,invuln:0,celeT:0}); G.noSpawn();
G.set({broken:true,hp:0,brokenHits:0,repairNeed:5,repairGot:0,spd:60});
G.damage();
ok(S().broken===true&&S().state==='play','first hit while broken does not end the race');
ok(S().repairNeed===7&&S().brokenHits===1,'first hit while broken worsens damage (+2 shakes needed)');
G.damage();
ok(S().brokenHits===1,'invulnerability window blocks an instant second hit');
G.set({invuln:0});
G.damage();
ok(S().wrecked===true&&S().state==='over','second hit while broken wrecks the car — game over');
ok(el('endReason').textContent.includes('大破'),'wreck shows its own game-over reason');
G.reset();
ok(S().brokenHits===0&&S().wrecked===false&&S().repairNeed===5,'reset clears wreck state');
ok(S().hitStop===0&&S().slowmo===0,'reset clears hit-stop/slow-motion');

/* ── ゲームフィール: ヒットストップ＆スローモーション ── */
G.set({state:'play',goT:0,invuln:0,celeT:0,broken:false,hp:3,spd:250});
G.damage();
ok(S().hitStop>0,'crash triggers a hit-stop freeze');
G.set({hitStop:0,slowmo:0,invuln:0,broken:true,hp:0,brokenHits:0,repairNeed:5});
G.damage();
ok(S().slowmo>0,'worsening hit while broken triggers slow-motion');
G.reset();

/* ── 大破でもシールドは身代わりになる ── */
G.set({state:'play',goT:0,invuln:0,celeT:0,broken:true,brokenHits:1,shield:5});
G.damage();
ok(S().state==='play'&&S().shield===0&&S().brokenHits===1,'shield absorbs a would-be wrecking hit');
G.reset();

/* ── CPUトラック追跡 → 追いついてシェイク救出 ── */
G.reset(); G.set({state:'play',goT:0,spd:300}); G.noSpawn();
G.set({gap:10});
tick();
ok(!!S().rescueMode,'closing the gap opens SHAKE TIME on the truck');
const rn=S().rescueMode.need, t0=S().timeLeft, s0=S().score, round0=S().round;
for(let i=0;i<rn-1;i++)G.doShake();
ok(!!S().rescueMode&&S().rescueMode.got===rn-1,'cage survives until the last shake');
G.doShake();
ok(S().rescued===1&&!S().rescueMode,'final shake breaks the cage — こっこちゃん rescued!');
ok(S().score-s0>=2000,'rescue pays 2000+ streak bonus (got '+(S().score-s0)+')');
ok(S().timeLeft>t0+6,'rescue refunds ⏰+8s on the clock');
ok(S().round===round0+1&&S().gap>300,'next round starts with the truck further ahead');

/* ── シェイクタイム時間切れ → 逃走 ── */
G.noSpawn(); G.set({gap:10});
tick();
ok(!!S().rescueMode,'caught the round-2 truck');
G.set({hitStop:0,slowmo:0});   /* 救出演出のヒットストップを消化してから時間切れを検証 */
S().rescueMode.t=0.001;
tick();
ok(!S().rescueMode&&S().missed===1,'shake window expiry lets the truck escape (missed=1)');
ok(S().gap>200,'escaped truck sprints ahead again');
G.noSpawn();

/* ── 絵文字アイテム ── */
G.set({spd:0,invuln:0,celeT:0,fever:0,scoreMult:1});
function pick(kind,emoji,extra){ const e=forge(Object.assign({type:'item',kind,emoji},extra||{})); tick(); return e; }
let sc=S().score; pick('star','⭐');
ok(S().score===sc+150,'⭐ star +150');
sc=S().score; pick('gem','💎');
ok(S().score===sc+500,'💎 gem +500');
G.set({nitroStock:0}); pick('nitro','🚀');
ok(S().nitroStock===1,'🚀 pickup stocks a nitro');
const tl=S().timeLeft; pick('clock','⏰');
ok(S().timeLeft>tl+3,'⏰ clock adds +4s');
G.set({hp:2}); pick('wrench','🔧');
ok(S().hp===3,'🔧 wrench restores car integrity');
pick('shield','🛡️');
ok(S().shield>0,'🛡️ shield arms 8s barrier');
pick('magnet','🧲');
ok(S().magnet>0,'🧲 magnet arms 7s pull');
pick('rainbow','🌈');
ok(S().fever>0&&S().scoreMult===2,'🌈 rainbow starts FEVER ×2');

/* ── 🔫シューティング: 弾丸3発装填→発射→障害物を撃ち破壊 ── */
G.set({fever:0,scoreMult:1,hitStop:0,slowmo:0,invuln:0,celeT:0,px:0});
G.set({ammo:0}); pick('ammo','🔫');
ok(S().ammo===3,'🔫 ammo pickup loads 3 bullets');
G.set({ammo:2}); pick('ammo','🔫');
ok(S().ammo===5,'2 bullets + 🔫 pickup = 5 (stacks)');
pick('ammo','🔫');
ok(S().ammo===8,'5 bullets + 🔫 pickup = 8');
for(let i=0;i<4;i++)pick('ammo','🔫');
ok(S().ammo===20,'ammo stock has no cap');
G.set({ammo:0});
G.fire();
ok(G.shots.length===0,'firing with no ammo does nothing');
G.set({ammo:3,px:0,hitStop:0,slowmo:0});
G.fire();
ok(S().ammo===2&&G.shots.length===1,'fire spends a bullet and spawns a shot');
{ for(const e of G.ents)e.alive=false;
  const tgt={alive:true,done:false,x:0,z:600,vx:0,type:'obs',kind:'bomb',emoji:'💣'};
  G.ents.push(tgt);
  const sc=S().score;
  for(let i=0;i<40;i++){G.set({hitStop:0,slowmo:0,spd:0});G.update(0.016);if(!tgt.alive)break;}
  ok(tgt.alive===false,'shot blows up the 💣 bomb down the road');
  ok(G.shots.length===0,'shot is consumed on impact');
  ok(S().score>sc,'shooting a bomb pays points'); }
/* ── 近距離の障害物も撃てる(バンパー直前) ── */
G.set({ammo:3,px:0,hitStop:0,slowmo:0,spd:0});
{ for(const e of G.ents)e.alive=false;
  const near={alive:true,done:false,x:0,z:60,vx:0,type:'obs',kind:'cone',emoji:'🚧'};
  G.ents.push(near);
  G.fire(); G.set({hitStop:0,slowmo:0}); G.update(0.016); G.update(0.016);
  ok(near.alive===false,'point-blank obstacle (z=60) is shootable'); }
/* ── 超高速でもすり抜けない(スイープ判定) ── */
G.set({ammo:3,px:0,hitStop:0,slowmo:0,spd:2600,speedX:8,speedT:99});
{ for(const e of G.ents)e.alive=false;
  const far={alive:true,done:false,x:0,z:400,vx:0,type:'obs',kind:'barrel',emoji:'🛢️'};
  G.ents.push(far);
  G.fire();
  for(let i=0;i<14;i++){G.set({hitStop:0,slowmo:0,px:0});G.update(0.05);if(!far.alive)break;}
  ok(far.alive===false,'swept collision kills the target even at 2600km/h'); }
G.set({speedX:1,speedT:0,spd:0});
/* ── エイムアシスト: 少しズレてても吸い付いて当たる ── */
G.set({ammo:3,px:0,hitStop:0,slowmo:0});
{ for(const e of G.ents)e.alive=false;
  const off={alive:true,done:false,x:0.55,z:700,vx:0,type:'obs',kind:'cone',emoji:'🚧'};
  G.ents.push(off);
  G.fire();
  for(let i=0;i<60;i++){G.set({hitStop:0,slowmo:0,spd:0});G.update(0.016);if(!off.alive)break;}
  ok(off.alive===false,'aim assist curves the shot into an off-axis target'); }
/* ── 💣誘爆: 近くの障害物を連鎖で巻き込む ── */
G.set({ammo:3,px:0,hitStop:0,slowmo:0});
{ for(const e of G.ents)e.alive=false;
  const bomb={alive:true,done:false,x:0,z:500,vx:0,type:'obs',kind:'bomb',emoji:'💣'},
    chain={alive:true,done:false,x:0.4,z:560,vx:0,type:'obs',kind:'cone',emoji:'🚧'};
  G.ents.push(bomb,chain);
  const sc=S().score;
  G.fire();
  for(let i=0;i<40;i++){G.set({hitStop:0,slowmo:0,spd:0});G.update(0.016);if(!bomb.alive)break;}
  ok(bomb.alive===false&&chain.alive===false,'💣 blast chains into the nearby obstacle');
  ok(S().score-sc>=400,'bomb + chain pays 300+100'); }
/* ── 出現率: 🔫=全アイテムの約24%(さらに2倍) / ⏰=約1.8%(半減) ── */
{ let ammoN=0,clockN=0,totN=0;
  for(let i=0;i<8000;i++){ for(const e of G.ents)e.alive=false;
    G.spawnItems();
    for(const e of G.ents)if(e.alive&&e.type==='item'){totN++;
      if(e.kind==='ammo')ammoN++;if(e.kind==='clock')clockN++;} }
  const ra=ammoN/totN,rc=clockN/totN;
  ok(ra>.10&&ra<.17,'🔫 spawn rate doubled again (measured '+(ra*100).toFixed(1)+'% of items)');
  ok(rc>.008&&rc<.032,'⏰ spawn rate halved (measured '+(rc*100).toFixed(1)+'% of items)'); }
/* ── ⚡出現率: 2倍化(抽選内10%→20%)・🚀も復活していること ── */
{ let bN=0,nN=0,totN=0;
  for(let i=0;i<8000;i++){ for(const e of G.ents)e.alive=false;
    G.spawnItems();
    for(const e of G.ents)if(e.alive&&e.type==='item'){totN++;
      if(e.kind==='boost')bN++;if(e.kind==='nitro')nN++;} }
  const rb=bN/totN,rn=nN/totN;
  ok(rb>.05&&rb<.09,'⚡ spawn rate doubled (measured '+(rb*100).toFixed(1)+'% of items)');
  ok(rn>.04&&rn<.1,'🚀 nitro still spawns (measured '+(rn*100).toFixed(1)+'% of items)'); }
/* ── 🌈を減らして🔫を増やす(抽選内: 🌈3.5%→1.5% / 🔫40%→42%) ── */
{ let rN=0,aN=0,totN=0;
  for(let i=0;i<12000;i++){ for(const e of G.ents)e.alive=false;
    G.spawnItems();
    for(const e of G.ents)if(e.alive&&e.type==='item'){totN++;
      if(e.kind==='rainbow')rN++;if(e.kind==='ammo')aN++;} }
  const rr=rN/totN,ra2=aN/totN;
  ok(rr<.011,'🌈 spawn rate reduced (measured '+(rr*100).toFixed(2)+'% of items)');
  ok(ra2>.115&&ra2<.165,'🔫 spawn rate increased again (measured '+(ra2*100).toFixed(1)+'% of items)'); }
G.set({broken:true});
G.fire();
ok(S().ammo===2,'cannot fire while broken down');
G.set({broken:false});
/* ── 🎯ロックオン: 弾があれば進路上の障害物を捕捉 ── */
{ for(const e of G.ents)e.alive=false;
  G.ents.push({alive:true,done:false,x:0.2,z:400,vx:0,type:'obs',kind:'cone',emoji:'🚧'});
  G.set({ammo:2,px:0,hitStop:0,slowmo:0,spd:0});
  G.update(0.016);
  ok(S().lockOn===true,'reticle locks onto the obstacle ahead');
  G.set({ammo:0});
  G.update(0.016);
  ok(S().lockOn===false,'no ammo → no lock-on'); }
/* ── 3連続ヒットでバレットタイム ── */
G.set({ammo:9,px:0,hitStop:0,slowmo:0,spd:0,shotStreak:0});
{ for(let k=0;k<3;k++){
    for(const e of G.ents)e.alive=false;
    const tgt={alive:true,done:false,x:0,z:300,vx:0,type:'obs',kind:'cone',emoji:'🚧'};
    G.ents.push(tgt);
    G.fire();
    for(let i=0;i<40;i++){G.set({hitStop:0,spd:0});G.update(0.016);if(!tgt.alive)break;}
  }
  ok(S().shotStreak===3,'three kills in a row builds a 3-hit streak (got '+S().shotStreak+')');
  ok(S().slowmo>0,'3-hit streak triggers bullet time'); }
G.set({slowmo:0,hitStop:0});
G.reset();
ok(S().ammo===0&&G.shots.length===0,'reset clears ammo and shots');
G.set({state:'play',goT:0,invuln:0,celeT:0,fever:0,scoreMult:1,px:0});
G.noSpawn();

/* ── ⚡2倍加速アイテム: ×2→×4→×8スタック → 4枚目で速度超過大破 ── */
G.set({fever:0,scoreMult:1,speedX:1,speedT:0,hitStop:0,slowmo:0,invuln:0,celeT:0});
pick('boost','⚡');
ok(S().speedX===2&&S().speedT>0,'⚡ boost doubles speed (×2)');
G.set({hitStop:0,invuln:0}); pick('boost','⚡');
ok(S().speedX===4,'⚡ on ×2 stacks to ×4');
G.set({hitStop:0,invuln:0}); pick('boost','⚡');
ok(S().speedX===8,'⚡ on ×4 stacks to ×8 (max shift)');
G.set({spd:0,hitStop:0,slowmo:0,speedT:99,timeLeft:99,combo:0,fever:0,scoreMult:1});   /* 検証中にブースト/フィーバーが変動しないよう固定 */
{ const mx=G.playerMax()*8;
  for(let i=0;i<200;i++){G.set({px:0});G.update(0.05);}   /* コース中央固定(土の減速を排除) */
  ok(S().spd>G.playerMax()*4,'×8 boost pushes way past normal top speed ('+Math.round(S().spd)+' km/h)');
  ok(S().spd<=mx+90,'boosted speed still respects the ×8 ceiling'); }
G.set({hitStop:0,invuln:0,timeLeft:60,speedT:99,px:0}); pick('boost','⚡');
ok(S().wrecked===true&&S().overSpd===true&&S().state==='over','4th ⚡ at ×8 wrecks the car — overspeed game over');
ok(el('endReason').textContent.includes('速度超過'),'overspeed shows its own game-over reason');
G.reset();
ok(S().speedX===1&&S().speedT===0&&S().overSpd===false,'reset clears the ⚡ boost stack');

/* ── ⚡は時間切れで×1へ・クラッシュで解除 ── */
G.set({state:'play',goT:0,invuln:0,celeT:0,hitStop:0,slowmo:0,fever:0});
G.noSpawn();
pick('boost','⚡');
G.set({speedT:0.01,hitStop:0});
frames(3);
ok(S().speedX===1,'boost expires back to ×1');
pick('boost','⚡');
G.set({hitStop:0,invuln:0,spd:250});
forge({type:'obs',kind:'cone',emoji:'🚧'}); tick();
ok(S().speedX===1&&S().speedT===0,'crash cancels the ⚡ boost');
G.reset();

/* ── 🟤コースアウト: 急減速 → 2.5秒でエンスト → 計5秒で大破 ── */
G.set({state:'play',goT:0,invuln:0,celeT:0,hitStop:0,slowmo:0,fever:0,spd:300,px:1.4,timeLeft:99});
G.noSpawn();
for(let i=0;i<20;i++)G.update(0.05);   /* 土の上を1秒 */
ok(S().spd<120,'offroad dirt slams the speed down hard ('+Math.round(S().spd)+' km/h)');
ok(S().dirtT>0.8&&!S().broken,'dirt timer counts up while off course');
G.set({px:0});
for(let i=0;i<30;i++)G.update(0.05);   /* 道に戻って1.5秒 */
ok(S().dirtT<0.5,'returning to the road drains the dirt timer');
G.set({px:1.4,dirtT:0,spd:200});
for(let i=0;i<56;i++){G.set({hitStop:0,slowmo:0});G.update(0.05);}   /* 連続2.8秒 */
ok(S().broken===true&&S().state==='play','2.5s of dirt clogs the engine (breakdown, race continues)');
for(let i=0;i<50;i++){G.set({hitStop:0,slowmo:0});if(S().state!=='play')break;G.update(0.05);}
ok(S().wrecked===true&&S().mudWreck===true&&S().state==='over','5s of dirt wrecks the car — game over');
ok(el('endReason').textContent.includes('コースアウト'),'mud wreck shows its own game-over reason');
G.reset();
ok(S().dirtT===0&&S().mudWreck===false,'reset clears the dirt state');

/* ── 泥エンストを修理すれば泥カウントは仕切り直し ── */
G.set({state:'play',goT:0,invuln:0,celeT:0,hitStop:0,slowmo:0,px:1.4,dirtT:0,spd:200,timeLeft:99});
G.noSpawn();
for(let i=0;i<56;i++){G.set({hitStop:0,slowmo:0});G.update(0.05);}
ok(S().broken===true,'dirt breakdown re-armed for repair check');
{ const n=S().repairNeed; for(let i=0;i<n;i++)G.doShake(); }
ok(S().broken===false&&S().dirtT===0,'shake repair on dirt resets the dirt timer (fresh 2.5s)');
G.reset();
G.set({state:'play',goT:0,invuln:0,celeT:0,fever:0,scoreMult:1});
G.noSpawn();
G.set({fever:0,scoreMult:1});

/* ── 🧲マグネットが遠いアイテムを引き寄せる ── */
G.set({magnet:5,px:0});
const far=forge({type:'item',kind:'star',emoji:'⭐',z:200,x:.6});
const fx0=far.x; frames(3);
ok(far.x<fx0,'magnet pulls distant items toward the car');
G.set({magnet:0});

/* ── 🛡️シールドがクラッシュを身代わり ── */
G.set({invuln:0,celeT:0,shield:5,hp:3,spd:200});
forge({type:'obs',kind:'cone',emoji:'🚧'});
tick();
ok(S().hp===3&&S().shield===0,'shield absorbs one crash');

/* ── 🌈フィーバー中はノーダメージ ── */
G.set({invuln:0,celeT:0,fever:5,scoreMult:2,hp:3,spd:200});
forge({type:'obs',kind:'bomb',emoji:'💣'});
tick();
ok(S().hp===3,'fever shrugs off obstacles');
G.set({fever:0,scoreMult:1});

/* ── コンボ10でフィーバー ── */
G.set({fever:0,scoreMult:1,combo:10});
tick();
ok(S().fever>0&&S().scoreMult===2,'combo 10 auto-triggers FEVER');
G.set({fever:0,scoreMult:1});

/* ── 距離スコア(レーシング系) ── */
G.set({spd:360});
sc=S().score; const d0=S().dist;
frames(90);
ok(S().dist>d0,'the race piles up distance');
ok(S().score>sc,'distance pays score over time');

/* ── 時間切れ ── */
G.set({timeLeft:.01,hp:3});
for(const e of G.ents)e.alive=false;
tick();
ok(S().state==='over','time limit ends the race');
ok(el('endReason').textContent.includes('救出'),'result headlines the rescue count');

/* ── ベスト保存 & 76.6/23.4ミックス ── */
start(()=>{
  G.set({score:888888,timeLeft:.01});
  tick();
  ok(S().state==='over','second run ends');
  ok(localStorage.getItem('gpBest')==='888888','best score persists to localStorage');

  /* 障害物の列: 76.6%は2個(広いすきま) / 23.4%は3個(鬼) */
  let fairN=0,N=4000;
  for(let i=0;i<N;i++){
    for(const e of G.ents)e.alive=false;
    G.spawnObs();
    if(S().lastFair)fairN++;
    const cnt=G.ents.filter(e=>e.alive&&e.type==='obs').length;
    if(S().lastFair&&cnt!==2){ok(false,'fair row must spawn 2 obstacles (got '+cnt+')');break;}
    if(!S().lastFair&&cnt!==3){ok(false,'unfair row must spawn 3 obstacles (got '+cnt+')');break;}
  }
  let rate=fairN/N;
  ok(Math.abs(rate-G.CLEAR_RATE)<.04,'obstacle row mix ≈76.6% fair (measured '+(rate*100).toFixed(1)+'%)');

  /* トラックの檻: 76.6%は4シェイク / 23.4%は6シェイク (Lv<15) */
  G.setLv(7);
  let fairCage=0;
  for(let i=0;i<N;i++){ G.spawnTruck(); if(S().truckFair)fairCage++; }
  rate=fairCage/N;
  ok(Math.abs(rate-G.CLEAR_RATE)<.04,'truck cage mix ≈76.6% fair (measured '+(rate*100).toFixed(1)+'%)');
  G.spawnTruck();
  ok(G.CLEAR_RATE===0.766,'CLEAR_RATE constant is exactly 76.6%');

  /* Lv15+は檻が1段かたくなる */
  G.setLv(15);
  let mx=0; for(let i=0;i<200;i++){ G.spawnTruck(); mx=Math.max(mx,S().rescueNeed); }
  ok(mx===7,'Lv15+ cages need an extra shake (max '+mx+')');
  G.setLv(7);

  console.log(fail? '\n'+fail+' FAILURES' : '\nALL TESTS PASSED');
  process.exit(fail?1:0);
});
});
