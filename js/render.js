// Порт koreanlesson/render.py (HTML) для мобильного приложения. Возвращает строку
// HTML урока (вставляется в контейнер; стили — в index.html). 🔊 = озвучка.

const POS_RU = {
  noun: 'сущ.', verb: 'глаг.', adjective: 'прил.', adverb: 'нареч.',
  pronoun: 'мест.', numeral: 'числ.', counter: 'счётн.',
  determiner: 'опред.', interjection: 'межд.', '': '',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function say(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  return `<button class="say" type="button" data-say="${esc(t)}" aria-label="Озвучить">🔊</button>`;
}

function highlight(text, spans) {
  if (!spans || !spans.length) return esc(text);
  const s = [...spans].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const [a, b] of s) {
    if (merged.length && a <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b);
    } else merged.push([a, b]);
  }
  let out = '', cur = 0;
  for (let [a, b] of merged) {
    a = Math.max(a, cur);
    if (a > cur) out += esc(text.slice(cur, a));
    out += `<mark>${esc(text.slice(a, b))}</mark>`;
    cur = b;
  }
  out += esc(text.slice(cur));
  return out;
}

export function renderLesson(lesson) {
  const P = [];
  const s = lesson.stats;

  P.push(`<div class="overview">
    <div class="chip"><b>${s.total_lines}</b><span>строк</span></div>
    <div class="chip"><b>${lesson.grammar.length}</b><span>граммат.</span></div>
    <div class="chip"><b>${lesson.words.length}</b><span>слов</span></div>
    <div class="chip"><b>${s.phrases_found}</b><span>фраз</span></div>
  </div>`);

  // Грамматика
  P.push('<section class="block"><h2><span class="num">1</span>Грамматика</h2>');
  for (const gh of lesson.grammar) {
    const g = gh.grammar;
    const byLine = new Map();
    for (const o of gh.occurrences) {
      if (!byLine.has(o.line_idx)) byLine.set(o.line_idx, { text: o.text, spans: [] });
      byLine.get(o.line_idx).spans.push(o.span);
    }
    let songLines = '';
    for (const [, d] of [...byLine.entries()].sort((a, b) => a[0] - b[0])) {
      songLines += `<div class="songline">${highlight(d.text, d.spans)} ${say(d.text)}</div>`;
    }
    let examples = '';
    for (const ex of (g.examples || [])) {
      examples += `<div class="ex"><div class="ex-ko">${esc(ex.ko)} ${say(ex.ko)}</div>` +
        `<div class="ex-rom">${esc(ex.romanization)}</div><div class="ex-ru">${esc(ex.ru)}</div></div>`;
    }
    const notes = g.notes_ru ? `<div class="note">💡 ${esc(g.notes_ru)}</div>` : '';
    const conj = g.conjugation_ru ? `<div class="conj"><span class="lbl">Как образуется</span>${esc(g.conjugation_ru)}</div>` : '';
    P.push(`<article class="gcard">
      <div class="gcard-top"><div class="ghangul">${esc(g.name)}</div>
        <div class="gmeta"><div class="grom">${esc(g.romanization)}</div><span class="badge">${esc(g.level)}</span></div></div>
      <div class="gmean">${esc(g.meaning_ru)}</div>
      <div class="gstruct"><span class="lbl">Структура</span><code>${esc(g.structure)}</code></div>
      <p class="gexpl">${esc(g.explanation_ru)}</p>${conj}
      <div class="songbox"><div class="songbox-lbl">В этой песне</div>${songLines}</div>
      <div class="exs">${examples}</div>${notes}</article>`);
  }
  P.push('</section>');

  // Слова
  P.push('<section class="block"><h2><span class="num">2</span>Полезные слова</h2><div class="wordgrid">');
  for (const w of lesson.words) {
    const pos = POS_RU[w.pos] || w.pos;
    const lvl = (w.level && w.level !== '-') ? `<span class="wlvl">${esc(w.level)}</span>` : '';
    const ru = w.ru ? esc(w.ru) : '<i class="dim">— (нет в словаре)</i>';
    P.push(`<div class="wcard"><div class="wtop"><span class="wko">${esc(w.word)}</span>
      <span class="wtools">${say(w.word)}${lvl}</span></div>
      <div class="wrom">${esc(w.romanization)} · ${esc(pos)}</div><div class="wru">${ru}</div></div>`);
  }
  P.push('</div></section>');

  // Фразы
  if (lesson.phrases.length) {
    P.push('<section class="block"><h2><span class="num">3</span>Полезные фразы</h2><div class="phrasegrid">');
    for (const ph of lesson.phrases) {
      const note = ph.note_ru ? `<div class="pnote">${esc(ph.note_ru)}</div>` : '';
      const reg = ph.register ? `<span class="preg">${esc(ph.register)}</span>` : '';
      P.push(`<div class="pcard"><div class="pko">${esc(ph.phrase)} ${say(ph.phrase)} ${reg}</div>
        <div class="prom">${esc(ph.romanization)}</div><div class="pru">${esc(ph.ru)}</div>${note}</div>`);
    }
    P.push('</div></section>');
  }

  // Разбор строк
  if (lesson.key_lines.length) {
    P.push('<section class="block"><h2><span class="num">4</span>Разбор строк</h2>');
    for (const kl of lesson.key_lines) {
      let chips = '';
      for (const g of kl.gloss) if (g.is_content && g.ru) chips += `<span class="gl"><b>${esc(g.form)}</b>${esc(g.ru)}</span>`;
      const tr = kl.translation_ru ? `<div class="ktr">→ ${esc(kl.translation_ru)}</div>` : '';
      P.push(`<div class="kline"><div class="kko">${esc(kl.text)} ${say(kl.text)}</div>
        <div class="krom">${esc(kl.romanization)}</div><div class="kgloss">${chips}</div>${tr}</div>`);
    }
    P.push('</section>');
  }

  // Задания
  const ex = lesson.exercises;
  P.push('<section class="block"><h2><span class="num">5</span>Задания</h2><div class="tasks">');
  if (ex.matching.length) {
    const rows = ex.matching.map((m) => `<li><span class="tko">${esc(m.word)}</span>` +
      `<span class="trom">${esc(m.romanization)}</span><span class="tblank">__________</span></li>`).join('');
    P.push(`<div class="task"><h3>1 · Соедини слово и перевод</h3><ol class="matchlist">${rows}</ol></div>`);
  }
  if (ex.grammar_fill.length) {
    const rows = ex.grammar_fill.map((gf) => `<li><span class="tgram">${esc(gf.grammar)}</span>${esc(gf.prompt)}` +
      `<span class="tans">ответ: ${esc(gf.answer)}</span></li>`).join('');
    P.push(`<div class="task"><h3>2 · Вставь грамматику</h3><ol>${rows}</ol></div>`);
  }
  if (ex.translate.length) {
    const rows = ex.translate.map((t) => `<li>${esc(t.ko)}${t.ru ? `<span class="tans">${esc(t.ru)}</span>` : ''}</li>`).join('');
    P.push(`<div class="task"><h3>3 · Переведи на русский</h3><ol>${rows}</ol></div>`);
  }
  if (ex.open.length) {
    P.push(`<div class="task"><h3>4 · Творческое</h3><ol>${ex.open.map((o) => `<li>${esc(o.task)}</li>`).join('')}</ol></div>`);
  }
  P.push('</div></section>');

  return P.join('');
}

// Экспорт карточек для Anki: TSV (Front<TAB>Back), Anki импортирует напрямую.
export function ankiTsv(lesson) {
  const rows = [];
  const clean = (s) => String(s || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
  for (const gh of lesson.grammar) {
    const g = gh.grammar;
    const ex = (g.examples && g.examples[0]) || {};
    rows.push([clean(g.name), clean(`${g.meaning_ru} — ${g.structure}. Пример: ${ex.ko || ''} (${ex.ru || ''})`)].join('\t'));
  }
  for (const w of lesson.words) if (w.ru) rows.push([clean(w.word), clean(`${w.ru} [${w.romanization}]`)].join('\t'));
  for (const ph of lesson.phrases) rows.push([clean(ph.phrase), clean(`${ph.ru} [${ph.romanization}]`)].join('\t'));
  return rows.join('\n');
}
