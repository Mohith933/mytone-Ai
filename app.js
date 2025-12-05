// MyTone AI — M0.6 app.js (complete, self-contained)
// Safe helpers
const $ = id => document.getElementById(id);

// DOM
const hamburgerBtn = $('hamburgerBtn');
const navLinks = $('nav-links');
const modeToggle = $('modeToggle');

const userInput = $('userInput');
const speakButton = $('speakButton');
const stopButton = $('stopButton');
const aiResponse = $('aiResponse');
const toneSelect = $('toneSelect');
const emotionSelect = $('emotionSelect');
const languageSelect = $('languageSelect');
const waveCanvas = $('waveCanvas');
const analyzerSuggestion = $('analyzerSuggestion');
const textPreview = $('textPreview');

const savePresetBtn = $('savePresetBtn');
const resetSettingsBtn = $('resetSettingsBtn');
const presetList = $('presetList');

const historyList = $('historyList');
const clearHistoryBtn = $('clearHistoryBtn');
const presetButtons = document.querySelectorAll('.preset-btn');

// Basic safety
if (!window.speechSynthesis) {
  if (aiResponse) aiResponse.textContent = 'Speech Synthesis API not supported in this browser.';
}

// -------------------- NAVBAR / HAMBURGER --------------------
if (hamburgerBtn && navLinks) {
  hamburgerBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburgerBtn.classList.toggle('active');
  });

  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open'); hamburgerBtn.classList.remove('active');
  }));

  // click outside closes
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !hamburgerBtn.contains(e.target)) {
      navLinks.classList.remove('open'); hamburgerBtn.classList.remove('active');
    }
  });
}

// -------------------- THEME --------------------
(function loadTheme(){
  try {
    const t = localStorage.getItem('theme');
    if (t === 'dark') document.body.classList.add('dark-mode');
    if (modeToggle) modeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';
  } catch(e){}
})();
if (modeToggle) modeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  try { localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); } catch(e){}
  modeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';
});

// -------------------- VOICE LOADING --------------------
let synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
  voices = synth.getVoices() || [];
  if (!languageSelect) return;
  languageSelect.innerHTML = '';

  // prefer en-IN > en-US > first en > fallback en-US
  let chosen = null;
  for (const v of voices) if (v.lang && v.lang.toLowerCase()==='en-in') { chosen = v.lang; break; }
  if (!chosen) for (const v of voices) if (v.lang && v.lang.toLowerCase()==='en-us') { chosen = v.lang; break; }
  if (!chosen) for (const v of voices) if (v.lang && v.lang.toLowerCase().startsWith('en')) { chosen = v.lang; break; }
  if (!chosen) chosen = 'en-US';

  const option = document.createElement('option');
  option.value = chosen;
  option.textContent = `${chosen} — ${voices.find(v => v.lang===chosen)?.name ?? 'Default'}`;
  languageSelect.appendChild(option);
}
if ('onvoiceschanged' in speechSynthesis) speechSynthesis.onvoiceschanged = loadVoices;
setTimeout(loadVoices, 200);

