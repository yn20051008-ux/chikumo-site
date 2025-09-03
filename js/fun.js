(() => {
  const DOC = document;
  const emojis = ['🎉','✨','🎈','💫','🥳','🐔','🌈','⭐️','🍀','🎵'];
  const confColors = ['#ff477e','#ffd166','#06d6a0','#118ab2','#ef476f','#8338ec'];
  const rand=(a,b)=>a+Math.random()*(b-a);
  const pick=a=>a[(Math.random()*a.length)|0];
  const scheduleFloaters=n=>{for(let i=0;i<n;i++) setTimeout(spawnFloater,i*350)};
  function spawnFloater(){
    const el=DOC.createElement('div');
    el.className='floater'; el.textContent=pick(emojis);
    el.style.setProperty('--x', `${rand(0, window.innerWidth-20)}px`);
    el.style.animationDuration=`${rand(6,12)}s`; el.style.animationDelay=`${rand(0,2)}s`;
    DOC.body.appendChild(el); el.addEventListener('animationend',()=>el.remove());
  }
  function sparkle(x,y){
    const el=DOC.createElement('div'); el.className='sparkle'; el.textContent=pick(['✨','✦','✧','•']);
    el.style.setProperty('--x',`${x}px`); el.style.setProperty('--y',`${y}px`);
    el.style.setProperty('--dx',`${rand(-20,20)}px`); el.style.setProperty('--dy',`${rand(-30,-10)}px`);
    DOC.body.appendChild(el); el.addEventListener('animationend',()=>el.remove());
  }
  function confetti(x,y,amount=40){
    for(let i=0;i<amount;i++){
      const p=DOC.createElement('div'); p.className='confetti-piece'; p.style.background=pick(confColors);
      p.style.borderRadius=Math.random()<.4?'8px':'2px'; p.style.setProperty('--sx',`${x}px`); p.style.setProperty('--sy',`${y}px`);
      p.style.setProperty('--dx',`${rand(-160,160)}px`); p.style.setProperty('--dy',`${rand(120,320)}px`);
      p.style.setProperty('--rot',`${rand(-90,90)}deg`); p.style.setProperty('--dur',`${rand(900,1500)}ms`);
      DOC.body.appendChild(p); p.addEventListener('animationend',()=>p.remove());
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.body.classList.add('fun-bg'); scheduleFloaters(10);
    const party=document.getElementById('btn-party'); const surprise=document.getElementById('btn-surprise');
    party&&party.addEventListener('click',()=>scheduleFloaters(18));
    surprise&&surprise.addEventListener('click',()=>{const cx=innerWidth/2,cy=innerHeight/2;confetti(cx,cy,90)});
    let last=0; window.addEventListener('pointermove',e=>{const t=performance.now(); if(t-last>60){sparkle(e.clientX,e.clientY); last=t;}},{passive:true});
    window.addEventListener('click',e=>confetti(e.clientX,e.clientY),{passive:true});
  });
})();

