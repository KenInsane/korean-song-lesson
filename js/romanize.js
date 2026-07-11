// Романизация хангыля (Revised Romanization, по слогам). Порт romanize.py.
// Приближённая транскрипция для учебной подсказки (без межслоговой фонетики).

const CHO = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const JUNG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const JONG = ['','k','k','k','n','n','n','t','l','k','m','l','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];

const SBASE = 0xAC00, SCOUNT = 11172, JUNG_N = 21, JONG_N = 28;

export function romanize(text) {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) - SBASE;
    if (code >= 0 && code < SCOUNT) {
      const jong = code % JONG_N;
      const jung = Math.floor(code / JONG_N) % JUNG_N;
      const cho = Math.floor(code / JONG_N / JUNG_N);
      out += CHO[cho] + JUNG[jung] + JONG[jong];
    } else {
      out += ch;
    }
  }
  return out;
}
