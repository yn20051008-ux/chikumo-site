const NS="http://www.w3.org/2000/svg";
const $=s=>document.querySelector(s);

async function load(u){
  const r=await fetch(u);
  return new DOMParser().parseFromString(await r.text(),"image/svg+xml").documentElement;
}

function injectStyles(stage, svg){
  svg.querySelectorAll('style').forEach(st=>{
    const t=document.createElementNS(NS,'style');
    t.textContent=st.textContent;
    stage.appendChild(t);
  });
}

/* svgをフラットに<g>へ展開して1000x1000へフィット */
function fitAdd(stage, svg){
  const vbStr=svg.getAttribute('viewBox');
  let w=+svg.getAttribute('width')||0, h=+svg.getAttribute('height')||0;
  let vb=[0,0,w,h];
  if(vbStr){ vb=vbStr.split(/[ ,]+/).map(parseFloat); w=vb[2]; h=vb[3]; }
  if(!w||!h){ w=1000; h=1000; vb=[0,0,w,h]; }

  const s=1000/Math.max(w,h), tx=(1000-w*s)/2, ty=(1000-h*s)/2;

  const g=document.createElementNS(NS,'g');
  g.setAttribute('transform',`translate(${tx},${ty}) scale(${s})`);

  const defs=svg.querySelector('defs'); if(defs) g.appendChild(defs.cloneNode(true));
  injectStyles(stage, svg);

  [...svg.childNodes].forEach(n=>{
    if(n.nodeType!==1) return;
    const nm=n.nodeName.toLowerCase();
    if(nm==='style'||nm==='defs'||nm==='title'||nm==='desc'||nm==='metadata') return;
    g.appendChild(n.cloneNode(true));
  });

  stage.appendChild(g);
  return g;
}

/* 背景白を複数枚まとめて削除（白ハイライトは残す） */
function removeBackdrops(group){
  if(!group) return;

  // グループの実寸（ステージ座標）でしきい値を決める
  let gb={x:0,y:0,width:1000,height:1000};
  try{ gb=group.getBBox(); }catch(e){}
  const GAREA=Math.max(1, gb.width*gb.height);

  const nearWhite = f=>{
    if(!f||f==='none') return false;
    f=f.toLowerCase().trim();
    let r,g,b;
    if(f.startsWith('#')){
      const hex=f.length===4 ? "#"+[f[1],f[1],f[2],f[2],f[3],f[3]].join("") : f;
      r=parseInt(hex.slice(1,3),16); g=parseInt(hex.slice(3,5),16); b=parseInt(hex.slice(5,7),16);
    }else if(f.startsWith('rgb')){
      const m=f.match(/\d+/g)||[]; r=+m[0]; g=+m[1]; b=+m[2];
    }else return false;
    return (r>245 && g>245 && b>245);
  };
  const touchesEdge = bb=>{
    const eps=1;
    return (
      bb.x<=gb.x+eps ||
      bb.y<=gb.y+eps ||
      (bb.x+bb.width)>=gb.x+gb.width-eps ||
      (bb.y+bb.height)>=gb.y+gb.height-eps
    );
  };

  // ループで「でかい白」を削り切る
  let safety=0;
  while(safety++<10){
    const cand=[];
    group.querySelectorAll('path,rect,circle,ellipse,polygon,polyline').forEach(el=>{
      let cs; try{ cs=getComputedStyle(el); }catch(e){ cs=null; }
      const fill=cs?.fill ?? el.getAttribute('fill') ?? '';
      const op = parseFloat(cs?.fillOpacity ?? cs?.opacity ?? '1');
      if(op<0.02) return;
      if(!nearWhite(fill)) return;
      try{
        const bb=el.getBBox();
        const area=bb.width*bb.height;
        const BIG_MAIN = GAREA*0.18; // 本体の18%以上なら背景候補
        const BIG_EDGE = GAREA*0.08; // 端に接して10%以上でも候補
        if(area>=BIG_MAIN || (area>=BIG_EDGE && touchesEdge(bb))){
          cand.push({el,area});
        }
      }catch(e){}
    });

    if(!cand.length) break;
    cand.sort((a,b)=>b.area-a.area);
    const biggest=cand[0].area;
    // 重ね白パッチ（ほぼ同じ面積）をまとめて削除
    cand.forEach(c=>{ if(c.area >= biggest*0.95) c.el.remove(); });
  }
}

async function compose(){
  const stage=$("#stage"); stage.innerHTML="";
  const base=await load("parts/base/hen_base.svg");
  const baseGroup=fitAdd(stage, base);

  removeBackdrops(baseGroup);       // ← 背景白をまとめて除去
  stage.querySelectorAll('#bgWhite').forEach(n=>n.remove()); // 手動IDも尊重

  const q=Object.fromEntries(new URLSearchParams(location.search));
  if(base.getAttribute("data-full")==="1" || q.solo==="1") return;

  const eyes=await load("parts/eyes/"+(q.eyes||"open")+".svg");  fitAdd(stage, eyes);
  const beak=await load("parts/beak/"+(q.beak||"neutral")+".svg");fitAdd(stage, beak);
  const brow=await load("parts/brows/"+(q.brow||"none")+".svg");  fitAdd(stage, brow);
}

window.addEventListener("DOMContentLoaded", compose);
