// Стили урока (тёмная тема, шрифт Inter), общие для страницы и для скачиваемого HTML.
export const LESSON_CSS = `
:root{--l-bg:#0c0d15;--l-surface:#161826;--l-surface2:#1c1f30;--l-border:rgba(255,255,255,.08);
  --l-text:#eaecf5;--l-text2:#a0a4bd;--l-text3:#6a6e88;--l-indigo:#8b93ff;--l-indigo2:#a98bff;
  --l-seal:#ff6b81;--l-gold:#e6bd80;--l-mark:rgba(139,147,255,.28);
  --l-font:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  --l-font-ko:'Inter','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',var(--l-font);}
.lesson{font-family:var(--l-font);color:var(--l-text);}
.lesson h2{font-size:1.2rem;margin:0 0 15px;display:flex;align-items:center;gap:11px;font-weight:700;letter-spacing:-.02em;color:var(--l-text);}
.lesson h2 .num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;
  background:linear-gradient(140deg,var(--l-indigo),var(--l-indigo2));color:#0c0d15;border-radius:9px;font-size:.9rem;flex:none;font-weight:700;}
.lesson .block{margin:32px 0;}
.lesson mark{background:linear-gradient(transparent 58%,var(--l-mark) 58%);color:inherit;padding:0 2px;border-radius:3px;}
.say{border:0;background:transparent;cursor:pointer;font-size:.9em;padding:0 4px;opacity:.5;vertical-align:middle;
  line-height:1;-webkit-tap-highlight-color:transparent;transition:.12s;}
.say:active,.say.playing{opacity:1;}
.overview{display:flex;flex-wrap:wrap;gap:9px;margin:6px 0 4px;}
.chip{background:var(--l-surface);border:1px solid var(--l-border);border-radius:13px;padding:11px 14px;display:flex;flex-direction:column;min-width:70px;flex:1;}
.chip b{font-size:1.45rem;color:var(--l-indigo);font-weight:800;line-height:1;letter-spacing:-.03em;}
.chip span{font-size:.68rem;color:var(--l-text3);margin-top:3px;}
.gcard{background:var(--l-surface);border:1px solid var(--l-border);border-left:3px solid var(--l-seal);
  border-radius:15px;padding:17px 17px;margin-bottom:15px;}
.gcard-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;}
.ghangul{font-size:1.55rem;font-weight:700;color:var(--l-indigo);font-family:var(--l-font-ko);letter-spacing:-.01em;}
.gmeta{text-align:right;}.grom{color:var(--l-text3);font-style:italic;font-size:.82rem;}
.badge{display:inline-block;margin-top:4px;background:rgba(139,147,255,.14);color:var(--l-indigo);font-size:.66rem;padding:3px 10px;border-radius:20px;font-weight:600;}
.gmean{font-size:1.05rem;font-weight:600;color:var(--l-seal);margin:7px 0 11px;}
.gstruct{margin:9px 0;font-size:.9rem;color:var(--l-text2);}
.gstruct .lbl,.conj .lbl{display:inline-block;font-size:.62rem;text-transform:uppercase;letter-spacing:.1em;color:var(--l-gold);margin-right:7px;font-weight:600;}
.gstruct code{background:var(--l-surface2);padding:2px 9px;border-radius:7px;font-size:.88rem;color:var(--l-text);font-family:ui-monospace,'SF Mono',monospace;}
.gexpl{margin:11px 0;color:var(--l-text2);font-size:.96rem;}
.conj{background:rgba(139,147,255,.07);border:1px solid var(--l-border);border-radius:10px;padding:10px 13px;font-size:.9rem;margin:11px 0;color:var(--l-text2);}
.songbox{background:var(--l-bg);border:1px solid var(--l-border);border-radius:11px;padding:12px 14px;margin:13px 0;}
.songbox-lbl{font-size:.62rem;text-transform:uppercase;letter-spacing:.12em;color:var(--l-seal);margin-bottom:6px;font-weight:600;}
.songline{font-family:var(--l-font-ko);font-size:1.02rem;padding:3px 0;color:var(--l-text);}
.exs{margin:11px 0 3px;display:grid;gap:7px;}
.ex{background:var(--l-surface2);border:1px solid var(--l-border);border-radius:10px;padding:9px 12px;}
.ex-ko{font-family:var(--l-font-ko);font-size:1rem;color:var(--l-indigo);}
.ex-rom{font-size:.75rem;color:var(--l-text3);font-style:italic;}.ex-ru{font-size:.9rem;color:var(--l-text2);margin-top:2px;}
.note{margin-top:12px;background:rgba(230,189,128,.08);border-left:2px solid var(--l-gold);border-radius:0 9px 9px 0;padding:9px 13px;font-size:.9rem;color:#e8cfa0;}
.wordgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}
.wcard{background:var(--l-surface);border:1px solid var(--l-border);border-radius:13px;padding:12px 14px;transition:.12s;}
.wcard:active{border-color:var(--l-indigo);}
.wtop{display:flex;justify-content:space-between;align-items:baseline;gap:6px;}
.wtools{display:flex;align-items:center;gap:5px;flex:none;}
.wko{font-family:var(--l-font-ko);font-size:1.25rem;color:var(--l-indigo);font-weight:700;}
.wlvl{font-size:.6rem;background:var(--l-surface2);color:var(--l-gold);padding:2px 7px;border-radius:9px;}
.wrom{font-size:.72rem;color:var(--l-text3);font-style:italic;margin:2px 0 5px;}
.wru{font-size:.94rem;color:var(--l-text);}.dim{color:var(--l-text3);font-weight:400;}
.phrasegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;}
.pcard{background:var(--l-surface);border:1px solid var(--l-border);border-radius:13px;padding:13px 15px;border-top:2px solid var(--l-indigo);}
.pko{font-family:var(--l-font-ko);font-size:1.15rem;color:var(--l-indigo);font-weight:700;}
.preg{font-size:.6rem;background:var(--l-surface2);color:var(--l-text2);padding:2px 7px;border-radius:9px;vertical-align:middle;}
.prom{font-size:.72rem;color:var(--l-text3);font-style:italic;}.pru{margin-top:3px;color:var(--l-text);}
.pnote{margin-top:6px;font-size:.8rem;color:var(--l-text2);border-top:1px solid var(--l-border);padding-top:6px;}
.kline{background:var(--l-surface);border:1px solid var(--l-border);border-radius:13px;padding:14px 16px;margin-bottom:12px;}
.kko{font-family:var(--l-font-ko);font-size:1.2rem;color:var(--l-text);}
.krom{font-size:.76rem;color:var(--l-text3);font-style:italic;margin:2px 0 9px;}
.kgloss{display:flex;flex-wrap:wrap;gap:6px;}
.gl{background:var(--l-surface2);border:1px solid var(--l-border);border-radius:9px;padding:4px 10px;font-size:.82rem;color:var(--l-text2);}
.gl b{color:var(--l-indigo);margin-right:5px;font-family:var(--l-font-ko);}
.ktr{margin-top:10px;color:var(--l-seal);font-size:.98rem;border-top:1px solid var(--l-border);padding-top:9px;}
.tasks{display:grid;gap:12px;}
.task{background:var(--l-surface);border:1px solid var(--l-border);border-radius:13px;padding:15px 16px;}
.task h3{margin:0 0 9px;font-size:.95rem;color:var(--l-indigo);font-weight:700;}
.task ol{margin:0;padding-left:20px;color:var(--l-text2);}.task li{margin:6px 0;}
.matchlist{list-style:none;padding:0;}
.matchlist li{display:flex;align-items:baseline;gap:10px;margin:8px 0;flex-wrap:wrap;}
.tko{font-family:var(--l-font-ko);font-size:1.1rem;color:var(--l-indigo);min-width:60px;}
.trom{font-size:.72rem;color:var(--l-text3);font-style:italic;min-width:80px;}
.tblank{flex:1;border-bottom:1px dashed var(--l-text3);min-width:80px;}
.tgram{display:inline-block;background:rgba(139,147,255,.14);color:var(--l-indigo);font-size:.66rem;padding:2px 8px;border-radius:9px;margin-right:7px;font-weight:600;}
.tans{display:block;font-size:.78rem;color:var(--l-gold);margin-top:2px;}
`;
