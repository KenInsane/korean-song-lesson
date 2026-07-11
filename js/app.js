// KoreanSongLesson mobile — разбор песни → курирование → сохранение материала.
import { KiwiBuilder, Match } from '../lib/index.js';
import { createAnalyzer } from './analyzer.js';
import { LESSON_CSS } from './style.js?v=3';
import { renderCuration, renderSavedList, renderMaterial } from './views.js';
import { loadAll, addMaterial, deleteMaterial, getMaterial, newId } from './store.js';

const $ = (id) => document.getElementById(id);
const MODEL_FILES = ['combiningRule.txt', 'extract.mdl', 'sj.knlm', 'sj.morph', 'skipbigram.mdl', 'typo.dict'];
const MATCH = Match.allWithNormalizing;

let kiwi = null;
let analyzer = null;
let currentAnalysis = null;

const SAMPLES = {
  cheotnun: { title: '첫눈', artist: '(демо)', text:
`너를 처음 만난 날을 기억해
하얀 눈이 내리고 있었어
너무 예뻐서 아무 말도 못 했어
그때 그 골목이 자꾸 생각나

너와 함께 걷고 싶어
이 밤이 끝나지 않았으면 좋겠어
네가 웃으면 나도 행복해
언제나 네 곁에 있을게

우리 처음 만났던 그 계절처럼
다시 사랑하고 싶어
보고 싶어 너무 보고 싶어
잊지 않을게 영원히` },
  arirang: { title: '아리랑', artist: '', text:
`아리랑 아리랑 아라리요
아리랑 고개로 넘어간다
나를 버리고 가시는 님은
십리도 못 가서 발병 난다` },
};

const hangul = (s) => (String(s || '').match(/[가-힣]/g) || []).length;
const latin = (s) => (String(s || '').match(/[A-Za-z]/g) || []).length;

function lmsg(t) { const el = $('loading-msg'); if (el) el.textContent = t; }
async function loadJson(p) { const r = await fetch(p); if (!r.ok) throw new Error('нет ' + p); return r.json(); }

async function init() {
  lmsg('Инициализация…');
  const st = document.createElement('style'); st.textContent = LESSON_CSS + HERO_CSS; document.head.appendChild(st);
  wireUi();

  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('./sw.js?v=4'); } catch (e) { /* ignore */ }
  }

  lmsg('Загружаю словари…');
  const [grammar, vocab, phrases, particles] = await Promise.all([
    loadJson('./data/grammar_db.json'), loadJson('./data/vocab_dict.json'),
    loadJson('./data/phrases.json'), loadJson('./data/particles.json'),
  ]);
  analyzer = createAnalyzer({ grammar, vocab, phrases, particles });
  refreshSaved();

  lmsg('Загружаю движок (WASM)…');
  const builder = await KiwiBuilder.create('./lib/kiwi-wasm.wasm');
  lmsg('Загружаю модель (~39 МБ, один раз)…');
  const modelFiles = {};
  let done = 0;
  for (const f of MODEL_FILES) {
    lmsg(`Загружаю модель… ${done}/${MODEL_FILES.length}  (${f})`);
    const r = await fetch('./model/' + f, { cache: 'force-cache' });
    if (!r.ok) throw new Error(`модель «${f}» не загрузилась: HTTP ${r.status}.`);
    const buf = new Uint8Array(await r.arrayBuffer());
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html') || (buf.length && buf[0] === 0x3c)) throw new Error(`модель «${f}» пришла как HTML — файл не отдался хостингом.`);
    modelFiles[f] = buf; done++;
  }
  lmsg('Собираю движок…');
  kiwi = await builder.build({ modelFiles, integrateAllomorph: true, loadDefaultDict: false, loadMultiDict: false });
  $('loading').classList.add('hidden');
  $('go').disabled = false;
  $('go').textContent = 'Разобрать песню';
}

// --- Разбор ---
function tokenizeLines(text) {
  return text.replace(/\r/g, '').split('\n').map((t, i) => ({
    idx: i, text: t.replace(/\s+$/u, ''), tokens: t.trim() ? kiwi.tokenize(t, MATCH) : [], _nt: null,
  }));
}

