// Стили урока (дизайн «Свет ханджи»), общие для страницы и для скачиваемого HTML.
export const LESSON_CSS = `
:root{--paper:#f6f1e7;--paper2:#efe7d6;--ink:#20232f;--ink2:#3a3f52;--indigo:#2b3168;
  --indigo-soft:#5560a8;--seal:#b5443a;--line:#d8cdb4;--gold:#a9852f;--mark:#f4d58d;}
.lesson h2{font-size:1.2rem;margin:0 0 14px;display:flex;align-items:center;gap:10px;
  font-family:"Nanum Myeongjo","Noto Serif KR",Georgia,serif;color:var(--indigo);}
.lesson h2 .num{display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;
  background:var(--indigo);color:#fff;border-radius:50%;font-size:.9rem;flex:none;font-family:Georgia,serif;}
.lesson .block{margin:30px 0;}
.lesson mark{background:linear-gradient(transparent 55%,var(--mark) 55%);padding:0 1px;border-radius:2px;}
.say{border:0;background:transparent;cursor:pointer;font-size:.85em;padding:0 3px;opacity:.55;
  vertical-align:middle;line-height:1;filter:grayscale(.35);-webkit-tap-highlight-color:transparent;}
.say:active,.say.playing{opacity:1;filter:none;}
.overview{display:flex;flex-wrap:wrap;gap:10px;margin:6px 0 4px;}
.chip{background:#fff;border:1px solid var(--line);border-radius:11px;padding:9px 13px;
  display:flex;flex-direction:column;min-width:70px;flex:1;}
.chip b{font-size:1.35rem;color:var(--indigo);font-family:Georgia,serif;line-height:1;}
.chip span{font-size:.7rem;color:var(--ink2);margin-top:2px;}
.gcard{background:#fffdf8;border:1px solid var(--line);border-left:5px solid var(--seal);
  border-radius:13px;padding:16px 16px;margin-bottom:16px;}
.gcard-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;}
.ghangul{font-size:1.6rem;font-weight:700;color:var(--indigo);font-family:"Nanum Myeongjo","Noto Serif KR",serif;}
.gmeta{text-align:right;}.grom{color:var(--ink2);font-style:italic;font-size:.85rem;}
.badge{display:inline-block;margin-top:3px;background:var(--indigo);color:#fff;font-size:.68rem;padding:2px 9px;border-radius:20px;}
.gmean{font-size:1.05rem;font-weight:600;color:var(--seal);margin:6px 0 10px;}
.gstruct{margin:9px 0;font-size:.9rem;}
.gstruct .lbl,.conj .lbl{display:inline-block;font-size:.64rem;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);margin-right:7px;}
.gstruct code{background:var(--paper2);padding:2px 8px;border-radius:6px;font-size:.9rem;}
.gexpl{margin:10px 0;color:var(--ink2);font-size:.96rem;}
.conj{background:#f3f0fa;border-radius:9px;padding:10px 12px;font-size:.9rem;margin:10px 0;}
.songbox{background:linear-gradient(#fff,#fbf6ea);border:1px dashed var(--line);border-radius:10px;padding:11px 13px;margin:12px 0;}
.songbox-lbl{font-size:.64rem;text-transform:uppercase;letter-spacing:.12em;color:var(--seal);margin-bottom:5px;}
.songline{font-family:"Nanum Myeongjo","Noto Serif KR",serif;font-size:1.02rem;padding:2px 0;}
.exs{margin:11px 0 3px;display:grid;gap:7px;}
.ex{background:#fff;border:1px solid var(--line);border-radius:9px;padding:8px 11px;}
.ex-ko{font-family:"Nanum Myeongjo",serif;font-size:1rem;color:var(--indigo);}
.ex-rom{font-size:.76rem;color:#98917f;font-style:italic;}.ex-ru{font-size:.9rem;color:var(--ink2);margin-top:2px;}
.note{margin-top:12px;background:#fff6e2;border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:9px 12px;font-size:.9rem;color:#6b5720;}
.wordgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}
.wcard{background:#fff;border:1px solid var(--line);border-radius:11px;padding:11px 13px;}
.wtop{display:flex;justify-content:space-between;align-items:baseline;gap:6px;}
.wtools{display:flex;align-items:center;gap:5px;flex:none;}
.wko{font-family:"Nanum Myeongjo","Noto Serif KR",serif;font-size:1.25rem;color:var(--indigo);font-weight:700;}
.wlvl{font-size:.62rem;background:var(--paper2);color:var(--gold);padding:1px 6px;border-radius:9px;}
.wrom{font-size:.74rem;color:#98917f;font-style:italic;margin:1px 0 5px;}
.wru{font-size:.94rem;}.dim{color:#b3ab97;font-weight:400;}
.phrasegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;}
.pcard{background:#fffdf8;border:1px solid var(--line);border-radius:11px;padding:12px 14px;border-top:3px solid var(--indigo-soft);}
.pko{font-family:"Nanum Myeongjo","Noto Serif KR",serif;font-size:1.15rem;color:var(--indigo);font-weight:700;}
.preg{font-size:.62rem;background:#eee9db;color:var(--ink2);padding:1px 6px;border-radius:9px;vertical-align:middle;}
.prom{font-size:.74rem;color:#98917f;font-style:italic;}.pru{margin-top:3px;}
.pnote{margin-top:5px;font-size:.8rem;color:var(--ink2);border-top:1px dotted var(--line);padding-top:5px;}
.kline{background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 15px;margin-bottom:12px;}
.kko{font-family:"Nanum Myeongjo","Noto Serif KR",serif;font-size:1.2rem;color:var(--indigo);}
.krom{font-size:.78rem;color:#98917f;font-style:italic;margin:2px 0 9px;}
.kgloss{display:flex;flex-wrap:wrap;gap:6px;}
.gl{background:var(--paper2);border-radius:8px;padding:3px 9px;font-size:.82rem;}
.gl b{color:var(--indigo);margin-right:5px;font-family:"Nanum Myeongjo",serif;}
.ktr{margin-top:10px;color:var(--seal);font-size:.98rem;border-top:1px dotted var(--line);padding-top:8px;}
.tasks{display:grid;gap:13px;}
.task{background:#fffdf8;border:1px solid var(--line);border-radius:12px;padding:14px 16px;}
.task h3{margin:0 0 9px;font-size:.95rem;color:var(--indigo);}
.task ol{margin:0;padding-left:20px;}.task li{margin:6px 0;}
.matchlist{list-style:none;padding:0;}
.matchlist li{display:flex;align-items:baseline;gap:10px;margin:7px 0;flex-wrap:wrap;}
.tko{font-family:"Nanum Myeongjo",serif;font-size:1.1rem;color:var(--indigo);min-width:60px;}
.trom{font-size:.74rem;color:#98917f;font-style:italic;min-width:80px;}
.tblank{flex:1;border-bottom:1px dotted var(--ink2);min-width:80px;}
.tgram{display:inline-block;background:var(--indigo);color:#fff;font-size:.68rem;padding:1px 8px;border-radius:9px;margin-right:7px;}
.tans{display:block;font-size:.78rem;color:var(--gold);margin-top:2px;}
`;
