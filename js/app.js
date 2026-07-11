// KoreanSongLesson mobile — оркестровка: Kiwi-WASM + разбор + рендер урока.
import { KiwiBuilder, Match } from '../lib/index.js';
import { createAnalyzer } from './analyzer.js';
import { buildLesson } from './lesson.js';
import { renderLesson, ankiTsv } from './render.js';
import { LESSON_CSS } from './style.js?v=2';

const $ = (id) => document.getElementById(id);
// «Тонкая» модель (~39 МБ): без словарей имён собственных (default.dict/multi.dict) —
// для песен не критичны, зато меньше памяти и офлайн-кэша (важно для iOS). Проверено в Node.
const MODEL_FILES = ['combiningRule.txt', 'extract.mdl', 'sj.knlm', 'sj.morph', 'skipbigram.mdl', 'typo.dict'];
const MATCH = Match.allWithNormalizing;

let kiwi = null;
let analyzer = null;
let lastLesson = null;

const SAMPLES = {
  cheotnun: {
    title: '첫눈', artist: '(демо)', text:
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
잊지 않을게 영원히`,
  },
  arirang: {
    title: '아리랑', artist: '', text:
`아리랑 아리랑 아라리요
아리랑 고개로 넘어간다
나를 버리고 가시는 님은
십리도 못 가서 발병 난다`,
  },
};

function setStatus(msg) { $('status').textContent = msg; }

async function loadJson(p) { const r = await fetch(p); if (!r.ok) throw new Error('нет ' + p); return r.json(); }

function lmsg(t) { const el = $('loading-msg'); if (el) el.textContent = t; console.log('[ksl]', t); }

async function init() {
  lmsg('Инициализация…');
  // стили урока
  const st = document.createElement('style'); st.textContent = LESSON_CSS; document.head.appendChild(st);

  wireUi();

  // Service worker: свежий код (network-first без кэша) + офлайн после первой загрузки.
  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('./sw.js?v=3'); } catch (e) { /* ignore */ }
  }

  // база данных для разбора
  lmsg('Загружаю словари…');
  const [grammar, vocab, phrases, particles] = await Promise.all([
    loadJson('./data/grammar_db.json'), loadJson('./data/vocab_dict.json'),
    loadJson('./data/phrases.json'), loadJson('./data/particles.json'),
  ]);
  analyzer = createAnalyzer({ grammar, vocab, phrases, particles });
  console.log('[ksl] data ok:', grammar.length, 'grammar,', vocab.length, 'words');

  // Kiwi-WASM
  lmsg('Загружаю движок (WASM)…');
  const builder = await KiwiBuilder.create('./lib/kiwi-wasm.wasm');
  console.log('[ksl] wasm ok, version', builder.version());

  // Скачиваем файлы модели САМИ (байтами) — с прогрессом и проверкой, что это не
  // HTML-заглушка хостинга (частая причина вечной загрузки на статических хостингах).
  const modelFiles = {};
  let done = 0;
  for (const f of MODEL_FILES) {
    lmsg(`Загружаю модель… ${done}/${MODEL_FILES.length}  (${f})`);
    const r = await fetch('./model/' + f, { cache: 'force-cache' });
    if (!r.ok) throw new Error(`модель «${f}» не загрузилась: HTTP ${r.status}. Похоже, файл не залит на хостинг.`);
    const buf = new Uint8Array(await r.arrayBuffer());
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html') || (buf.length > 0 && buf[0] === 0x3c)) {
      throw new Error(`модель «${f}» пришла как HTML-страница (${buf.length} б), а не файл. ` +
        `Хостинг не отдаёт файлы из папки model/ — проверь, что она залилась целиком.`);
    }
    if (buf.length < 100) throw new Error(`модель «${f}» подозрительно мала (${buf.length} б) — файл не залился.`);
    modelFiles[f] = buf;
    done++;
  }
  lmsg('Собираю движок… (несколько секунд)');
  const t0 = performance.now();
  kiwi = await builder.build({ modelFiles, integrateAllomorph: true, loadDefaultDict: false, loadMultiDict: false });
  console.log('[ksl] kiwi built in', Math.round(performance.now() - t0), 'ms');
  $('loading').classList.add('hidden');
  $('go').disabled = false;
  setStatus('Готово к разбору');
}

function tokenizeLines(text) {
  const rawLines = text.replace(/\r/g, '').split('\n');
  return rawLines.map((t, i) => ({
    idx: i, text: t.replace(/\s+$/u, ''),
    tokens: t.trim() ? kiwi.tokenize(t, MATCH) : [],
    _nt: null,
  }));
}

function analyzeNow() {
  const text = $('text').value.trim();
  if (!text) { $('lesson').innerHTML = '<div class="err">Вставь текст песни.</div>'; return; }
  if (!kiwi) { setStatus('Движок ещё грузится…'); return; }
  const title = $('title').value.trim() || 'Песня';
  const artist = $('artist').value.trim();
  const opts = {
    nGrammar: +$('grammar').value || 2, nWords: +$('words').value || 12,
    nKeyLines: +$('keylines').value || 6,
  };
  setStatus('Разбор…');
  // небольшой таймаут, чтобы статус отрисовался
  setTimeout(() => {
    try {
      const lines = tokenizeLines(text);
      const an = analyzer.analyze(text, lines, title, artist);
      const lesson = buildLesson(an, analyzer, opts);
      lastLesson = lesson;
      const g = lesson.grammar.map((x) => x.grammar.name).join(' · ');
      setStatus(`Грамматики: ${g} · слов: ${lesson.words.length} · фраз: ${lesson.phrases.length}`);
      renderInto(lesson, title, artist);
    } catch (e) {
      $('lesson').innerHTML = '<div class="err">Ошибка разбора: ' + (e && e.message ? e.message : e) + '</div>';
      console.error(e);
    }
  }, 30);
}

function renderInto(lesson, title, artist) {
  const head = `<header class="lhero"><div class="lseal">學</div><div>
    <div class="lkick">노래로 배우는 한국어 · разбор</div>
    <h1>${escapeHtml(title)}</h1><div class="lsub">${escapeHtml(artist || 'корейская песня')}</div></div></header>`;
  $('lesson').innerHTML = '<div class="lesson">' + head + renderLesson(lesson) + '</div>';
  $('dls').innerHTML =
    '<button class="dl" id="dh">Скачать HTML</button>' +
    '<button class="dl" id="da">Anki (.txt)</button>';
  $('dh').onclick = () => download(fullDoc(lesson, title, artist), slug(title) + '.html', 'text/html');
  $('da').onclick = () => download(ankiTsv(lesson), slug(title) + '_anki.txt', 'text/plain');
  $('lesson').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fullDoc(lesson, title, artist) {
  const inner = document.querySelector('#lesson .lesson').outerHTML;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>
<style>body{margin:0;background:#0c0d15;color:#eaecf5;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;line-height:1.55}
.wrap{max-width:820px;margin:0 auto;padding:18px}${LESSON_CSS}${HERO_CSS}</style></head>
<body><div class="wrap">${inner}</div>${SAY_JS}</body></html>`;
}

// --- TTS (Web Speech API) ---
let voice = null;
function pickVoice() {
  if (!window.speechSynthesis) return;
  const vs = window.speechSynthesis.getVoices() || [];
  voice = vs.find((v) => v.lang && v.lang.toLowerCase().startsWith('ko')) ||
    vs.find((v) => /korean|한국/i.test(v.name)) || null;
}
function speak(text, btn) {
  if (!window.speechSynthesis) { alert('Браузер не поддерживает озвучку.'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR'; u.rate = 0.9; if (voice) u.voice = voice;
  if (btn) { btn.classList.add('playing'); u.onend = u.onerror = () => btn.classList.remove('playing'); }
  window.speechSynthesis.speak(u);
}

// --- LRCLIB fetch (best-effort; на телефоне может блокировать CORS) ---
async function fetchLyrics() {
  const title = $('title').value.trim();
  if (!title) { $('fetchnote').textContent = 'Сначала впиши название.'; return; }
  const artist = $('artist').value.trim();
  $('fetchnote').textContent = 'Ищу…';
  try {
    const q = encodeURIComponent((title + ' ' + artist).trim());
    const r = await fetch('https://lrclib.net/api/search?q=' + q);
    const arr = await r.json();
    const hit = (arr || []).find((h) => (h.plainLyrics || '').trim());
    if (!hit) { $('fetchnote').textContent = 'Ничего не нашлось.'; return; }
    $('text').value = hit.plainLyrics.trim();
    $('title').value = hit.trackName || title;
    if (hit.artistName) $('artist').value = hit.artistName;
    $('fetchnote').innerHTML = `Найдено: <b>${escapeHtml(hit.trackName)} — ${escapeHtml(hit.artistName)}</b>. ` +
      '<span class="warn">Текст защищён авторским правом — только для личного обучения.</span>';
  } catch (e) {
    $('fetchnote').innerHTML = '<span class="warn">Не удалось загрузить (возможно, ограничение сети/CORS). ' +
      'Вставь текст вручную.</span>';
  }
}

// --- helpers ---
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function slug(name) {
  const s = (name || '').trim().replace(/[^\w가-힣-]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return s || 'lesson';
}
function download(content, name, type) {
  const b = new Blob([content], { type: type + ';charset=utf-8' });
  const u = URL.createObjectURL(b); const a = document.createElement('a');
  a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500);
}

function wireUi() {
  $('go').onclick = analyzeNow;
  $('fetch').onclick = fetchLyrics;
  document.querySelectorAll('.samples a').forEach((a) => a.onclick = () => {
    const s = SAMPLES[a.dataset.s]; $('text').value = s.text; $('title').value = s.title; $('artist').value = s.artist;
    $('fetchnote').textContent = '';
  });
  // делегированная озвучка
  document.body.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.say');
    if (b) speak(b.getAttribute('data-say'), b);
  });
  if (window.speechSynthesis) { pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice; }
  // drag & drop файла
  const drop = $('text');
  ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files[0];
    if (f) { const rd = new FileReader(); rd.onload = () => { drop.value = rd.result; if (!$('title').value) $('title').value = f.name.replace(/\.txt$/i, ''); }; rd.readAsText(f, 'utf-8'); }
  });
}