function analyzeNow() {
  const text = $('text').value.trim();
  if (!text) { $('curate').innerHTML = '<div class="err">Вставь текст песни.</div>'; return; }
  if (!kiwi) return;

  const hc = hangul(text), lc = latin(text);
  if (hc < 3) {
    $('curate').innerHTML = `<div class="err"><b>Это не корейский текст.</b><br>
      Похоже, вставлена транскрипция латиницей или перевод. Разбор работает только с корейскими буквами (한글).
      Вставь корейский оригинал песни${lc > 0 ? '' : ''}.</div>`;
    return;
  }
  const notK = (lc > 0 && hc / (hc + lc) < 0.45);

  const title = $('title').value.trim() || 'Песня';
  const artist = $('artist').value.trim();
  $('go').disabled = true; $('go').textContent = 'Разбираю…';
  setTimeout(() => {
    try {
      const lines = tokenizeLines(text);
      currentAnalysis = analyzer.analyze(text, lines, title, artist);
      let warn = '';
      if (notK) warn = `<div class="warnbar">⚠ В тексте много латиницы. Если это транскрипция, разбор будет неточным — лучше вставить корейский оригинал.</div>`;
      $('curate').innerHTML = warn + renderCuration(currentAnalysis);
      $('curate').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      $('curate').innerHTML = '<div class="err">Ошибка разбора: ' + (e && e.message ? e.message : e) + '</div>';
    }
    $('go').disabled = false; $('go').textContent = 'Разобрать песню';
  }, 30);
}

// --- Сохранение выбранного ---
function gatherAndSave() {
  const a = currentAnalysis; if (!a) return;
  const cur = $('curate');

  const gIds = new Set([...cur.querySelectorAll('.sel[data-kind="grammar"]:checked')].map((c) => c.dataset.id));
  const grammars = a.grammar_hits.filter((gh) => gIds.has(gh.grammar.id)).map((gh) => ({
    ...gh.grammar, occurrences: gh.occurrences.map((o) => ({ line: o.text, matched: o.matched })),
  }));

  const wSel = new Set([...cur.querySelectorAll('.sel[data-kind="word"]:checked')].map((c) => c.dataset.word));
  const wTr = {}; cur.querySelectorAll('.wtr[data-word]').forEach((i) => { wTr[i.dataset.word] = i.value.trim(); });
  const words = a.vocab.filter((w) => wSel.has(w.word)).map((w) => ({
    word: w.word, romanization: w.romanization, pos: w.pos, level: w.level, ru: (w.word in wTr ? wTr[w.word] : w.ru),
  }));

  const pSel = new Set([...cur.querySelectorAll('.sel[data-kind="phrase"]:checked')].map((c) => +c.dataset.idx));
  const pTr = {}; cur.querySelectorAll('.wtr[data-pidx]').forEach((i) => { pTr[+i.dataset.pidx] = i.value.trim(); });
  const phrases = [];
  a.phrases_found.forEach((ph, i) => { if (pSel.has(i)) phrases.push({ phrase: ph.phrase, romanization: ph.romanization, ru: (i in pTr ? pTr[i] : ph.ru) }); });

  if (!grammars.length && !words.length && !phrases.length) { toast('Ничего не выбрано'); return; }

  addMaterial({ id: newId(), title: a.title || 'Песня', artist: a.artist || '', songText: a.raw_text, date: Date.now(), grammars, words, phrases });
  currentAnalysis = null; $('curate').innerHTML = ''; $('text').value = '';
  refreshSaved(); showTab('saved'); closeMaterial();
  toast('Материал сохранён ✓');
}

// --- Мои материалы ---
function refreshSaved() {
  const list = loadAll();
  $('savedList').innerHTML = renderSavedList(list);
  $('savedCount').textContent = list.length ? String(list.length) : '';
}
function openMaterial(id) {
  const m = getMaterial(id); if (!m) return;
  $('materialView').innerHTML = '<div class="lesson">' + renderMaterial(m) + '</div>';
  $('savedList').style.display = 'none';
  $('materialView').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function closeMaterial() {
  $('materialView').style.display = 'none'; $('materialView').innerHTML = '';
  $('savedList').style.display = '';
}
function doDelete(id) {
  const m = getMaterial(id); if (!m) return;
  if (!confirm(`Удалить «${m.title}»? Это действие нельзя отменить.`)) return;
  deleteMaterial(id); refreshSaved(); closeMaterial();
  toast('Удалено');
}

// --- Вкладки ---
function showTab(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $('tab-analyze').style.display = name === 'analyze' ? '' : 'none';
  $('tab-saved').style.display = name === 'saved' ? '' : 'none';
  if (name === 'saved') { closeMaterial(); refreshSaved(); }
}

// --- Автозагрузка текста (предпочитаем КОРЕЙСКИЙ вариант) ---
async function fetchLyrics() {
  const title = $('title').value.trim();
  if (!title) { $('fetchnote').textContent = 'Сначала впиши название.'; return; }
  const artist = $('artist').value.trim();
  $('fetchnote').textContent = 'Ищу…';
  try {
    const q = encodeURIComponent((title + ' ' + artist).trim());
    const r = await fetch('https://lrclib.net/api/search?q=' + q);
    const arr = await r.json();
    const cand = (arr || []).filter((h) => (h.plainLyrics || '').trim() && !h.instrumental);
    cand.sort((a, b) => hangul(b.plainLyrics) - hangul(a.plainLyrics)); // корейский вариант вперёд
    const hit = cand[0];
    if (!hit) { $('fetchnote').textContent = 'Ничего не нашлось.'; return; }
    $('text').value = hit.plainLyrics.trim();
    $('title').value = hit.trackName || title;
    if (hit.artistName) $('artist').value = hit.artistName;
    if (hangul(hit.plainLyrics) === 0) {
      $('fetchnote').innerHTML = '<span class="warn">Нашлась только транскрипция/перевод, без корейских букв. Вставь корейский оригинал вручную.</span>';
    } else {
      $('fetchnote').innerHTML = `Найдено: <b>${escapeHtml(hit.trackName)} — ${escapeHtml(hit.artistName)}</b>. ` +
        '<span class="warn">Текст защищён авторским правом — только для личного обучения.</span>';
    }
  } catch (e) {
    $('fetchnote').innerHTML = '<span class="warn">Не удалось загрузить (ограничение сети/CORS). Вставь текст вручную.</span>';
  }
}

// --- TTS ---
let voice = null;
function pickVoice() {
  if (!window.speechSynthesis) return;
  const vs = window.speechSynthesis.getVoices() || [];
  voice = vs.find((v) => v.lang && v.lang.toLowerCase().startsWith('ko')) || vs.find((v) => /korean|한국/i.test(v.name)) || null;
}
function speak(text, btn) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.9; if (voice) u.voice = voice;
  if (btn) { btn.classList.add('playing'); u.onend = u.onerror = () => btn.classList.remove('playing'); }
  window.speechSynthesis.speak(u);
}