// -------------------- CANVAS WAVE (SIMULATED) --------------------
let ctx = null;
let animating = false;
let frame = 0;
function setupCanvas() {
  if (!waveCanvas) return;
  if (!waveCanvas.getContext) return;
  ctx = waveCanvas.getContext('2d');
  resizeCanvas();
  ctx.setTransform(1,0,0,1,0,0);
}
function resizeCanvas() {
  if (!waveCanvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(waveCanvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(waveCanvas.clientHeight * dpr));
  if (waveCanvas.width !== w || waveCanvas.height !== h) {
    waveCanvas.width = w; waveCanvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}
window.addEventListener('resize', () => { try { resizeCanvas(); } catch(e){} });

function drawSimulated(intensity = 1) {
  if (!ctx || !waveCanvas) return;
  const cssW = waveCanvas.clientWidth || waveCanvas.width;
  const cssH = waveCanvas.clientHeight || waveCanvas.height;
  ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

  const bars = 30;
  const gap = 4;
  const barWidth = Math.max(2, (cssW - (bars - 1) * gap) / bars);

  let color = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#3B82F6';
  const emotion = emotionSelect ? emotionSelect.value : 'normal';
  if (emotion === 'happy') color = '#ffd166';
  if (emotion === 'sad') color = '#8aa0ff';
  if (emotion === 'energetic') color = '#ff7b7b';

  for (let i=0;i<bars;i++){
    const phase = Math.sin((frame + i)*0.12 + i*0.05);
    const h = (0.2 + Math.abs(phase)*0.8) * (cssH) * intensity;
    const x = i * (barWidth + gap);
    const y = (cssH - h) / 2;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth, h);
  }
}

function animateSimulated(intensity = 1) {
  animating = true;
  function step(){
    if (!animating) return;
    frame++;
    drawSimulated(intensity);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function stopSimulated() { animating = false; if (ctx && waveCanvas) ctx.clearRect(0,0,waveCanvas.width,waveCanvas.height); }

// -------------------- EMOTIONS --------------------
function applyEmotionSettings(utter, emotion) {
  utter.pitch = utter.pitch || 1; utter.rate = utter.rate || 1; utter.volume = (typeof utter.volume === 'number') ? utter.volume : 1;
  switch (emotion) {
    case 'happy': utter.pitch *= 1.25; utter.rate *= 1.15; utter.volume = 1; break;
    case 'sad': utter.pitch *= 0.8; utter.rate *= 0.9; utter.volume = 0.9; break;
    case 'friendly': utter.pitch *= 1.1; utter.rate = 1.0; utter.volume = 1; break;
    case 'soft': utter.pitch *= 0.95; utter.rate *= 0.9; utter.volume = 0.8; break;
    case 'energetic': utter.pitch *= 1.35; utter.rate *= 1.25; utter.volume = 1; break;
    case 'calm': utter.pitch *= 0.9; utter.rate *= 0.95; utter.volume = 0.95; break;
    default: break;
  }
}

// -------------------- ANALYZER --------------------
function analyzeTextForEmotion(text) {
  if (!text) return 'normal';
  const t = text.toLowerCase();
  const exclam = t.includes('!');
  let score = 0;
  ['sad','sorry','unhappy','miss','regret'].forEach(w=>{ if (t.includes(w)) score-=2; });
  ['happy','joy','excited','great','love','yay'].forEach(w=>{ if (t.includes(w)) score+=2; });
  if (exclam) score += 1;
  if (score >= 2) return 'happy';
  if (score <= -2) return 'sad';
  if (t.length > 250) return 'calm';
  return 'normal';
}

function highlightTextEmotion(text, emotion) {
  if (!textPreview) return;
  textPreview.className = 'text-highlight';
  textPreview.classList.remove('hl-happy','hl-sad','hl-excited','hl-calm');
  if (emotion === 'happy') textPreview.classList.add('hl-happy');
  if (emotion === 'sad') textPreview.classList.add('hl-sad');
  if (emotion === 'energetic') textPreview.classList.add('hl-excited');
  if (emotion === 'calm') textPreview.classList.add('hl-calm');
  textPreview.textContent = text || '';
}

// -------------------- PRESETS (localStorage) --------------------
const PRESETS_KEY = 'mytone_presets_v0.6';
function loadPresets() { try { const r = localStorage.getItem(PRESETS_KEY); return r ? JSON.parse(r) : []; } catch(e){ return []; } }
function savePresets(arr){ try{ localStorage.setItem(PRESETS_KEY, JSON.stringify(arr)); } catch(e){} }
function renderPresetList(){
  if (!presetList) return;
  const presets = loadPresets();
  presetList.innerHTML = '';
  if (!presets.length) { presetList.innerHTML = '<div class="small muted">No saved presets</div>'; return; }
  presets.forEach((p,i)=> {
    const el = document.createElement('div'); el.className='preset-item';
    el.innerHTML = `<div><strong>${p.name}</strong><div class="small muted">${p.toneLabel} · ${p.emotion}</div></div>
      <div><button data-load="${i}" class="btn-secondary">Load</button> <button data-delete="${i}" class="btn-secondary">Del</button></div>`;
    presetList.appendChild(el);
  });
  presetList.querySelectorAll('[data-load]').forEach(b=> b.addEventListener('click', (e)=>{
    const i = parseInt(b.getAttribute('data-load')); const p = loadPresets()[i]; if(!p) return;
    toneSelect.value = p.tone; emotionSelect.value = p.emotion; if (aiResponse) aiResponse.textContent = `Loaded: ${p.name}`;
  }));
  presetList.querySelectorAll('[data-delete]').forEach(b=> b.addEventListener('click', (e)=>{
    const i = parseInt(b.getAttribute('data-delete')); const arr = loadPresets(); const removed = arr.splice(i,1); savePresets(arr); renderPresetList();
    if (aiResponse) aiResponse.textContent = `Deleted: ${removed[0]?.name ?? 'preset'}`;
  }));
}
if (savePresetBtn) savePresetBtn.addEventListener('click', ()=> {
  const name = prompt('Preset name:','My Preset');
  if (!name) { if (aiResponse) aiResponse.textContent='Preset save cancelled'; return; }
  const tone = toneSelect ? toneSelect.value : '1'; const toneLabel = toneSelect ? toneSelect.options[toneSelect.selectedIndex].text : 'Medium';
  const emotion = emotionSelect ? emotionSelect.value : 'normal';
  const arr = loadPresets(); arr.push({name,tone,toneLabel,emotion,created:Date.now()}); savePresets(arr); renderPresetList();
  if (aiResponse) aiResponse.textContent = `Saved preset: ${name}`;
});
if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', ()=> {
  if (toneSelect) toneSelect.value='1'; if (emotionSelect) emotionSelect.value='normal'; if (aiResponse) aiResponse.textContent='Settings reset';
});
renderPresetList();

// -------------------- HISTORY (local) --------------------
const HISTORY_KEY = 'mytone_history_v0.6';
function loadHistory(){ try{ const r = localStorage.getItem(HISTORY_KEY); return r ? JSON.parse(r) : []; }catch(e){return[]} }
function saveHistory(arr){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); }catch(e){} }
function addHistory(item){ const h = loadHistory(); h.unshift(item); if (h.length>30) h.pop(); saveHistory(h); renderHistory(); }
function renderHistory(){ if (!historyList) return; const h=loadHistory(); historyList.innerHTML=''; if(!h.length){ historyList.innerHTML='<div class="small muted">No history</div>'; return;} h.forEach((it,idx)=> {
  const row = document.createElement('div'); row.className='history-item';
  row.innerHTML = `<div style="flex:1"><div class="small muted">${new Date(it.ts).toLocaleString()}</div><div>${(it.text||'').slice(0,120)}</div></div>
    <div style="display:flex;gap:6px"><button class="btn-primary" data-replay="${idx}">Play</button><button class="btn-secondary" data-copy="${idx}">Copy</button></div>`;
  historyList.appendChild(row);
});
  historyList.querySelectorAll('[data-replay]').forEach(b=> b.addEventListener('click', ()=> {
    const i = parseInt(b.getAttribute('data-replay')); const h=loadHistory(); if (!h[i]) return; userInput.value = h[i].text; speakNow(h[i].text,h[i].tone,h[i].emotion);
  }));
  historyList.querySelectorAll('[data-copy]').forEach(b=> b.addEventListener('click', ()=> {
    const i = parseInt(b.getAttribute('data-copy')); const h=loadHistory(); if(!h[i]) return; try { navigator.clipboard.writeText(h[i].text); if (aiResponse) aiResponse.textContent='Copied'; }catch(e){}
  }));
}
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', ()=> { try{ localStorage.removeItem(HISTORY_KEY); }catch(e){} renderHistory(); });
renderHistory();

