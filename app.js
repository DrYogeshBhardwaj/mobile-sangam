/* Mobile Sangam — app.js (Countries Auto-Load) */
const MS = (()=>{
  const qs=(s)=>document.querySelector(s);
  const on=(el,ev,fn)=>el&&el.addEventListener(ev,fn);
  const fetchJSON=async(p)=>{const r=await fetch(p,{cache:'no-store'}); if(!r.ok) throw new Error('Load fail '+p); return r.json();};
  const strip=(s,cs=[])=>cs.reduce((t,c)=>t.split(c).join(''), s||'');
  const digits=(s)=>(s||'').replace(/\D+/g,'');
  const onlyAZ=(s)=>(s||'').replace(/[^A-Za-z]/g,'').toUpperCase();
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const reduce19=(n)=>{n=Math.abs(Number(n)||0);while(n>9)n=String(n).split('').reduce((a,d)=>a+Number(d),0);return n===0?9:n;};
  const naamank=(name)=>{const c=onlyAZ(name); const mv=(ch)=>((ch.charCodeAt(0)-64-1)%9)+1; return reduce19(c.split('').reduce((a,ch)=>a+mv(ch),0));};
  const yogank=(d)=>reduce19((d||'').split('').reduce((a,x)=>a+Number(x),0));
  const lastNZ=(d)=>{for(let i=(d||'').length-1;i>=0;i--){if(d[i]!=='0')return Number(d[i]);}return 9;};
  const sanyukt=(m,y)=>Number(`${m}${y}`);

  const S={lang:'en', relation:'HUSBAND_WIFE', iso2:'IN', ui:null, country:null, advice:null, stage:0, cIndex:[]};
  const LANG=()=>S.lang||'en';
  const FOOTER='Dr. Yogesh Bhardwaj — Astro Scientist • www.sinaank.com • Decode Your Destiny Digitally.';

  const populateCountries=()=>{
    const sel=qs('#countrySelect'); if(!sel) return;
    const keep = sel.value || S.iso2;
    sel.innerHTML='';
    (S.cIndex||[]).forEach(it=>{ const o=document.createElement('option'); o.value=it.code; o.textContent=it.label; sel.appendChild(o); });
    sel.value = (S.cIndex.find(x=>x.code===keep)?.code) || (S.cIndex[0]?.code||'IN');
    S.iso2 = sel.value;
  };

  const bindUI=()=>{
    const ui=S.ui||{};
    qs('#uiAppTitle')&&(qs('#uiAppTitle').textContent=ui.headings?.appTitle||'Mobile Sangam');
    qs('#uiSubtitle')&&(qs('#uiSubtitle').textContent=ui.titles?.subTitle||'Mobank • Yogank • Sanyuktank');
    const relSel=qs('#relationSelect');
    if(relSel && (ui.relations||ui.ui?.relations)){
      const relMap=ui.relations||ui.ui?.relations||{}; const cur=relSel.value||S.relation;
      relSel.innerHTML='';
      const ph=document.createElement('option'); ph.value=''; ph.textContent=LANG()==='en'?'-- Select Relation --':'— संबंध चुनें —'; relSel.appendChild(ph);
      Object.keys(relMap).forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=relMap[k]; relSel.appendChild(o); });
      relSel.value=cur;
    }
    qs('#isdBadgeA')&&(qs('#isdBadgeA').textContent=S.country?.isd||'');
    qs('#isdBadgeB')&&(qs('#isdBadgeB').textContent=S.country?.isd||'');
  };

  const setStage=(n)=>{S.stage=n; const sec=document.getElementById('inputSection'); if(sec) sec.classList.toggle('hidden', n===0);};

  const loadCountriesIndex=async()=>{
    try{ S.cIndex = await fetchJSON(`/config/countries/_index.json?_=${Date.now()}`); }catch(e){ S.cIndex=[{code:'IN',label:'India (+91)'},{code:'US',label:'USA (+1)'}]; }
    populateCountries();
  };

  const loadAll=async()=>{
    const lang=qs('#langSelect')?.value||S.lang; const relation=qs('#relationSelect')?.value||S.relation; const iso2=qs('#countrySelect')?.value||S.iso2;
    S.lang=lang; S.relation=relation; S.iso2=iso2;
    const bust=`?_=${Date.now()}`;
    const ui=await fetchJSON(`/config/languages/${lang}.json${bust}`);
    const country=await fetchJSON(`/config/countries/${S.iso2}.json${bust}`);
    let adv; try{ adv=await fetchJSON(`/config/advice/${lang}/${relation}.json${bust}`);}catch(_){adv={small:'Balanced outlook — keep communicating.', big:'Minor differences may arise; patience and clarity build harmony.', remedy:'Meditate or pray together once a week.'};}
    S.ui = ui?.ui ? { ...ui.ui, titles: ui.titles, relations: ui.relations||ui.ui?.relations } : ui;
    S.country=country; S.advice=adv;
    localStorage.setItem('ms_last', JSON.stringify({lang,relation,iso2:S.iso2}));
    bindUI();
  };

  const normMob=(raw)=>digits(strip(raw||'', S.country?.mobile?.strip||[]));
  const validMob=(d)=>{ const L=(d||'').length; const m=S.country?.mobile||{}; return L>=(m.minLen||10)&&L<=(m.maxLen||10); };
  const warn=(t)=>{ const w=qs('#warnings'); if(w){ w.textContent=t||''; w.classList.toggle('hidden', !t);} };

  const calcPair=({nameA,nameB,mA,mB})=>{
    const A={ naamank:naamank(nameA), yogank:yogank(mA), mobank:lastNZ(mA) };
    const B={ naamank:naamank(nameB), yogank:yogank(mB), mobank:lastNZ(mB) };
    const score=(()=>{ let s=100; s-=Math.abs(A.naamank-B.naamank)*8; s-=Math.abs(A.yogank-B.yogank)*5; return clamp(Math.round(s),0,100); })();
    return {A,B, sanyuktankA:sanyukt(A.mobank,A.yogank), sanyuktankB:sanyukt(B.mobank,B.yogank), harmonyScore:score};
  };

  const ring=(score)=>{ const pct=clamp(score,0,100); const ang=(pct/100)*180, r=64,cx=80,cy=80; const ex=cx+r*Math.cos(Math.PI-(ang*Math.PI/180)); const ey=cy-r*Math.sin(Math.PI-(ang*Math.PI/180)); return `<svg width="160" height="100" viewBox="0 0 160 100"><path d="M ${cx-r} ${cy} A ${r} ${r} 0 1 1 ${cx+r} ${cy}" fill="none" stroke-width="10" stroke="#eee"></path><path d="M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}" fill="none" stroke-width="10" stroke="#3b82f6" stroke-linecap="round"></path><text x="80" y="70" text-anchor="middle" font-size="20" font-weight="700">${pct}</text></svg>`; };

  const render=(calc,adv)=>{
    const ui=S.ui||{}; const el=qs('#reportContainer'); if(!el) return;
    el.innerHTML=`<div class="ms-report p-4 rounded-xl shadow bg-white text-black"><div class="text-xl font-bold">${ui.headings?.appTitle||'Mobile Sangam'}</div><div class="text-sm opacity-70">${ui.titles?.subTitle||'Mobank • Yogank • Sanyuktank'}</div><div class="grid md:grid-cols-2 gap-4 my-4"><div class="p-3 rounded border"><div class="font-semibold mb-1">Person A</div><div>Mobank: <strong>${calc.A.mobank}</strong></div><div>Yogank: <strong>${calc.A.yogank}</strong></div><div>Naamank: <strong>${calc.A.naamank}</strong></div><div>Sanyuktank: <strong>${calc.sanyuktankA}</strong></div></div><div class="p-3 rounded border"><div class="font-semibold mb-1">Person B</div><div>Mobank: <strong>${calc.B.mobank}</strong></div><div>Yogank: <strong>${calc.B.yogank}</strong></div><div>Naamank: <strong>${calc.B.naamank}</strong></div><div>Sanyuktank: <strong>${calc.sanyuktankB}</strong></div></div></div><div class="my-3 flex flex-col items-center">${ring(calc.harmonyScore)}<div class="text-center text-sm mt-1">Harmony Score</div></div><div class="p-3 rounded border mb-3"><div class="font-semibold mb-2">Small Advice</div><div>${adv.small||''}</div></div><div class="p-3 rounded border mb-3"><div class="font-semibold mb-2">Big Advice</div><div>${adv.big||''}</div></div><div class="p-3 rounded border"><div class="font-semibold mb-2">Remedies</div><div>${adv.remedy||''}</div></div><div class="mt-6 text-center text-xs opacity-80">${FOOTER}</div></div>`;
  };

  const start=async()=>{ await loadCountriesIndex(); await loadAll(); setStage(1); };
  const generate=()=>{
    const nA=onlyAZ(qs('#nameA')?.value||''), nB=onlyAZ(qs('#nameB')?.value||'');
    const mA=normMob(qs('#mobileA')?.value||''), mB=normMob(qs('#mobileB')?.value||'');
    if(!nA||!nB) return warn('Enter valid names (A–Z only)');
    if(!validMob(mA)||!validMob(mB)) return warn('Invalid mobile number for selected country');
    warn(''); const calc=calcPair({nameA:nA,nameB:nB,mA,mB}); render(calc,S.advice); setStage(2);
  };
  const restart=()=>{ setStage(0); ['#nameA','#nameB','#mobileA','#mobileB'].forEach(i=>{const e=qs(i); if(e) e.value='';}); qs('#reportContainer')&&(qs('#reportContainer').innerHTML=''); };

  document.addEventListener('DOMContentLoaded',()=>{
    on(qs('#startBtn'),'click',start);
    on(qs('#generateBtn'),'click',generate);
    on(qs('#restartBtn'),'click',restart);
    on(qs('#countrySelect'),'change', async (e)=>{ S.iso2=e.target.value; await loadAll(); });
    on(qs('#relationSelect'),'change', async (e)=>{ S.relation=e.target.value; await loadAll(); });
    on(qs('#langSelect'),'change', async (e)=>{ S.lang=e.target.value; await loadAll(); });
    // preload minimal to render countries quickly
    loadCountriesIndex();
  });
  return { state:S };
})();