// Порт koreanlesson/lesson.py. Собирает урок из Analysis.
import { romanize } from './romanize.js';
import { baseTag, norm, CONTENT_TAGS, NOUN_TAGS, VERBALIZERS } from './analyzer.js';

function selectDiverseGrammar(hits, n) {
  const selected = [];
  const picked = new Map(); // line_idx -> [[a,b]]
  for (const gh of hits) {
    if (selected.length >= n) break;
    let overlap = 0;
    for (const o of gh.occurrences) {
      const [a, b] = o.span;
      const spans = picked.get(o.line_idx) || [];
      if (spans.some(([x, y]) => !(b <= x || a >= y))) overlap++;
    }
    const frac = overlap / Math.max(1, gh.occurrences.length);
    if (selected.length && frac > 0.6) continue;
    selected.push(gh);
    for (const o of gh.occurrences) {
      const spans = picked.get(o.line_idx) || [];
      spans.push(o.span); picked.set(o.line_idx, spans);
    }
  }
  if (selected.length < n) {
    for (const gh of hits) {
      if (!selected.includes(gh)) { selected.push(gh); if (selected.length >= n) break; }
    }
  }
  return selected;
}

function contentForms(line) {
  const forms = new Set();
  const toks = line.tokens.map(norm);
  const n = toks.length;
  let i = 0;
  while (i < n) {
    const t = toks[i];
    const bt = baseTag(t.tag);
    if (NOUN_TAGS.has(bt) && i + 1 < n && VERBALIZERS.has(baseTag(toks[i + 1].tag))) {
      const suffix = toks[i + 1].form.startsWith('되') ? '되다' : '하다';
      forms.add(t.form + suffix); i += 2; continue;
    }
    if (CONTENT_TAGS.has(bt)) {
      if (bt === 'VV' || bt === 'VA') forms.add(t.lemma || t.form);
      else forms.add(t.form);
    }
    i++;
  }
  return forms;
}

function buildKeyLine(line, analyzer) {
  const gloss = [];
  const toks = line.tokens.map(norm);
  const n = toks.length;
  let i = 0;
  while (i < n) {
    const t = toks[i];
    const bt = baseTag(t.tag);
    if (NOUN_TAGS.has(bt) && i + 1 < n && VERBALIZERS.has(baseTag(toks[i + 1].tag))) {
      const suffix = toks[i + 1].form.startsWith('되') ? '되다' : '하다';
      const key = t.form + suffix;
      const entry = analyzer.vocabLookup.get(key) || analyzer.vocabLookup.get(t.form);
      gloss.push({ form: t.form + toks[i + 1].form, ru: entry ? (entry.ru || '') : '', is_content: true });
      i += 2; continue;
    }
    if (CONTENT_TAGS.has(bt)) {
      const key = (bt === 'VV' || bt === 'VA') ? (t.lemma || t.form) : t.form;
      const entry = analyzer.vocabLookup.get(key) || analyzer.vocabLookup.get(t.form);
      gloss.push({ form: t.form, ru: entry ? (entry.ru || '') : '', is_content: true });
    }
    i++;
  }
  return { idx: line.idx, text: line.text, romanization: romanize(line.text), gloss, translation_ru: '' };
}

function buildExercises(grammar, words, phrases, keyLines) {
  const ex = { matching: [], grammar_fill: [], translate: [], open: [] };
  for (const w of words.slice(0, 8)) if (w.ru) ex.matching.push({ word: w.word, romanization: w.romanization, ru: w.ru });
  for (const gh of grammar) {
    const occ = gh.occurrences[0];
    if (occ) {
      ex.grammar_fill.push({
        grammar: gh.grammar.name || '', prompt: occ.text.replace(occ.matched, '____'),
        answer: occ.matched, full: occ.text,
      });
    }
  }
  for (const ph of phrases.slice(0, 3)) ex.translate.push({ ko: ph.phrase, ru: ph.ru || '' });
  for (const kl of keyLines.slice(0, 3)) ex.translate.push({ ko: kl.text, ru: kl.translation_ru });
  for (const gh of grammar) ex.open.push({
    grammar: gh.grammar.name || '',
    task: `Составь 1–2 своих предложения с конструкцией «${gh.grammar.name || ''}».`,
  });
  return ex;
}

export function buildLesson(analysis, analyzer, opts = {}) {
  const nGrammar = opts.nGrammar || 2;
  const nWords = opts.nWords || 12;
  const nKeyLines = opts.nKeyLines != null ? opts.nKeyLines : 6;

  const grammar = selectDiverseGrammar(analysis.grammar_hits, nGrammar);

  const withTr = analysis.vocab.filter((v) => v.from_dict && v.ru);
  const withoutTr = analysis.vocab.filter((v) => !(v.from_dict && v.ru));
  let words = withTr.slice(0, nWords);
  if (words.length < nWords) words = words.concat(withoutTr.slice(0, nWords - words.length));

  const topWordForms = new Set(words.map((w) => w.word));
  const chosenGrammarLines = new Set();
  for (const gh of grammar) for (const o of gh.occurrences) chosenGrammarLines.add(o.line_idx);

  const scored = [];
  for (const ln of analysis.lines) {
    if (!ln.text.trim()) continue;
    const cf = contentForms(ln);
    let nTop = 0;
    for (const f of cf) if (topWordForms.has(f)) nTop++;
    const score = nTop + (chosenGrammarLines.has(ln.idx) ? 3 : 0);
    if (score > 0) scored.push([score, ln]);
  }
  scored.sort((a, b) => b[0] - a[0] || b[1].idx - a[1].idx);

  const keyLines = [];
  const usedIdx = new Set();
  for (const [, ln] of scored) {
    if (usedIdx.has(ln.idx)) continue;
    usedIdx.add(ln.idx);
    keyLines.push(buildKeyLine(ln, analyzer));
    if (keyLines.length >= nKeyLines) break;
  }
  keyLines.sort((a, b) => a.idx - b.idx);

  const exercises = buildExercises(grammar, words, analysis.phrases_found, keyLines);

  const stats = {
    total_lines: analysis.lines.filter((l) => l.text.trim()).length,
    grammar_found: analysis.grammar_hits.length,
    unique_words: analysis.vocab.length,
    words_translated: analysis.vocab.filter((v) => v.from_dict && v.ru).length,
    phrases_found: analysis.phrases_found.length,
  };

  return {
    title: analysis.title || 'Без названия', artist: analysis.artist || '',
    backend: 'kiwi-nlp (WASM)', grammar, words, phrases: analysis.phrases_found,
    key_lines: keyLines, exercises, stats,
  };
}
