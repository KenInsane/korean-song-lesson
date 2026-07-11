// Порт koreanlesson/analyzer.py на JS. Чистая логика: на вход — строки, уже
// размеченные kiwi-nlp (токены {str, tag, position, length}); на выход — Analysis.
import { romanize } from './romanize.js';

const NOUN_TAGS = new Set(['NNG', 'NNP']);
const PRED_TAGS = new Set(['VV', 'VA']);
const ADV_TAGS = new Set(['MAG', 'MAJ']);
const CONTENT_TAGS = new Set([...NOUN_TAGS, ...PRED_TAGS, ...ADV_TAGS, 'XR']);
const VERBALIZERS = new Set(['XSV', 'XSA']);
const CONTENT_BASE = new Set(['VV', 'VA', 'MAG', 'MAJ', 'MM', 'XR', 'SL', 'SH', 'SN', 'NR']);
const FUNC_BASE = new Set(['VX', 'XSV', 'XSA', 'VCP', 'VCN']);
const STEM_TAGS = new Set(['VV', 'VA', 'VX', 'XSV', 'XSA', 'XR', 'VCP', 'VCN']);
const LEMMA_TAGS = new Set(['VV', 'VA', 'VX', 'VCP', 'VCN']);
const VALIDATE_CATS = new Set(['ending', 'connective', 'tense', 'particle']);

const baseTag = (t) => t.split('-', 1)[0];
const isContent = (bt) => bt.startsWith('N') || CONTENT_BASE.has(bt);
const isFunctional = (bt) => !!bt && (bt[0] === 'E' || bt[0] === 'J' || FUNC_BASE.has(bt));

// Нормализация токена kiwi-nlp → форма как в Python (form/tag/start/end/lemma)
function norm(t) {
  const bt = baseTag(t.tag);
  const form = t.str;
  const lemma = LEMMA_TAGS.has(bt) ? form + '다' : form;
  return { form, tag: t.tag, start: t.position, end: t.position + t.length, lemma };
}

// --- морфемные якоря (порт MORPH_ANCHORS) ---
const R = 'ᆯ'; // соединительная ㄹ
const P = (tag = null, tagpre = null, forms = null) => ({ tag, tagpre, forms: forms ? new Set(forms) : null });

const MORPH_ANCHORS = {
  past_at_eotda: [[P('EP', null, ['았', '었', '였'])]],
  cause_aseo_eoseo: [[P('EC', null, ['아서', '어서', '여서'])]],
  present_polite_ayo_eoyo: [[P('EF', null, ['아요', '어요', '여요'])]],
  want_go_sipda: [[P('EC', null, ['고']), P('VX', null, ['싶'])]],
  progressive_go_itda: [[P('EC', null, ['고']), P('VX', null, ['있', '계시'])]],
  listing_go: [[P('EC', null, ['고'])]],
  eul_geyo: [[P('EF', null, [R + '게', R + '게요', '을게', '을게요'])]],
  suggestion_lkkayo: [[P('EF', null, [R + '까', R + '까요', '을까', '을까요'])]],
  condition_myeon: [[P('EC', null, ['면', '으면'])]],
  eumyeonseo: [[P('EC', null, ['면서', '으면서'])]],
  eun_nikka: [[P('EC', null, ['니까', '으니까'])]],
  but_jiman: [[P('EC', null, ['지만'])]],
  eun_nde: [[P('EC', null, ['는데', R + '데', '은데', 'ᆫ데'])]],
  ado_even_if: [[P('EC', null, ['아도', '어도', '여도'])]],
  jamaja_as_soon_as: [[P('EC', null, ['자마자'])]],
  gi_nominalizer: [[P('ETN', null, ['기'])]],
  gess: [[P('EP', null, ['겠'])]],
  neyo: [[P('EF', null, ['네', '네요'])], [P('EC', null, ['네'])]],
  deon_atteon_retrospective_past: [[P('ETM', null, ['던'])]],
  eul_ttae: [[P('ETM'), P(null, 'NN', ['때'])]],
  future_l_geoyeyo: [[P('ETM', null, [R, '을']), P(null, 'NN', ['거', '것'])]],
  eo_boda: [[P(null, 'E', ['아', '어', '여']), P('VX', null, ['보'])]],
  eo_juda: [[P(null, 'E', ['아', '어', '여']), P('VX', null, ['주'])]],
  negation_ji_anta: [[P('EC', null, ['지']), P(null, 'V', ['않'])]],
  cheoreom_gachi: [[P('JKB', null, ['처럼', '같이'])]],
  boda_comparison: [[P('JKB', null, ['보다'])]],
  copula_ida_anida: [[P('VCP'), P(null, 'E')], [P('VCN'), P(null, 'E')]],
  ina_or_as_much_as: [[P(null, 'J', ['나', '이나'])]],
  bakke_only_negative: [[P(null, 'J', ['밖에'])]],
};