const HERO_CSS = `.lhero{display:flex;gap:14px;align-items:center;margin:0 0 20px;padding:18px 18px;position:relative;overflow:hidden;
  background:linear-gradient(135deg,rgba(139,147,255,.16),rgba(169,139,255,.09) 60%,transparent),#161826;
  border:1px solid rgba(255,255,255,.07);border-radius:16px;}
.lseal{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex:none;
  font-size:1.9rem;font-family:'Nanum Myeongjo','Apple SD Gothic Neo',sans-serif;color:#fff;
  background:linear-gradient(140deg,#8b93ff,#a98bff);box-shadow:0 6px 20px -4px rgba(139,147,255,.55),inset 0 0 0 1px rgba(255,255,255,.22);}
.lhero h1{margin:.08em 0;font-size:1.5rem;font-weight:700;letter-spacing:-.02em;color:#eaecf5;
  font-family:'Inter','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;}
.lkick{font-size:.63rem;letter-spacing:.18em;text-transform:uppercase;color:#8b93ff;font-weight:600;}
.lsub{color:#a0a4bd;font-size:.92rem;}`;

const SAY_JS = `<script>(function(){var v=null;function pk(){if(!window.speechSynthesis)return;var s=speechSynthesis.getVoices()||[];
v=s.find(function(x){return x.lang&&x.lang.toLowerCase().indexOf('ko')===0})||null;}
if(window.speechSynthesis){pk();speechSynthesis.onvoiceschanged=pk;}
document.addEventListener('click',function(e){var b=e.target.closest?e.target.closest('.say'):null;if(!b)return;
var t=b.getAttribute('data-say');if(!t||!window.speechSynthesis)return;speechSynthesis.cancel();
var u=new SpeechSynthesisUtterance(t);u.lang='ko-KR';u.rate=0.9;if(v)u.voice=v;speechSynthesis.speak(u);});})();<\/script>`;

// Запуск: модульные скрипты выполняются после парсинга DOM, но подстрахуемся readyState.
function boot() {
  window.__kslBooted = true; // отключаем сторож-диагностику: модуль успешно запущен
  try {
    const st = document.createElement('style'); st.textContent = HERO_CSS; document.head.appendChild(st);
  } catch (e) { /* ignore */ }
  init().catch((e) => {
    const msg = (e && (e.stack || e.message)) || e;
    if (window.__kslErr) window.__kslErr(msg); else console.error(e);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
console.log('[ksl] app.js module evaluated');
