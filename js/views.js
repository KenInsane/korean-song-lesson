// Рендер экранов новой сути: курирование разбора, список материалов, просмотр материала.
const POS_RU = { noun: 'сущ.', verb: 'глаг.', adjective: 'прил.', adverb: 'нареч.',
  pronoun: 'мест.', numeral: 'числ.', counter: 'счётн.', determiner: 'опред.', interjection: 'межд.', '': '' };

export function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function say(t) {
  t = String(t || '').trim();
  return t ? `<button class="say" type="button" data-say="${esc(t)}" aria-label="Озвучить">🔊</button>` : '';
}
function highlight(text, spans) {
  if (!spans || !spans.length) return esc(text);
  const m = [...spans].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [a, b] of m) {
    if (merged.length && a <= merged[merged.length - 1][1]) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b);
    else merged.push([a, b]);
  }
  let out = '', cur = 0;
  for (let [a, b] of merged) { a = Math.max(a, cur); if (a > cur) out += esc(text.slice(cur, a)); out += `<mark>${esc(text.slice(a, b))}</mark>`; cur = b; }
  return out + esc(text.slice(cur));
}
function songLines(gh) {
  const byLine = new Map();
  for (const o of gh.occurrences) {
    if (!byLine.has(o.line_idx)) byLine.set(o.line_idx, { text: o.text, spans: [] });
    byLine.get(o.line_idx).spans.push(o.span);
  }
  let s = '';
  for (const [, d] of [...byLine.entries()].sort((a, b) => a[0] - b[0]))
    s += `<div class="songline">${highlight(d.text, d.spans)} ${say(d.text)}</div>`;
  return s;
}

// --- Курирование: показываем ВСЁ, пользователь отмечает нужное ---
export function renderCuration(analysis) {
  const P = [];
  const grams = analysis.grammar_hits;
  const words = analysis.vocab;
  const phrases = analysis.phrases_found;

  P.push(`<div class="curhead">
    <div><div class="curk">разбор песни</div><div class="curttl">${esc(analysis.title || 'Песня')}${analysis.artist ? ' · ' + esc(analysis.artist) : ''}</div></div>
  </div>`);
  P.push(`<p class="curintro">Отметь галочками, что оставить в учебном материале. Переводы слов можно поправить. Потом нажми «Сохранить».</p>`);

  // Грамматика
  P.push(`<div class="cursec"><div class="cursec-h"><h3>Грамматика <span class="cnt">${grams.length}</span></h3>
    <button class="selall" data-kind="grammar">снять все</button></div>`);
  if (!grams.length) P.push(`<div class="empty2">Грамматик не найдено.</div>`);
  for (const gh of grams) {
    const g = gh.grammar;
    P.push(`<div class="gcard sel-card">
      <input type="checkbox" class="sel" data-kind="grammar" data-id="${esc(g.id)}" checked aria-label="оставить ${esc(g.name)}">
      <div class="sel-body">
        <div class="gcard-top"><div class="ghangul">${esc(g.name)}</div>
          <div class="gmeta"><div class="grom">${esc(g.romanization)}</div><span class="badge">${esc(g.level)}</span></div></div>
        <div class="gmean">${esc(g.meaning_ru)}</div>
        <div class="gstruct"><span class="lbl">Структура</span><code>${esc(g.structure)}</code></div>
        <div class="songbox"><div class="songbox-lbl">в песне (${gh.occurrences.length})</div>${songLines(gh)}</div>
        <p class="gexpl">${esc(g.explanation_ru)}</p>
      </div></div>`);
  }
  P.push(`</div>`);

  // Слова
  P.push(`<div class="cursec"><div class="cursec-h"><h3>Слова <span class="cnt">${words.length}</span></h3>
    <button class="selall" data-kind="word">снять все</button></div>
    <div class="wordlist">`);
  if (!words.length) P.push(`<div class="empty2">Слов не найдено.</div>`);
  for (const w of words) {
    const checked = (w.from_dict && w.ru) ? 'checked' : '';
    P.push(`<div class="wrow">
      <input type="checkbox" class="sel" data-kind="word" data-word="${esc(w.word)}" ${checked}>
      <div class="wrow-ko"><span class="wko">${esc(w.word)}</span> ${say(w.word)}
        <div class="wrow-meta">${esc(w.romanization)} · ${esc(POS_RU[w.pos] || w.pos)}${w.level && w.level !== '-' ? ' · ' + esc(w.level) : ''}</div></div>
      <input class="wtr" data-word="${esc(w.word)}" value="${esc(w.ru)}" placeholder="перевод…">
    </div>`);
  }
  P.push(`</div></div>`);

  // Фразы
  if (phrases.length) {
    P.push(`<div class="cursec"><div class="cursec-h"><h3>Фразы <span class="cnt">${phrases.length}</span></h3>
      <button class="selall" data-kind="phrase">снять все</button></div><div class="wordlist">`);
    phrases.forEach((ph, i) => {
      P.push(`<div class="wrow">
        <input type="checkbox" class="sel" data-kind="phrase" data-idx="${i}" checked>
        <div class="wrow-ko"><span class="wko" style="font-size:1.05rem">${esc(ph.phrase)}</span> ${say(ph.phrase)}
          <div class="wrow-meta">${esc(ph.romanization)}</div></div>
        <input class="wtr" data-pidx="${i}" value="${esc(ph.ru)}" placeholder="перевод…">
      </div>`);
    });
    P.push(`</div></div>`);
  }

  P.push(`<div class="savebar"><button class="go" id="saveBtn">Сохранить материал</button></div>`);
  return P.join('');
}

