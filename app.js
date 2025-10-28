/*
  Mobile Sangam vFinal — Auto‑Loader & Runtime (Final Stable Build)
  -------------------------------------------------
  • JSON‑driven (languages, countries, advice)
  • State machine: SELECT → INPUT → REPORT → EXPORT → RESTART
  • Lock selectors after Start; unlock on Restart
  • Detailed Analysis section (reads advice.details)
*/

const MS = (() => {
  // ----------------------------
  // Helpers
  // ----------------------------
  const qs  = (sel) => document.querySelector(sel);
  const on  = (el, ev, fn) => el && el.addEventListener(ev, fn);

  const fetchJSON = async (path) => {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return await res.json();
  };

  const stripChars = (s, chars = []) => {
    let out = s || '';
    (chars || []).forEach((c) => { out = out.split(c).join(''); });
    return out;
  };
  const onlyDigits = (s) => (s || '').replace(/\D+/g, '');
  const onlyAZ     = (s) => (s || '').replace(/[^A-Za-z]/g, '').toUpperCase();

  const reduceTo1to9 = (n) => {
    n = Math.abs(Number(n) || 0);
    while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0);
    return n === 0 ? 9 : n;
  };

  const naamankFromName = (name) => {
    const clean = onlyAZ(name);
    const mapVal = (ch) => ((ch.charCodeAt(0) - 64 - 1) % 9) + 1; // A=1..Z cycles 1..9
    const sum = clean.split('').reduce((a, ch) => a + mapVal(ch), 0);
    return reduceTo1to9(sum);
  };
  const yogankFromMobile = (digits) => reduceTo1to9((digits||'').split('').reduce((a, d) => a + Number(d), 0));
  const lastNonZeroDigit  = (digits) => { for (let i = (digits||'').length - 1; i >= 0; i--) { if (digits[i] !== '0') return Number(digits[i]); } return 9; };
  const sanyuktankConcat  = (mobank, yogank) => Number(`${mobank}${yogank}`);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ----------------------------
  // Locks & State
  // ----------------------------
  const lockSelectors = (state) => {
    ['langSelect','relationSelect','countrySelect'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !!state;
    });
  };

  const S = {
    lang: 'hi',
    relation: 'HUSBAND_WIFE',
    iso2: 'IN',
    ui: null,
    country: null,
    advice: null,
    stage: 0, // 0=SELECT, 1=INPUT, 2=REPORT
  };

  const LANG = () => S.lang || 'hi';
  const FOOTER = 'Dr. Yogesh Bhardwaj — Astro Scientist • www.sinaank.com • Decode Your Destiny Digitally.';

  // ----------------------------
  // UI bindings
  // ----------------------------
  const pickLangLabel = (txt) => {
    if (!txt || typeof txt !== 'string') return txt;
    if (txt.includes('/')) { const p = txt.split('/').map(x => x.trim()); return LANG() === 'en' ? p[0] : p[p.length - 1]; }
    return txt;
  };

  const bindLanguageUI = () => {
    const { ui } = S; if (!ui) return;
    const appTitle = qs('#uiAppTitle'); const subtitle = qs('#uiSubtitle');
    if (appTitle) appTitle.textContent = ui.headings?.appTitle || 'Mobile Sangam';
    if (subtitle) subtitle.textContent = ui.titles?.subTitle || 'Mobank • Yogank • Sanyuktank';

    const relSel = qs('#relationSelect');
    if (relSel && (ui.relations || ui.ui?.relations)) {
      const relMap = ui.relations || ui.ui?.relations || {}; const cur = relSel.value || S.relation;
      relSel.innerHTML = '';
      const ph = document.createElement('option'); ph.value = ''; ph.textContent = LANG()==='en' ? '-- Select Relation --' : '— संबंध चुनें —'; relSel.appendChild(ph);
      Object.keys(relMap).forEach((key) => { const opt = document.createElement('option'); opt.value = key; opt.textContent = pickLangLabel(relMap[key]); relSel.appendChild(opt); });
      relSel.value = cur;
    }

    const startBtn = qs('#startBtn'); const restartBtn = qs('#restartBtn'); const generateBtn = qs('#generateBtn');
    if (startBtn) startBtn.textContent = ui.buttons?.start || 'Start';
    if (restartBtn) restartBtn.textContent = ui.buttons?.restart || 'Restart';
    if (generateBtn) generateBtn.textContent = ui.buttons?.generate || 'Generate';
  };

  const bindCountryUI = () => {
    const { country } = S;
    const badgeA = qs('#isdBadgeA'); const badgeB = qs('#isdBadgeB');
    if (badgeA) badgeA.textContent = country?.isd || '';
    if (badgeB) badgeB.textContent = country?.isd || '';
  };

  const setStage = (n) => {
    S.stage = n;
    const inputSection = document.getElementById('inputSection');
    if (inputSection) inputSection.classList.toggle('hidden', n === 0);
  };

  // ----------------------------
  // Loading pipeline
  // ----------------------------
  const loadAll = async () => {
    const lang = qs('#langSelect')?.value || S.lang;
    const relation = qs('#relationSelect')?.value || S.relation;
    const iso2 = qs('#countrySelect')?.value || S.iso2;

    S.lang = lang; S.relation = relation; S.iso2 = iso2;

    const bust = `?_=${Date.now()}`;
    const [ui, country, advice] = await Promise.all([
      fetchJSON(`/config/languages/${lang}.json${bust}`),
      fetchJSON(`/config/countries/${iso2}.json${bust}`),
      fetchJSON(`/config/advice/${lang}/${relation}.json${bust}`).catch(() => ({ meta: { relation, lang }, maps: { RULES: [], SANYUKTANK_BUCKETS: {} } })),
    ]);

    const relations = ui.relations || ui.ui?.relations;
    S.ui = ui?.ui ? { ...ui.ui, titles: ui.titles, relations } : ui;
    S.country = country;
    S.advice = advice;

    localStorage.setItem('ms_last', JSON.stringify({ lang, relation, iso2 }));

    bindLanguageUI(); bindCountryUI();
    console.log('[MobileSangam] Loaded:', { lang, iso2, relation });
  };

  const bootFromLocal = () => {
    try { const s = JSON.parse(localStorage.getItem('ms_last') || '{}'); if (s.lang) qs('#langSelect').value = s.lang; if (s.iso2) qs('#countrySelect').value = s.iso2; } catch (e) {}
  };

  // ----------------------------
  // Validation & inputs
  // ----------------------------
  const normalizeMobile = (raw, stripList) => onlyDigits(stripChars(raw || '', stripList || []));
  const validateMobile = (digits, rules) => { const len = (digits || '').length; const { minLen = 10, maxLen = 10 } = rules?.mobile || {}; return len >= minLen && len <= maxLen; };
  const showWarning = (msg) => { const w = qs('#warnings'); if (!w) return; w.textContent = msg || ''; w.classList.toggle('hidden', !msg); };
  const gatherInputs = () => {
    const nameA = onlyAZ(qs('#nameA')?.value || '');
    const nameB = onlyAZ(qs('#nameB')?.value || '');
    const mA = normalizeMobile(qs('#mobileA')?.value || '', S.country?.mobile?.strip);
    const mB = normalizeMobile(qs('#mobileB')?.value || '', S.country?.mobile?.strip);
    const okA = validateMobile(mA, S.country); const okB = validateMobile(mB, S.country);
    return { nameA, nameB, mA, mB, okA, okB };
  };

  // ----------------------------
  // Core calculations
  // ----------------------------
  const computeForOne = ({ name, digits }) => {
    const naamank = naamankFromName(name);
    const yogank  = yogankFromMobile(digits);
    const mobank  = lastNonZeroDigit(digits);
    return { naamank, yogank, mobank };
  };
  const computePair = ({ nameA, nameB, mA, mB }) => {
    const A = computeForOne({ name: nameA, digits: mA });
    const B = computeForOne({ name: nameB, digits: mB });
    const sanyuktankA = sanyuktankConcat(A.mobank, A.yogank);
    const sanyuktankB = sanyuktankConcat(B.mobank, B.yogank);
    const naamankDiff = Math.abs(A.naamank - B.naamank);
    const yogankDiff  = Math.abs(A.yogank  - B.yogank);
    let score = 100; score -= naamankDiff * 8; score -= yogankDiff * 5;
    const mp = [String(A.mobank), String(B.mobank)].sort().join('-');
    const hasRulePair = (S.advice?.maps?.RULES || []).some(r => { const p = r.when?.mobankPair; if (!p) return false; const pr = [String(p[0]), String(p[1])].sort().join('-'); return pr === mp; });
    if (hasRulePair) score += 6; score = clamp(Math.round(score), 0, 100);
    return { A, B, sanyuktankA, sanyuktankB, naamankDiff, yogankDiff, harmonyScore: score };
  };

  // ----------------------------
  // Advice resolver
  // ----------------------------
  const resolveAdvice = (calc) => {
    const rules = S.advice?.maps?.RULES || []; let picked = null;
    for (const r of rules) { const p = r.when?.mobankPair; if (p) { const mp = [String(calc.A.mobank), String(calc.B.mobank)].sort().join('-'); const pr = [String(p[0]), String(p[1])].sort().join('-'); if (mp === pr) { picked = r; break; } } }
    if (!picked) { for (const r of rules) { const lim = r.when?.naamankDiffLTE; if (typeof lim === 'number' && calc.naamankDiff <= lim) { picked = r; break; } } }
    if (!picked) picked = { small: LANG()==='hi' ? 'सामान्य संतुलन — संवाद रखें।' : 'Balanced outlook — keep communicating.', big: LANG()==='hi' ? 'कुछ बातों में मतभेद संभव हैं, पर धैर्य और स्पष्टता से सामंजस्य बनता है।' : 'Minor differences may arise; patience and clarity build harmony.', remedy: LANG()==='hi' ? 'सप्ताह में एक बार साथ ध्यान/प्रार्थना करें।' : 'Meditate or pray together once a week.' };
    return picked;
  };

  // ----------------------------
  // Renderers
  // ----------------------------
  const renderHarmonyRing = (score) => {
    const pct = clamp(score, 0, 100);
    const angle = (pct / 100) * 180; const radius = 64; const cx = 80; const cy = 80;
    const endX = cx + radius * Math.cos(Math.PI - (angle * Math.PI / 180));
    const endY = cy - radius * Math.sin(Math.PI - (angle * Math.PI / 180));
    const largeArc = angle > 180 ? 1 : 0;
    return `
      <svg width="160" height="100" viewBox="0 0 160 100" aria-label="Harmony Score">
        <path d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy}" fill="none" stroke-width="10" stroke="#eee"></path>
        <path d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}" fill="none" stroke-width="10" stroke="#3b82f6" stroke-linecap="round"></path>
        <text x="80" y="70" text-anchor="middle" font-size="20" font-weight="700">${pct}</text>
      </svg>`;
  };

  const renderReport = (calc, adv) => {
    const ui = S.ui || {}; const el = qs('#reportContainer'); if (!el) return;
    const block = `
      <div class="ms-report p-4 rounded-xl shadow bg-white text-black">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-bold">${ui.headings?.appTitle || 'Mobile Sangam'}</div>
            <div class="text-sm opacity-70">${ui.titles?.subTitle || 'Mobank • Yogank • Sanyuktank'}</div>
          </div>
        </div>
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
        <div class="my-3 flex flex-col items-center">${renderHarmonyRing(calc.harmonyScore)}<div class="text-center text-sm mt-1">Harmony Score</div></div>
        <div class="p-3 rounded border mb-3">
          <div class="font-semibold mb-2">${LANG()==='hi'?'सार सलाह (Small Advice)':'Small Advice'}</div>
          <div>${adv.small}</div>
        </div>
        <div class="p-3 rounded border mb-3">
          <div class="font-semibold mb-2">${LANG()==='hi'?'विस्तृत सलाह (Big Advice)':'Big Advice'}</div>
          <div>${adv.big}</div>
        </div>
        <div class="p-3 rounded border">
          <div class="font-semibold mb-2">${LANG()==='hi'?'उपाय (Remedies)':'Remedies'}</div>
          <div>${adv.remedy}</div>
        </div>
        <div class="mt-6 text-center text-xs opacity-80">${FOOTER}</div>
      </div>`;
    el.innerHTML = block;
    if (adv && adv.details) {
      const d = adv.details;
      const detailHTML = `
        <div class="p-4 mt-4 rounded-xl border bg-gray-50 text-black">
          <div class="font-semibold text-lg mb-2">${S.lang === 'hi' ? 'विस्तृत विश्लेषण' : 'Detailed Analysis'}</div>
          ${d.summary ? `<p><strong>${S.lang==='hi'?'सारांश:':'Summary:'}</strong> ${d.summary}</p>` : ''}
          ${Array.isArray(d.strengths) ? `<p class="mt-2"><strong>${S.lang==='hi'?'सशक्त पक्ष:':'Strengths:'}</strong> ${d.strengths.join(', ')}</p>` : ''}
          ${Array.isArray(d.challenges) ? `<p class="mt-2"><strong>${S.lang==='hi'?'चुनौतियाँ:':'Challenges:'}</strong> ${d.challenges.join(', ')}</p>` : ''}
          ${d.sinaankInsight ? `<p class="mt-2"><strong>${S.lang==='hi'?'सिनांक अंतर्दृष्टि:':'Sinaank Insight:'}</strong> ${d.sinaankInsight}</p>` : ''}
        </div>`;
      el.insertAdjacentHTML('beforeend', detailHTML);
    }
  };

  // ----------------------------
  // Actions
  // ----------------------------
  const doStart = async () => { await loadAll(); setStage(1); lockSelectors(true); };
  const doGenerate = () => {
    const ui = S.ui || {}; const { nameA, nameB, mA, mB, okA, okB } = gatherInputs();
    if (!nameA || !nameB) return showWarning(ui.warnings?.nameScript || 'Enter valid names');
    if (!okA || !okB)   return showWarning(ui.warnings?.mobileFormat || 'Invalid mobile number');
    showWarning(''); const calc = computePair({ nameA, nameB, mA, mB }); const adv  = resolveAdvice(calc); renderReport(calc, adv); setStage(2);
  };
  const doRestart = () => { setStage(0); lockSelectors(false); ['#nameA','#nameB','#mobileA','#mobileB'].forEach(id => { const el = qs(id); if (el) el.value = ''; }); qs('#reportContainer') && (qs('#reportContainer').innerHTML = ''); };

  // PDF export — uses html2pdf.js
  const doExportPDF = async () => {
    const node = qs('#reportContainer'); if (!node || !node.innerText.trim()) { alert(LANG()==='hi'?'पहले रिपोर्ट जनरेट करें।':'Please generate the report first.'); return; }
    const nA = (qs('#nameA')?.value || 'A').toUpperCase().replace(/[^A-Z]/g, '');
    const nB = (qs('#nameB')?.value || 'B').toUpperCase().replace(/[^A-Z]/g, '');
    const fname = `MobileSangam_${S.relation||'REL'}_${nA}_x_${nB}_${S.iso2||'XX'}.pdf`;
    const opt = { margin:[10,10,12,10], filename:fname, image:{ type:'jpeg', quality:0.98 }, html2canvas:{ scale:2, useCORS:true, logging:false }, jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' } };
    try { await window.html2pdf().set(opt).from(node).save(); } catch (e) { console.error('PDF export failed:', e); alert('PDF export failed. See console.'); }
  };

  // ----------------------------
  // Init & events
  // ----------------------------
  const init = () => {
    bootFromLocal();
    on(qs('#startBtn'), 'click', doStart);
    on(qs('#generateBtn'), 'click', doGenerate);
    on(qs('#restartBtn'), 'click', doRestart);
    on(qs('#exportBtn'), 'click', doExportPDF);
    on(qs('#relationSelect'), 'change', async (e) => { S.relation = e.target.value; await loadAll(); });
    on(qs('#langSelect'), 'change', async (e) => { S.lang = e.target.value; await loadAll(); });
    on(qs('#countrySelect'), 'change', async (e) => { S.iso2 = e.target.value; await loadAll(); });
    loadAll().catch(console.error);
  };

  return { init, state: S, doStart, doGenerate, doRestart, doExportPDF };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MS.init());
} else { MS.init(); }