function predMatch(pred, tok) {
  const bt = baseTag(tok.tag);
  if (pred.tag !== null && bt !== pred.tag) return false;
  if (pred.tagpre !== null && !bt.startsWith(pred.tagpre)) return false;
  if (pred.forms !== null && !pred.forms.has(tok.form)) return false;
  return true;
}

function matchMorph(tokens, sigs) {
  const spans = [];
  const n = tokens.length;
  for (const sig of sigs) {
    const L = sig.length;
    for (let i = 0; i + L <= n; i++) {
      let ok = true;
      for (let k = 0; k < L; k++) if (!predMatch(sig[k], tokens[i + k])) { ok = false; break; }
      if (!ok) continue;
      const starts = [], ends = [];
      for (let k = 0; k < L; k++) {
        if (tokens[i + k].start >= 0) starts.push(tokens[i + k].start);
        if (tokens[i + k].end >= 0) ends.push(tokens[i + k].end);
      }
      if (!starts.length || !ends.length) continue;
      let a = Math.min(...starts), b = Math.max(...ends);
      const firstBt = baseTag(tokens[i].tag);
      if (firstBt && firstBt[0] === 'E' && i > 0) {
        const prev = tokens[i - 1];
        if (STEM_TAGS.has(baseTag(prev.tag)) && prev.start >= 0 && prev.start <= a) a = prev.start;
      }
      if (b > a) spans.push([a, b]);
    }
  }
  return spans;
}

function validHit(span, tokens, category, name) {
  const [a, b] = span;
  const overlapping = tokens.filter((t) => t.start >= 0 && t.start < b && t.end > a);
  if (!overlapping.length) return true;
  for (const t of overlapping) {
    const bt = baseTag(t.tag);
    if (t.start <= a && b <= t.end && (a > t.start || b < t.end) && isContent(bt)) return false;
  }
  if (VALIDATE_CATS.has(category)) {
    if (name.includes('안') || name.includes('못')) return true;
    const tags = overlapping.map((t) => baseTag(t.tag));
    let ok;
    if (category === 'particle') ok = tags.some((bt) => bt[0] === 'J');
    else ok = tags.some((bt) => bt[0] === 'E' || FUNC_BASE.has(bt));
    if (!ok) return false;
  }
  return true;
}

function safeRe(pat) {
  try { return new RegExp(pat, 'g'); } catch (e) { return null; }
}

function buildParticleForms(particles) {
  const forms = new Set();
  for (const p of particles || []) {
    for (const part of (p.form || '').split('/')) {
      const s = part.trim();
      if (s) forms.add(s);
    }
  }
  return forms;
}

