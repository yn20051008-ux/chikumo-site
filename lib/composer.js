const $=s=>document.querySelector(s);
async function loadSVG(u){const r=await fetch(u);return new DOMParser().parseFromString(await r.text(),"image/svg+xml").documentElement}
async function compose(p={}){const bg=p.bg||"#fff7f0";document.body.style.background=bg;const s=$("#stage");s.innerHTML="";
const base=await loadSVG("parts/base/hen_base.svg");
const eyes=await loadSVG("parts/eyes/"+(p.eyes||"open")+".svg");
const beak=await loadSVG("parts/beak/"+(p.beak||"neutral")+".svg");
const brow=await loadSVG("parts/brows/"+(p.brow||"none")+".svg");
[base,eyes,beak,brow].forEach(el=>{el.setAttribute("viewBox","0 0 1000 1000");el.setAttribute("width","1000");el.setAttribute("height","1000")});
[base,eyes,beak,brow].forEach(el=>[...el.children].forEach(n=>s.appendChild(n.cloneNode(true))));
}
window.addEventListener("DOMContentLoaded",()=>compose(Object.fromEntries(new URLSearchParams(location.search))))