// --- Список сохранённых материалов ---
export function renderSavedList(materials) {
  if (!materials.length) {
    return `<div class="empty3"><div class="empty3-i">📚</div>
      <div>Пока нет сохранённых материалов.</div>
      <div class="empty3-s">Разбери песню на вкладке «Разбор» и сохрани выбранное — оно появится здесь.</div></div>`;
  }
  const P = [];
  for (const m of materials) {
    const d = new Date(m.date);
    const ds = isNaN(d) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    P.push(`<div class="mcard" data-id="${esc(m.id)}">
      <div class="mcard-main" data-open="${esc(m.id)}">
        <div class="mcard-ttl">${esc(m.title)}${m.artist ? ' <span class="mcard-art">· ' + esc(m.artist) + '</span>' : ''}</div>
        <div class="mcard-meta">${m.grammars.length} граммат. · ${m.words.length} слов${m.phrases && m.phrases.length ? ' · ' + m.phrases.length + ' фраз' : ''}${ds ? ' · ' + ds : ''}</div>
      </div>
      <button class="mdel" data-del="${esc(m.id)}" aria-label="Удалить">🗑</button>
    </div>`);
  }
  return P.join('');
}

// --- Просмотр сохранённого материала ---
export function renderMaterial(m) {
  const P = [];
  P.push(`<div class="mvhead">
    <button class="mvback" id="mvBack">← Назад</button>
    <button class="mvdel" data-del="${esc(m.id)}">Удалить</button>
  </div>`);
  P.push(`<div class="lhero"><div class="lseal" style="font-family:'Nanum Myeongjo',serif">學</div>
    <div><div class="lkick">мой материал</div><h1>${esc(m.title)}</h1>
    <div class="lsub">${esc(m.artist || 'корейская песня')}</div></div></div>`);

  if (m.grammars.length) {
    P.push(`<div class="block"><h2><span class="num">1</span>Грамматика</h2>`);
    for (const g of m.grammars) {
      let ex = '';
      for (const e of (g.examples || []))
        ex += `<div class="ex"><div class="ex-ko">${esc(e.ko)} ${say(e.ko)}</div><div class="ex-rom">${esc(e.romanization)}</div><div class="ex-ru">${esc(e.ru)}</div></div>`;
      let inSong = '';
      for (const o of (g.occurrences || [])) inSong += `<div class="songline">${esc(o.line)} ${say(o.line)}</div>`;
      const notes = g.notes_ru ? `<div class="note">💡 ${esc(g.notes_ru)}</div>` : '';
      const conj = g.conjugation_ru ? `<div class="conj"><span class="lbl">Как образуется</span>${esc(g.conjugation_ru)}</div>` : '';
      P.push(`<article class="gcard">
        <div class="gcard-top"><div class="ghangul">${esc(g.name)}</div>
          <div class="gmeta"><div class="grom">${esc(g.romanization)}</div><span class="badge">${esc(g.level)}</span></div></div>
        <div class="gmean">${esc(g.meaning_ru)}</div>
        <div class="gstruct"><span class="lbl">Структура</span><code>${esc(g.structure)}</code></div>
        <p class="gexpl">${esc(g.explanation_ru)}</p>${conj}
        ${inSong ? `<div class="songbox"><div class="songbox-lbl">в песне</div>${inSong}</div>` : ''}
        <div class="exs">${ex}</div>${notes}</article>`);
    }
    P.push(`</div>`);
  }

  if (m.words.length) {
    P.push(`<div class="block"><h2><span class="num">2</span>Слова</h2><div class="wordgrid">`);
    for (const w of m.words) {
      const lvl = (w.level && w.level !== '-') ? `<span class="wlvl">${esc(w.level)}</span>` : '';
      P.push(`<div class="wcard"><div class="wtop"><span class="wko">${esc(w.word)}</span><span class="wtools">${say(w.word)}${lvl}</span></div>
        <div class="wrom">${esc(w.romanization)} · ${esc(POS_RU[w.pos] || w.pos)}</div>
        <div class="wru">${w.ru ? esc(w.ru) : '<i class="dim">—</i>'}</div></div>`);
    }
    P.push(`</div></div>`);
  }

  if (m.phrases && m.phrases.length) {
    P.push(`<div class="block"><h2><span class="num">3</span>Фразы</h2><div class="phrasegrid">`);
    for (const ph of m.phrases)
      P.push(`<div class="pcard"><div class="pko">${esc(ph.phrase)} ${say(ph.phrase)}</div>
        <div class="prom">${esc(ph.romanization)}</div><div class="pru">${esc(ph.ru)}</div></div>`);
    P.push(`</div></div>`);
  }

  P.push(`<div class="block"><h2><span class="num">${(m.phrases && m.phrases.length) ? 4 : 3}</span>Текст песни</h2>
    <div class="songtext">${esc(m.songText).replace(/\n/g, '<br>')}</div></div>`);
  return P.join('');
}