export function createAnalyzer(db) {
  const vocabLookup = new Map((db.vocab || []).map((v) => [v.word, v]));
  const stopwords = new Set((db.particles && db.particles.stopwords) || []);
  const particleForms = buildParticleForms((db.particles && db.particles.particles) || []);
  const grammarCompiled = (db.grammar || []).map((g) => ({
    g, pats: (g.detect || []).map(safeRe).filter(Boolean),
  }));
  const isStop = (w) => stopwords.has(w) || particleForms.has(w);

  function detectGrammar(lines) {
    const hits = [];
    for (const { g, pats } of grammarCompiled) {
      const category = g.category || '';
      const name = g.name || '';
      const sigs = MORPH_ANCHORS[g.id] || null;
      let occ = [];
      for (const ln of lines) {
        if (!ln.text.trim()) continue;
        const nt = ln._nt || (ln._nt = ln.tokens.map(norm)); // нормализованные токены
        for (const pat of pats) {
          pat.lastIndex = 0;
          let m;
          while ((m = pat.exec(ln.text)) !== null) {
            const span = [m.index, m.index + m[0].length];
            if (m[0].length === 0) { pat.lastIndex++; continue; }
            if (!validHit(span, nt, category, name)) continue;
            occ.push({ line_idx: ln.idx, text: ln.text, matched: m[0], span });
          }
        }
        if (sigs) {
          for (const span of matchMorph(nt, sigs)) {
            occ.push({ line_idx: ln.idx, text: ln.text, matched: ln.text.slice(span[0], span[1]), span });
          }
        }
      }
      if (occ.length) {
        // схлопываем пересекающиеся спаны (длиннее — в приоритете)
        occ.sort((x, y) => x.line_idx - y.line_idx || x.span[0] - y.span[0] ||
          (y.span[1] - y.span[0]) - (x.span[1] - x.span[0]));
        const byLine = new Map();
        const uniq = [];
        for (const o of occ) {
          const [a, b] = o.span;
          const spans = byLine.get(o.line_idx) || [];
          if (spans.some(([x, y]) => !(b <= x || a >= y))) continue;
          spans.push(o.span); byLine.set(o.line_idx, spans);
          uniq.push(o);
        }
        const usefulness = g.usefulness != null ? g.usefulness : 5;
        const score = usefulness + Math.min(uniq.length, 4) * 1.5;
        hits.push({ grammar: g, occurrences: uniq, score });
      }
    }
    hits.sort((x, y) => y.score - x.score);
    return hits;
  }

  function bump(counter, firstLine, posOf, key, lineIdx, pos) {
    counter.set(key, (counter.get(key) || 0) + 1);
    if (!firstLine.has(key)) { firstLine.set(key, lineIdx); posOf.set(key, pos); }
  }

  function extractVocab(lines) {
    const counter = new Map(), firstLine = new Map(), posOf = new Map();
    for (const ln of lines) {
      const toks = ln.tokens.map(norm);
      const n = toks.length;
      let i = 0;
      while (i < n) {
        const t = toks[i];
        const bt = baseTag(t.tag);
        if (NOUN_TAGS.has(bt) && i + 1 < n && VERBALIZERS.has(baseTag(toks[i + 1].tag))) {
          const stem = toks[i + 1].form;
          const suffix = stem.startsWith('되') ? '되다' : '하다';
          bump(counter, firstLine, posOf, t.form + suffix, ln.idx, 'verb');
          i += 2; continue;
        }
        if (CONTENT_TAGS.has(bt)) {
          let key, pos;
          if (NOUN_TAGS.has(bt) || bt === 'XR') { key = t.form; pos = 'noun'; }
          else if (bt === 'VV') { key = t.lemma; pos = 'verb'; }
          else if (bt === 'VA') { key = t.lemma; pos = 'adjective'; }
          else { key = t.form; pos = 'adverb'; }
          if (isStop(key) || isStop(t.form) || key.length < 1) { i++; continue; }
          if (key.length === 1 && !vocabLookup.has(key)) { i++; continue; }
          bump(counter, firstLine, posOf, key, ln.idx, pos);
        }
        i++;
      }
    }
    const items = [];
    for (const [key, cnt] of counter) {
      const entry = vocabLookup.get(key);
      if (entry) {
        items.push({
          word: key, romanization: entry.romanization || romanize(key),
          pos: entry.pos || posOf.get(key) || '', ru: entry.ru || '',
          count: cnt, level: entry.level || '-', example_line_idx: firstLine.get(key), from_dict: true,
        });
      } else {
        items.push({
          word: key, romanization: romanize(key), pos: posOf.get(key) || '',
          ru: '', count: cnt, level: '-', example_line_idx: firstLine.get(key), from_dict: false,
        });
      }
    }
    items.sort((a, b) =>
      (Number(b.from_dict) - Number(a.from_dict)) || (b.count - a.count) || (b.word.length - a.word.length));
    return items;
  }

  function matchPhrases(lines) {
    const joined = lines.map((l) => l.text).join('\n');
    const found = [], seen = new Set();
    for (const ph of (db.phrases || [])) {
      const p = (ph.phrase || '').trim();
      if (!p) continue;
      const core = p.replace(/[\s!?.…~]+$/u, '');
      if (core && joined.includes(core) && !seen.has(ph.phrase)) {
        const line = lines.find((l) => l.text.includes(core));
        found.push({ ...ph, line_idx: line ? line.idx : -1 });
        seen.add(ph.phrase);
      }
    }
    return found;
  }

  function analyze(rawText, tokenizedLines, title = '', artist = '') {
    // tokenizedLines: [{idx, text, tokens:[kiwiToken]}]
    const grammarHits = detectGrammar(tokenizedLines);
    const vocab = extractVocab(tokenizedLines);
    const phrasesFound = matchPhrases(tokenizedLines);
    return { title, artist, raw_text: rawText, lines: tokenizedLines, grammar_hits: grammarHits, vocab, phrases_found: phrasesFound };
  }

  return { analyze, grammar: db.grammar, vocabLookup, baseTag, norm,
    CONTENT_TAGS, NOUN_TAGS, VERBALIZERS };
}

export { baseTag, norm, CONTENT_TAGS, NOUN_TAGS, VERBALIZERS };
