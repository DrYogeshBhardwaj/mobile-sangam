/* Mobile Sangam — Stable Display (No PDF) */
const MS = (()=>{
  const qs=(s)=>document.querySelector(s);
  const on=(el,ev,fn)=>el&&el.addEventListener(ev,fn);
  const fetchJSON=async(p)=>{const r=await fetch(p,{cache:'no-store'}); if(!r.ok) throw new Error('Load fail '+p); return r.json();};
  const digits=(s)=>(s||'').replace(/\D+/g,'');
  const onlyAZSpace=(s)=>(s||'').replace(/[^A-Za-z ]/g,'').toUpperCase();
  const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  const reduce19=(n)=>{n=Math.abs(Number(n)||0);while(n>9)n=String(n).split('').reduce((a,d)=>a+Number(d),0);return n===0?9:n;};
  const mapLetterVal=(ch)=> ch===' ' ? 0 : (((ch.charCodeAt(0)-64-1)%9)+1);
  const naamankVal=(name)=>{const c=onlyAZSpace(name); return reduce19(c.split('').reduce((a,ch)=>a+mapLetterVal(ch),0));};
  const yogankVal=(d)=>reduce19((d||'').split('').reduce((a,x)=>a+Number(x),0));
  const lastNZ=(d)=>{for(let i=(d||'').length-1;i>=0;i--){if(d[i]!=='0')return Number(d[i]);}return 9;};
  const sanyukt=(m,y)=>Number(`${m}${y}`);

  const S={lang:'en', relation:'HUSBAND_WIFE', iso2:'IN', ui:null, country:null, advice:null, cIndex:[], showFull:false};

  const showRestart=(show)=>{ const r=qs('#restartBtn'); if(r){ r.classList.toggle('hidden', !show); } };
  const lockSelectors=(lock)=>{ ['langSelect','relationSelect','countrySelect'].forEach(id=>{ const el=document.getElementById(id); if(el) el.disabled=!!lock; }); };
  const lockInputs=(lock)=>{ ['nameA','nameB','mobileA','mobileB','generateBtn'].forEach(id=>{ const el=document.getElementById(id); if(!el) return; if(id==='generateBtn'){ el.disabled=!!lock; el.classList.toggle('opacity-60', !!lock); el.classList.toggle('pointer-events-none', !!lock);} else { el.readOnly=!!lock; el.disabled=!!lock; el.classList.toggle('bg-gray-200', !!lock);} }); };

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
    const sel=document.getElementById('countrySelect'); if(!sel) return;
    const keep = sel.value || S.iso2; sel.innerHTML='';
    (S.cIndex||[]).forEach(it=>{ const o=document.createElement('option'); o.value=it.code; o.textContent=it.label; sel.appendChild(o); });
    sel.value = (S.cIndex.find(x=>x.code===keep)?.code) || (S.cIndex[0]?.code||'IN'); S.iso2 = sel.value;
  };

  const bindUI=()=>{
    const ui=S.ui||{};
    qs('#uiAppTitle')&&(qs('#uiAppTitle').textContent=(ui.headings?.appTitle||'Mobile Sangam'));
    qs('#uiSubtitle')&&(qs('#uiSubtitle').textContent=(S.ui?.titles?.subTitle||'Mobank • Yogank • Sanyuktank'));
    const relSel=document.getElementById('relationSelect');
    if(relSel && (ui.relations||ui.ui?.relations)){
      const relMap=ui.relations||ui.ui?.relations||{}; const cur=relSel.value||S.relation;
      relSel.innerHTML='';
      const ph=document.createElement('option'); ph.value=''; ph.textContent=S.lang==='en'?'-- Select Relation --':'— संबंध चुनें —'; relSel.appendChild(ph);
      Object.keys(relMap).forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=relMap[k]; relSel.appendChild(o); });
      relSel.value=cur;
    }
    const a=document.getElementById('isdBadgeA'), b=document.getElementById('isdBadgeB');
    if(a) a.textContent = S.country?.isd||'';
    if(b) b.textContent = S.country?.isd||'';
  };

  const warn=(t)=>{ const w=qs('#warnings'); if(w){ w.textContent=t||''; w.classList.toggle('hidden', !t);} };

  const loadAll=async()=>{
    const lang=document.getElementById('langSelect')?.value||S.lang;
    const relation=document.getElementById('relationSelect')?.value||S.relation;
    const iso2=document.getElementById('countrySelect')?.value||S.iso2;
    S.lang=lang; S.relation=relation; S.iso2=iso2;
    const bust=`?_=${Date.now()}`;
    const ui=await fetchJSON(`config/languages/${lang}.json${bust}`);
    const country=await fetchJSON(`config/countries/${S.iso2}.json${bust}`);
    let adv;
    try{ adv=await fetchJSON(`config/advice/${lang}/${relation}.json${bust}`); }
    catch(_){ adv={ small:(S.lang==='en'?'Balanced outlook — keep communicating.':'सामान्य संतुलन — संवाद रखें।'), big:(S.lang==='en'?'Minor differences may arise; patience and clarity build harmony.':'कुछ बातों में मतभेद सम्भव हैं; धैर्य रखें।'), remedy:(S.lang==='en'?'Meditate or pray together once a week.':'सप्ताह में एक बार साथ प्रार्थना करें।') }; }
    S.ui = ui?.ui ? { ...ui.ui, titles: ui.titles, relations: ui.relations||ui.ui?.relations } : ui;
    S.country=country; S.advice=adv;
    bindUI(); syncMobileAttrs();
  };

  const calcPair=({nameA,nameB,mA,mB})=>{
    const A={ naamank:naamankVal(nameA), yogank:yogankVal(mA), mobank:lastNZ(mA) };
    const B={ naamank:naamankVal(nameB), yogank:yogankVal(mB), mobank:lastNZ(mB) };
    let score=100; score-=Math.abs(A.naamank-B.naamank)*8; score-=Math.abs(A.yogank-B.yogank)*5;
    score = clamp(Math.round(score),0,88);
    return {A,B, sanyuktankA:sanyukt(A.mobank,A.yogank), sanyuktankB:sanyukt(B.mobank,B.yogank), harmonyScore:score, naamankDiff:Math.abs(A.naamank-B.naamank), yogankDiff:Math.abs(A.yogank-B.yogank)};
  };

  const ring=(score)=>{ const pct=clamp(score,0,100); const ang=(pct/100)*180, r=64,cx=80,cy=80; const ex=cx+r*Math.cos(Math.PI-(ang*Math.PI/180)); const ey=cy-r*Math.sin(Math.PI-(ang*Math.PI/180)); return `<svg width="160" height="100" viewBox="0 0 160 100"><path d="M ${cx-r} ${cy} A ${r} ${r} 0 1 1 ${cx+r} ${cy}" fill="none" stroke-width="10" stroke="#eee"></path><path d="M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}" fill="none" stroke-width="10" stroke="#3b82f6" stroke-linecap="round"></path><text x="80" y="70" text-anchor="middle" font-size="20" font-weight="700">${pct}</text></svg>`; };

  const helpLines=(lang)=>{
    if(lang==='hi'){
      return [
        '<strong>• मोबांक</strong> = मोबाइल नंबर का आख़िरी non‑zero अंक (0 मान्य नहीं).',
        '<strong>• योगांक</strong> = मोबाइल के सभी अंकों का योग → 1–9 में संक्षेप.',
        '<strong>• नामांक</strong> = नाम (A–Z) के 1–9 चक्र का योग → 1–9 में संक्षेप.',
        '<strong>• संयुक्‍तांक</strong> = मोबांक और योगांक का <u>संगलन</u> (जोड़ नहीं; जैसे 5 व 3 ⇒ 53).'
      ];
    }
    return [
      '<strong>• Mobank</strong> = last non‑zero digit of the mobile (0 ignored).',
      '<strong>• Yogank</strong> = sum of all digits → reduced to 1–9.',
      '<strong>• Naamank</strong> = letter values (A–Z cycle 1–9) → reduced to 1–9.',
      '<strong>• Sanyuktank</strong> = <u>concatenation</u> of Mobank & Yogank (not addition; e.g., 5 & 3 ⇒ 53).'
    ];
  };

  const derivationBlock=(label, name, mobile)=>{
    const letters = onlyAZSpace(name).replace(/\s+/g,'').split('');
    const nums    = letters.map(mapLetterVal);
    const sum     = nums.reduce((a,b)=>a+b,0);
    const nred    = reduce19(sum);
    const digs    = digits(mobile).split('').map(x=>Number(x));
    const ysum    = digs.reduce((a,b)=>a+b,0);
    const yred    = reduce19(ysum);
    const j = (arr,sep='+')=>arr.join(` ${sep} `);
    return `<div class="rounded p-3 bg-gray-50">
      <div class="font-semibold mb-1">${label}</div>
      <div class="text-sm"><em>${name}</em></div>
      <div class="text-xs mt-1">• ${j(letters,'+')}</div>
      <div class="text-xs">= ${j(nums,'+')} = <strong>${sum}</strong> ⇒ <strong>${nred}</strong></div>
      <div class="text-xs mt-2"><em>${mobile}</em></div>
      <div class="text-xs">• ${j(digs,'+')}</div>
      <div class="text-xs">= <strong>${ysum}</strong> ⇒ <strong>${yred}</strong></div>
    </div>`;
  };

  const calcTable=(c)=>{
    const nameA=(qs('#nameA')?.value||'A').trim().toUpperCase();
    const nameB=(qs('#nameB')?.value||'B').trim().toUpperCase();
    const mobA=(qs('#mobileA')?.value||'').trim();
    const mobB=(qs('#mobileB')?.value||'').trim();
    const lines = helpLines(S.lang).map(t=>`<div class="text-xs">${t}</div>`).join('');
    return `<div class="p-3 rounded border mt-3">
      <div class="font-semibold mb-2">${S.lang==='hi'?'गणनाएँ':'Calculations'}</div>
      <div class="mb-2 pl-1 space-y-0.5">${lines}</div>
      <div class="grid md:grid-cols-2 gap-3">
        ${derivationBlock(S.lang==='hi'?'व्यक्ति A':'Person A', nameA, mobA)}
        ${derivationBlock(S.lang==='hi'?'व्यक्ति B':'Person B', nameB, mobB)}
      </div>
      <div class="mt-3 grid md:grid-cols-2 gap-3">
        <div class="rounded p-2 border">
          <div class="font-semibold mb-1">${S.lang==='hi'?'परिणाम (A)':'Computed (A)'}</div>
          <div>Mobank: <strong>${c.A.mobank}</strong></div>
          <div>Yogank: <strong>${c.A.yogank}</strong></div>
          <div>Naamank: <strong>${c.A.naamank}</strong></div>
          <div>Sanyuktank: <strong>${c.sanyuktankA}</strong></div>
        </div>
        <div class="rounded p-2 border">
          <div class="font-semibold mb-1">${S.lang==='hi'?'परिणाम (B)':'Computed (B)'}</div>
          <div>Mobank: <strong>${c.B.mobank}</strong></div>
          <div>Yogank: <strong>${c.B.yogank}</strong></div>
          <div>Naamank: <strong>${c.B.naamank}</strong></div>
          <div>Sanyuktank: <strong>${c.sanyuktankB}</strong></div>
        </div>
      </div>
    </div>`;
  };

  const render=(calc,adv,showFull)=>{
    const el=qs('#reportContainer'); if(!el) return;
    const bigBlock = showFull ? `
      <div class="p-3 rounded border mb-3">
        <div class="font-semibold mb-2">${S.lang==='hi'?'विस्तृत सलाह':'Big Advice'}</div>
        <div>${adv.big||''}</div>
      </div>
      <div class="p-3 rounded border mb-3">
        <div class="font-semibold mb-2">${S.lang==='hi'?'उपाय':'Remedies'}</div>
        <div>${adv.remedy||''}</div>
      </div>
      ${calcTable(calc)}`
      : `<div class="text-center mt-3">
          <button id="bigBtn" class="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2 rounded-lg shadow">
            ${(S.ui&&S.ui.buttons&&S.ui.buttons.showBig) || (S.lang==='hi'?'बड़ा परिणाम दिखाएँ':'Show Big Result')}
          </button>
        </div>`;

    el.innerHTML=`<div class="ms-report p-4 rounded-xl shadow bg-white text-black">
      <div class="grid md:grid-cols-2 gap-4 my-2">
        <div class="p-3 rounded border">
          <div class="font-semibold mb-1">${S.lang==='hi'?'व्यक्ति A':'Person A'}</div>
          <div>Mobank: <strong>${calc.A.mobank}</strong></div>
          <div>Yogank: <strong>${calc.A.yogank}</strong></div>
          <div>Naamank: <strong>${calc.A.naamank}</strong></div>
          <div>Sanyuktank: <strong>${calc.sanyuktankA}</strong></div>
        </div>
        <div class="p-3 rounded border">
          <div class="font-semibold mb-1">${S.lang==='hi'?'व्यक्ति B':'Person B'}</div>
          <div>Mobank: <strong>${calc.B.mobank}</strong></div>
          <div>Yogank: <strong>${calc.B.yogank}</strong></div>
          <div>Naamank: <strong>${calc.B.naamank}</strong></div>
          <div>Sanyuktank: <strong>${calc.sanyuktankB}</strong></div>
        </div>
      </div>
      <div class="my-3 flex flex-col items-center">${ring(calc.harmonyScore)}<div class="text-center text-sm mt-1">${S.lang==='hi'?'हार्मनी स्कोर':'Harmony Score'}</div></div>
      <div class="p-3 rounded border mb-3">
        <div class="font-semibold mb-2">${S.lang==='hi'?'सार सलाह':'Small Advice'}</div>
        <div>${adv.small||''}</div>
      </div>
      ${bigBlock}
      <div class="mt-6 pt-3 border-t text-center text-xs opacity-80">Dr. Yogesh Bhardwaj — Astro Scientist • www.sinaank.com • Decode Your Destiny Digitally.</div>
    </div>`;
  };

  const start=async()=>{
    await loadCountriesIndex(); await loadAll(); S.showFull=false;
    document.getElementById('inputSection')?.classList.remove('hidden');
    lockSelectors(true);
    showRestart(true);
  };

  const generate=()=>{
    const nA=onlyAZSpace(qs('#nameA')?.value||''), nB=onlyAZSpace(qs('#nameB')?.value||'');
    const mA=digits(qs('#mobileA')?.value||'');
    const mB=digits(qs('#mobileB')?.value||'');
    if(!nA.trim()||!nB.trim()) return warn(S.lang==='hi'?'वैध नाम लिखें (A–Z, space)':'Enter valid names (A–Z, spaces)');
    const min=S.country?.mobile?.minLen||10, max=S.country?.mobile?.maxLen||10;
    if(!(mA.length>=min && mA.length<=max) || !(mB.length>=min && mB.length<=max)) return warn(S.lang==='hi'?'चयनित देश के अनुसार मोबाइल अमान्य':'Invalid mobile number for selected country');
    if(mA===mB) return warn(S.lang==='hi'?'दोनों मोबाइल एक समान नहीं हो सकते।':'Both mobiles cannot be the same.');
    warn('');
    const calc=calcPair({nameA:nA,nameB:nB,mA,mB}); S.showFull=false; render(calc,S.advice,S.showFull);
    document.getElementById('inputSection')?.classList.remove('hidden');
    lockInputs(true);
  };

  const restart=()=>{
    S.showFull=false;
    lockSelectors(false); lockInputs(false);
    showRestart(false);
    ['#nameA','#nameB','#mobileA','#mobileB'].forEach(i=>{const e=qs(i); if(e) e.value='';});
    const cont=qs('#reportContainer'); if(cont) cont.innerHTML='';
    warn('');
  };

  document.addEventListener('click',(e)=>{
    const btn = e.target.closest && e.target.closest('button');
    const id = btn && btn.id;
    if(id==='bigBtn'){
      S.showFull=true;
      const nA=onlyAZSpace(qs('#nameA')?.value||''), nB=onlyAZSpace(qs('#nameB')?.value||'');
      const mA=digits(qs('#mobileA')?.value||''), mB=digits(qs('#mobileB')?.value||'');
      const calc=calcPair({nameA:nA,nameB:nB,mA,mB});
      render(calc,S.advice,true);
    }
  });

  const loadCountriesIndex=async()=>{
    try{ S.cIndex = await fetchJSON(`config/countries/_index.json?_=${Date.now()}`); }
    catch(e){ S.cIndex=[{code:'IN',label:'India (+91)'},{code:'US',label:'USA (+1)'}]; }
    populateCountries();
  };

  document.addEventListener('DOMContentLoaded',async()=>{
    try{ S.cIndex = await fetchJSON(`config/countries/_index.json?_=${Date.now()}`);}catch(e){ S.cIndex=[{code:'IN',label:'India (+91)'},{code:'US',label:'USA (+1)'}]; }
    populateCountries();
    await loadAll();
    bindNameGuards();
    bindMobileGuards();
    showRestart(false);
    on(qs('#startBtn'),'click',start);
    on(qs('#generateBtn'),'click',generate);
    on(qs('#restartBtn'),'click',restart);
    on(qs('#countrySelect'),'change', async (e)=>{ S.iso2=e.target.value; await loadAll(); });
    on(qs('#relationSelect'),'change', async (e)=>{ S.relation=e.target.value; await loadAll(); });
    on(qs('#langSelect'),'change', async (e)=>{ S.lang=e.target.value; await loadAll(); });
  });
  return { state:S };
})();