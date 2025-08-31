const NS="http://www.w3.org/2000/svg";
const $=s=>document.querySelector(s);
async function load(u){const r=await fetch(u);return new DOMParser().parseFromString(await r.text(),"image/svg+xml").documentElement}
function fitAdd(stage,svg){
  const vb=(svg.getAttribute("viewBox")||"0 0 "+(svg.getAttribute("width")||1000)+" "+(svg.getAttribute("height")||1000)).split(/[ ,]+/).map(parseFloat);
  const w=vb[2]||1000,h=vb[3]||1000,s=1000/Math.max(w,h),tx=(1000-w*s)/2,ty=(1000-h*s)/2;
  const g=document.createElementNS(NS,"g");g.setAttribute("transform",`translate(${tx},${ty}) scale(${s})`);
  while(svg.firstChild) g.appendChild(svg.firstChild); stage.appendChild(g);
}
async function compose(p={}){
  const s=$("#stage"); s.innerHTML="";
  const q=Object.fromEntries(new URLSearchParams(location.search));
  const base=await load("parts/base/hen_base.svg");
  fitAdd(s,base);
  if(base.getAttribute("data-full")==="1"||q.solo==="1") return;
  const eyes=await load("parts/eyes/"+(q.eyes||"open")+".svg");
  const beak=await load("parts/beak/"+(q.beak||"neutral")+".svg");
  const brow=await load("parts/brows/"+(q.brow||"none")+".svg");
  [eyes,beak,brow].forEach(el=>fitAdd(s,el));
}
window.addEventListener("DOMContentLoaded",()=>compose());