// -------------------- SPEAK LOGIC --------------------
function speakNow(text, tone=null, emotion=null) {
  if (!text || !text.trim()) { if (aiResponse) aiResponse.textContent='Please enter text'; return; }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = languageSelect && languageSelect.value ? languageSelect.value : 'en-US';

  // pick voice (best-effort)
  if (voices && voices.length) {
    const match = voices.find(v=> v.lang && v.lang.toLowerCase() === utter.lang.toLowerCase()) ||
                  voices.find(v=> v.lang && v.lang.toLowerCase().startsWith('en')) || voices[0];
    if (match) utter.voice = match;
  }

  // base pitch from tone select or arg
  utter.pitch = tone ? parseFloat(tone) : (toneSelect ? parseFloat(toneSelect.value||'1') : 1);
  applyEmotionSettings(utter, emotion || (emotionSelect ? emotionSelect.value : 'normal'));

  try { speechSynthesis.cancel(); } catch(e){}
  try { speechSynthesis.speak(utter); } catch(e) { if (aiResponse) aiResponse.textContent = 'Speech failed'; return; }
  if (aiResponse) aiResponse.textContent = 'Speaking...';
  animateSimulated(1.0);

  addHistory({ text, tone:utter.pitch, emotion: emotion || (emotionSelect ? emotionSelect.value : 'normal'), ts: Date.now() });

  utter.onend = () => { if (aiResponse) aiResponse.textContent = 'Done'; stopSimulated(); };
  utter.onerror = () => { if (aiResponse) aiResponse.textContent = 'Error'; stopSimulated(); };
}