// --- toast ---
let toastT = null;
function toast(msg) {
  let t = $('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function wireUi() {
  $('go').onclick = analyzeNow;
  $('fetch').onclick = fetchLyrics;
  document.querySelectorAll('.tab').forEach((b) => b.onclick = () => showTab(b.dataset.tab));
  document.querySelectorAll('.samples a').forEach((a) => a.onclick = () => {
    const s = SAMPLES[a.dataset.s]; $('text').value = s.text; $('title').value = s.title; $('artist').value = s.artist; $('fetchnote').textContent = '';
  });

  // единый делегированный обработчик кликов
  document.body.addEventListener('click', (e) => {
    const say = e.target.closest && e.target.closest('.say');
    if (say) { speak(say.getAttribute('data-say'), say); return; }
    const sa = e.target.closest && e.target.closest('.selall');
    if (sa) {
      const kind = sa.dataset.kind;
      const boxes = [...$('curate').querySelectorAll(`.sel[data-kind="${kind}"]`)];
      const anyOn = boxes.some((b) => b.checked);
      boxes.forEach((b) => { b.checked = !anyOn; });
      sa.textContent = anyOn ? 'выбрать все' : 'снять все';
      return;
    }
    if (e.target.id === 'saveBtn') { gatherAndSave(); return; }
    const del = e.target.closest && e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); doDelete(del.dataset.del); return; }
    const open = e.target.closest && e.target.closest('[data-open]');
    if (open) { openMaterial(open.dataset.open); return; }
    if (e.target.id === 'mvBack') { closeMaterial(); return; }
  });

  if (window.speechSynthesis) { pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice; }

  const drop = $('text');
  ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files[0];
    if (f) { const rd = new FileReader(); rd.onload = () => { drop.value = rd.result; if (!$('title').value) $('title').value = f.name.replace(/\.txt$/i, ''); }; rd.readAsText(f, 'utf-8'); }
  });
}

const HERO_CSS = `.lhero{display:flex;gap:14px;align-items:center;margin:0 0 20px;padding:18px;position:relative;overflow:hidden;
  background:linear-gradient(135deg,rgba(139,147,255,.16),rgba(169,139,255,.09) 60%,transparent),#161826;border:1px solid rgba(255,255,255,.07);border-radius:16px;}
.lseal{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex:none;font-size:1.9rem;color:#fff;
  background:linear-gradient(140deg,#8b93ff,#a98bff);box-shadow:0 6px 20px -4px rgba(139,147,255,.55),inset 0 0 0 1px rgba(255,255,255,.22);}
.lhero h1{margin:.08em 0;font-size:1.5rem;font-weight:700;letter-spacing:-.02em;color:#eaecf5;font-family:'Inter','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;}
.lkick{font-size:.63rem;letter-spacing:.18em;text-transform:uppercase;color:#8b93ff;font-weight:600;}
.lsub{color:#a0a4bd;font-size:.92rem;}
.songtext{background:#0c0d15;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px;
  font-family:'Inter','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;color:#a0a4bd;font-size:.98rem;line-height:1.7;}`;

function boot() {
  window.__kslBooted = true;
  init().catch((e) => { const msg = (e && (e.stack || e.message)) || e; if (window.__kslErr) window.__kslErr(msg); else console.error(e); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
