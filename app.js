/* Mobile Sangam — app.js (Staged Advice + Score Cap + PDF Fix)
   Changes:
   - Names allow spaces (A–Z and space), auto Uppercase
   - Harmony Score hard-capped to 88 (never reaches 89–100)
   - PDF export: full report capture with pagebreak options
   - Staged UI: First shows Ring + Small Advice only, with "Show Big Result" button;
                clicking it reveals Big Advice + Remedies.
*/
const MS = (()=>{
  const qs=(s)=>document.querySelector(s);
  const on=(el,ev,fn)=>el&&el.addEventListener(ev,fn);
  const fetchJSON=async(p)=>{const r=await fetch(p,{cache:'no-store'}); if(!r.ok) throw new Error('Load fail '+p); return r.json();};
  const strip=(s,cs=[])=>cs.reduce((t,c)=>t.split(c).join(''), s||'');
  const digits=(s)=>(s||'').replace(/\D+/g,'');
  const onlyAZSpace=(s)=>(s||'').replace(/[^A-Za-z ]/g,'').toUpperCase();
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const reduce19=(n)=>{n=Math.abs(Number(n)||0);while(n>9)n=String(n).split('').reduce((a,d)=>a+Number(d),0);return n===0?9:n;};
  const naamank=(name)=>{const c=onlyAZSpace(name); const mv=(ch)=> ch===' ' ? 0 : (((ch.charCodeAt(0)-64-1)%9)+1); return reduce19(c.split('').reduce((a,ch)=>a+mv(ch),0));};
  const yogank=(d)=>reduce19((d||'').split('').reduce((a,x)=>a+Number(x),0));
  const lastNZ=(d)=>{for(let i=(d||'').length-1;i>=0;i--){if(d[i]!=='0')return Number(d[i]);}return 9;};
  const sanyukt=(m,y)=>Number(`${m}${y}`);

  const S={lang:'en', relation:'HUSBAND_WIFE', iso2:'IN', ui:null, country:null, advice:null, stage:0, cIndex:[], showFull:false};
  const LANG=()=>S.lang||'en';
  const FOOTER='Dr. Yogesh Bhardwaj — Astro Scientist • www.sinaank.com • Decode Your Destiny Digitally.';

  const lockSelectors=(lock)=>{ ['langSelect','relationSelect','countrySelect'].forEach(id=>{ const el=document.getElementById(id); if(el) el.disabled=!!lock; }); };

  const bindNameGuards=()=>{
    ['nameA','nameB'].forEach(id=>{
      const el=document.getElementById(id); if(!el) return;
      el.setAttribute('autocomplete','off');
      el.addEventListener('input',()=>{ el.value = onlyAZSpace(el.value); });
      el.addEventListener('paste',(e)=>{ e.preventDefault(); el.value = onlyAZSpace(e.clipboardData.getData('text')||''); });
    });
  };
  const bindMobileGuards=()=>{
    ['mobileA','mobileB'].forEach(id=>{
      const el=document.getElementById(id); if(!el) return;
      el.setAttribute('inputmode','numeric'); el.setAttribute('autocomplete','off');
      el.addEventListener('input',()=>{
        el.value = digits(el.value||'');
        const max=S.country?.mobile?.maxLen || 15; if(el.value.length>max) el.value = el.value.slice(0,max);
      });
      el.addEventListener('paste',(e)=>{ e.preventDefault(); const t=digits(e.clipboardData.getData('text')||''); const max=S.country?.mobile?.maxLen||15; el.value=t.slice(0,max); });
    });
  };
  const syncMobileAttrs=()=>{
    const min=S.country?.mobile?.minLen||10, max=S.country?.mobile?.maxLen||10;
    ['mobileA','mobileB'].forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.setAttribute('maxlength', String(max)); el.setAttribute('placeholder', `Enter ${min}-${max} digits`); });
  };

  const populateCountries=()=>{
    const sel=qs('#countrySelect'); if(!sel) return;
    const keep = sel.value || S.iso2; sel.innerHTML='';
    (S.cIndex||[]).forEach(it=>{ const o=document.createElement('option'); o.value=it.code; o.textContent=it.label; sel.appendChild(o); });
    sel.value = (S.cIndex.find(x=>x.code===keep)?.code) || (S.cIndex[0]?.code||'IN'); S.iso2 = sel.value;
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
  const setStage=(n)=>{ S.stage=n; const sec=document.getElementById('inputSection'); if(sec) sec.classList.toggle('hidden', n===0); };

  const warn=(t)=>{ const w=qs('#warnings'); if(w){ w.textContent=t||''; w.classList.toggle('hidden', !t);} };

  const loadAll=async()=>{
    const lang=qs('#langSelect')?.value||S.lang; const relation=qs('#relationSelect')?.value||S.relation; const iso2=qs('#countrySelect')?.value||S.iso2;
    S.lang=lang; S.relation=relation; S.iso2=iso2;
    const bust=`?_=${Date.now()}`;
    const ui=await fetchJSON(`/config/languages/${lang}.json${bust}`);
    const country=await fetchJSON(`/config/countries/${S.iso2}.json${bust}`);
    let adv;
    try{ adv=await fetchJSON(`/config/advice/${lang}/${relation}.json${bust}`); }
    catch(_){ adv={ small:(LANG()==='en'?'Balanced outlook — keep communicating.':'सामान्य संतुलन — संवाद रखें।'), big:(LANG()==='en'?'Minor differences may arise; patience and clarity build harmony.':'कुछ बातों में मतभेद सम्भव हैं; धैर्य रखें।'), remedy:(LANG()==='en'?'Meditate or pray together once a week.':'सप्ताह में एक बार साथ प्रार्थना करें।') }; }
    if (adv && !adv.small && adv.details && adv.details.summary) adv.small = adv.details.summary;
    if (adv && !adv.big && adv.details && adv.details.sinaankInsight) adv.big = adv.details.sinaankInsight;
    S.ui = ui?.ui ? { ...ui.ui, titles: ui.titles, relations: ui.relations||ui.ui?.relations } : ui;
    S.country=country; S.advice=adv;
    localStorage.setItem('ms_last', JSON.stringify({lang,relation,iso2:S.iso2}));
    bindUI(); syncMobileAttrs();
  };

  const calcPair=({nameA,nameB,mA,mB})=>{
    const A={ naamank:naamank(nameA), yogank:yogank(mA), mobank:lastNZ(mA) };
    const B={ naamank:naamank(nameB), yogank:yogank(mB), mobank:lastNZ(mB) };
    let score=100; score-=Math.abs(A.naamank-B.naamank)*8; score-=Math.abs(A.yogank-B.yogank)*5;
    score = clamp(Math.round(score),0,88); // hard cap at 88
    return {A,B, sanyuktankA:sanyukt(A.mobank,A.yogank), sanyuktankB:sanyukt(B.mobank,B.yogank), harmonyScore:score};
  };

  const ring=(score)=>{ const pct=clamp(score,0,100); const ang=(pct/100)*180, r=64,cx=80,cy=80; const ex=cx+r*Math.cos(Math.PI-(ang*Math.PI/180)); const ey=cy-r*Math.sin(Math.PI-(ang*Math.PI/180)); return `<svg width="160" height="100" viewBox="0 0 160 100"><path d="M ${cx-r} ${cy} A ${r} ${r} 0 1 1 ${cx+r} ${cy}" fill="none" stroke-width="10" stroke="#eee"></path><path d="M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}" fill="none" stroke-width="10" stroke="#3b82f6" stroke-linecap="round"></path><text x="80" y="70" text-anchor="middle" font-size="20" font-weight="700">${pct}</text></svg>`; };

  const render=(calc,adv,showFull)=>{
    const ui=S.ui||{}; const el=qs('#reportContainer'); if(!el) return;
    const bigBlock = showFull ? `
      <div class="p-3 rounded border mb-3">
        <div class="font-semibold mb-2">${LANG()==='en'?'Big Advice':'विस्तृत सलाह'}</div>
        <div>${adv.big||''}</div>
      </div>
      <div class="p-3 rounded border">
        <div class="font-semibold mb-2">${LANG()==='en'?'Remedies':'उपाय'}</div>
        <div>${adv.remedy||''}</div>
      </div>`
      : `<div class="text-center mt-3">
          <button id="bigBtn" class="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2 rounded-lg shadow">
            ${LANG()==='en'?'Show Big Result':'बड़ा परिणाम दिखाएँ'}
          </button>
        </div>`;

    const cta = `<div class="mt-4 text-center">
      <a href="https://sinaank.com/dist/#/purchase?report=diamond" target="_blank"
         class="inline-block bg-yellow-400 hover:bg-yellow-300 text-black font-semibold px-4 py-2 rounded-lg shadow">
         Get Full Diamond Report (₹551)
      </a>
    </div>`;

    el.innerHTML=`<div class="ms-report p-4 rounded-xl shadow bg-white text-black">
      <div class="text-xl font-bold">${ui.headings?.appTitle||'Mobile Sangam'}</div>
      <div class="text-sm opacity-70">${ui.titles?.subTitle||'Mobank • Yogank • Sanyuktank'}</div>
      <div class="grid md:grid-cols-2 gap-4 my-4">
        <div class="p-3 rounded border">
          <div class="font-semibold mb-1">Person A</div>
          <div>Mobank: <strong>${calc.A.mobank}</strong></div>
          <div>Yogank: <strong>${calc.A.yogank}</strong></div>
          <div>Naamank: <strong>${calc.A.naamank}</strong></div>
          <div>Sanyuktank: <strong>${calc.sanyuktankA}</strong></div>
        </div>
        <div class="p-3 rounded border">
          <div class="font-semibold mb-1">Person B</div>
          <div>Mobank: <strong>${calc.B.mobank}</strong></div>
          <div>Yogank: <strong>${calc.B.yogank}</strong></div>
          <div>Naamank: <strong>${calc.B.naamank}</strong></div>
          <div>Sanyuktank: <strong>${calc.sanyuktankB}</strong></div>
        </div>
      </div>
      <div class="my-3 flex flex-col items-center">${ring(calc.harmonyScore)}<div class="text-center text-sm mt-1">Harmony Score</div></div>
      <div class="p-3 rounded border mb-3">
        <div class="font-semibold mb-2">${LANG()==='en'?'Small Advice':'सार सलाह'}</div>
        <div>${adv.small||''}</div>
      </div>
      ${bigBlock}
      ${cta}
      <div class="mt-6 text-center text-xs opacity-80">${FOOTER}</div>
    </div>`;
  };

  const exportPDF=async()=>{
    const node = qs('.ms-report'); // capture exact report card
    if(!node){ alert(LANG()==='en'?'Please generate the report first.':'पहले रिपोर्ट जनरेट करें।'); return; }
    const nA=(qs('#nameA')?.value||'A').toUpperCase().replace(/[^A-Z ]/g,'').trim().replace(/\s+/g,'_');
    const nB=(qs('#nameB')?.value||'B').toUpperCase().replace(/[^A-Z ]/g,'').trim().replace(/\s+/g,'_');
    const fname=`MobileSangam_${S.relation||'REL'}_${nA}_x_${nB}_${S.iso2||'XX'}.pdf`;
    const opt={
      margin:[8,8,10,8],
      filename:fname,
      image:{type:'jpeg',quality:0.98},
      html2canvas:{scale:2,useCORS:true,logging:false, windowWidth: 900},
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
      pagebreak:{ mode:['css','legacy'] }
    };
    try{ await window.html2pdf().set(opt).from(node).save(); }catch(e){ console.error(e); alert('PDF export failed.'); }
  };

  const start=async()=>{ await loadCountriesIndex(); await loadAll(); S.showFull=false; setStage(1); lockSelectors(true); };
  const generate=()=>{
    const nA=onlyAZSpace(qs('#nameA')?.value||''), nB=onlyAZSpace(qs('#nameB')?.value||'');
    const mA=digits(strip(qs('#mobileA')?.value||'', S.country?.mobile?.strip||[]));
    const mB=digits(strip(qs('#mobileB')?.value||'', S.country?.mobile?.strip||[]));
    if(!nA.trim()||!nB.trim()) return warn(LANG()==='en'?'Enter valid names (A–Z, spaces)':'वैध नाम लिखें (A–Z, space)');
    const min=S.country?.mobile?.minLen||10, max=S.country?.mobile?.maxLen||10;
    if(!(mA.length>=min && mA.length<=max) || !(mB.length>=min && mB.length<=max)) return warn(LANG()==='en'?'Invalid mobile number for selected country':'चयनित देश के अनुसार मोबाइल अमान्य');
    if(mA===mB) return warn(LANG()==='en'?'Both mobiles cannot be the same.':'दोनों मोबाइल एक समान नहीं हो सकते।');
    warn(''); const calc=calcPair({nameA:nA,nameB:nB,mA,mB}); S.showFull=false; render(calc,S.advice,S.showFull); setStage(2);
  };
  const restart=()=>{ setStage(0); lockSelectors(false); ['#nameA','#nameB','#mobileA','#mobileB'].forEach(i=>{const e=qs(i); if(e) e.value='';}); qs('#reportContainer')&&(qs('#reportContainer').innerHTML=''); warn(''); };

  // Delegated click for "Show Big Result"
  document.addEventListener('click',(e)=>{
    if(e.target && e.target.id==='bigBtn'){
      S.showFull=true;
      // Recompute current values and re-render with full blocks
      const nA=onlyAZSpace(qs('#nameA')?.value||''), nB=onlyAZSpace(qs('#nameB')?.value||'');
      const mA=digits(qs('#mobileA')?.value||''), mB=digits(qs('#mobileB')?.value||'');
      const calc=calcPair({nameA:nA,nameB:nB,mA,mB});
      render(calc,S.advice,true);
    }
  });

  // Countries index
  const loadCountriesIndex=async()=>{
    try{ S.cIndex = await fetchJSON(`/config/countries/_index.json?_=${Date.now()}`); }
    catch(e){ S.cIndex=[{code:'IN',label:'India (+91)'},{code:'US',label:'USA (+1)'}]; }
    populateCountries();
  };

  document.addEventListener('DOMContentLoaded',async()=>{
    // Preload
    try{ S.cIndex = await fetchJSON(`/config/countries/_index.json?_=${Date.now()}`);}catch(e){ S.cIndex=[{code:'IN',label:'India (+91)'},{code:'US',label:'USA (+1)'}]; }
    populateCountries();
    await loadAll();
    bindNameGuards();
    bindMobileGuards();
    on(qs('#startBtn'),'click',start);
    on(qs('#generateBtn'),'click',generate);
    on(qs('#exportBtn'),'click',exportPDF);
    on(qs('#restartBtn'),'click',restart);
    on(qs('#countrySelect'),'change', async (e)=>{ S.iso2=e.target.value; await loadAll(); });
    on(qs('#relationSelect'),'change', async (e)=>{ S.relation=e.target.value; await loadAll(); });
    on(qs('#langSelect'),'change', async (e)=>{ S.lang=e.target.value; await loadAll(); });
  });
  return { state:S };
})();