// helper wrapper
function speakWrapper() {
  const text = userInput ? userInput.value : '';
  const tone = toneSelect ? toneSelect.value : null;
  const emotion = emotionSelect ? emotionSelect.value : null;
  const auto = analyzeTextForEmotion(text);
  if (analyzerSuggestion) analyzerSuggestion.textContent = auto === 'normal' ? 'No strong emotion detected' : auto;
  highlightTextEmotion(text, auto);
  speakNow(text, tone, emotion);
}

if (speakButton) speakButton.addEventListener('click', speakWrapper);
if (stopButton) stopButton.addEventListener('click', ()=> { try { speechSynthesis.cancel(); } catch(e){} stopSimulated(); if (aiResponse) aiResponse.textContent = 'Stopped'; });

// quick preset buttons
presetButtons.forEach(b => b.addEventListener('click', ()=> {
  const p = b.getAttribute('data-preset'); const text = userInput ? userInput.value : ''; speakNow(text, null, p);
}));

// -------------------- VOICE LOADING (attempt) --------------------
function tryLoadVoices() {
  voices = speechSynthesis.getVoices() || [];
  if (voices.length && languageSelect) {
    languageSelect.innerHTML = '';
    let chosen = null;
    for (const v of voices) if (v.lang && v.lang.toLowerCase()==='en-in') { chosen = v.lang; break; }
    if (!chosen) for (const v of voices) if (v.lang && v.lang.toLowerCase()==='en-us') { chosen = v.lang; break; }
    if (!chosen) for (const v of voices) if (v.lang && v.lang.toLowerCase().startsWith('en')) { chosen = v.lang; break; }
    if (!chosen) chosen = voices[0]?.lang || 'en-US';
    const opt = document.createElement('option'); opt.value = chosen;
    opt.textContent = `${chosen} — ${voices.find(v=>v.lang===chosen)?.name ?? 'Default'}`;
    languageSelect.appendChild(opt);
  }
}
setTimeout(tryLoadVoices,250);
if ('onvoiceschanged' in speechSynthesis) speechSynthesis.onvoiceschanged = tryLoadVoices;

// -------------------- STARTUP --------------------
window.addEventListener('load', () => {
  setupCanvas();
  tryLoadVoices();
});
