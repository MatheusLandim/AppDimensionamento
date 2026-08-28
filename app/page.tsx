"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/* =====================================================================
   PROJECT AR — Prévia das telas do app (Fase 1+2)
   Editor de ambientes com o MOTOR calculando ao vivo.
   ===================================================================== */

/* ---- motor (porte de lib/calculo.ts) ---- */
const pKpa = (h) => 101.325 * Math.pow(1 - 2.25577e-5 * h, 5.25588);
const pvS = (T) => 0.61094 * Math.exp((17.625 * T) / (T + 243.04));
const rU = (T, UR, P) => { const pv = (UR / 100) * pvS(T); return (0.622 * pv) / (P - pv); };
const K = { pessoa: { repouso: { s: 65, l: 35 }, sentado_leve: { s: 70, l: 45 }, atividade_moderada: { s: 75, l: 55 }, exercicio: { s: 185, l: 315 } }, renovacao: { residencia: { pp: 2.5, pa: 0.3 }, escritorio: { pp: 2.5, pa: 0.3 }, academia: { pp: 10, pa: 0.3 } }, u: { parede: 2.5, vidro: 5.8, cobertura: 2 }, shgc: 0.82, dtP: { N: 14, L: 20, S: 10, O: 25 }, dtC: 40, rad: { N: 130, L: 500, S: 90, O: 520 }, fI: 0.85, cS: 1.23, cL: 3010 };
function calc(a, c) {
  const P = pKpa(c.altitude), dens = P / 101.325, dT = c.textBS - c.tInt;
  const dW = Math.max(0, rU(c.textBS, c.urExt, P) - rU(c.tInt, c.urInt, P));
  const pes = K.pessoa[a.atividade] || K.pessoa.atividade_moderada, ren = K.renovacao[a.categoria] || K.renovacao.residencia;
  const par = []; let s = 0, l = 0;
  const S = (n, w) => { const v = Math.round(w); par.push({ n, t: "S", w: v }); s += v; };
  const L = (n, w) => { const v = Math.round(w); par.push({ n, t: "L", w: v }); l += v; };
  S("Parede (sol-ar)", K.u.parede * a.paredeExtArea * K.dtP[a.orientacao]);
  if (a.coberturaExposta) S("Cobertura (sol-ar)", K.u.cobertura * a.area * K.dtC);
  S("Vidro condução", K.u.vidro * a.vidroArea * dT);
  S("Vidro radiação", a.vidroArea * K.shgc * K.rad[a.orientacao]);
  S("Pessoas (sens.)", a.nPessoas * pes.s);
  S("Iluminação", a.iluminacaoWm2 * a.area * K.fI);
  S("Equipamentos", a.equipamentosW);
  const vaz = ren.pp * a.nPessoas + ren.pa * a.area;
  S("Ar externo (sens.)", K.cS * dens * vaz * dT);
  L("Pessoas (lat.)", a.nPessoas * pes.l);
  L("Ar externo (lat.)", K.cL * dens * vaz * dW);
  const tot = s + l, fcs = tot > 0 ? s / tot : 1, wm2 = a.area > 0 ? tot / a.area : 0;
  const al = [];
  if (wm2 > 250) al.push(`Densidade ${Math.round(wm2)} W/m² alta`);
  if (fcs < 0.65 && tot > 0) al.push(`FCS ${fcs.toFixed(2)} baixo (latente alta)`);
  if (a.nPessoas === 0) al.push("Ocupação zero");
  return { par, s, l, tot, btu: Math.round(tot * 3.412142), fcs, wm2: Math.round(wm2), vaz: Math.round(vaz * 10) / 10, al };
}
const CAT = [["FXFSQ20", 6800], ["FXFSQ25", 8500], ["FXFSQ32", 10900], ["FXFSQ40", 13600], ["FXFSQ50", 17100], ["FXFSQ63", 21500], ["FXFSQ80", 27300], ["FXFSQ100", 34100], ["FXFSQ125", 42700], ["FXFSQ140", 47800]];
const selUI = (btu) => { const x = CAT.filter((c) => c[1] >= btu).sort((a, b) => a[1] - b[1])[0]; return x ? { m: x[0] + "AVM", cap: x[1] } : { m: "—", cap: 0 }; };
const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
const num = (s) => parseFloat(String(s).replace(",", ".")) || 0;

const COND = { textBS: 34, urExt: 60, tInt: 24, urInt: 50, altitude: 560 };
const AMB0 = [
  ["1.01", "Sala de Estar", "UE-1", 42.6, 3, 6, "atividade_moderada", "residencia", 10, 300, 18, "O", 8, false],
  ["1.02", "Sala de Jantar", "UE-1", 26, 3, 8, "atividade_moderada", "residencia", 10, 200, 12, "S", 5, false],
  ["1.03", "Cozinha", "UE-1", 21.8, 2.8, 3, "atividade_moderada", "residencia", 12, 1500, 8, "L", 3, false],
  ["1.04", "Home Theater", "UE-1", 24.5, 2.8, 6, "sentado_leve", "residencia", 8, 800, 6, "N", 2, false],
  ["1.05", "Suíte Master", "UE-1", 25, 2.8, 2, "repouso", "residencia", 10, 400, 12, "O", 5, true],
  ["1.14", "Suíte Cecília", "UE-1", 24, 2.8, 2, "repouso", "residencia", 12, 350, 11, "O", 4.5, true],
  ["1.07", "Escritório", "UE-1", 16.5, 2.8, 2, "sentado_leve", "escritorio", 14, 500, 8, "L", 3, false],
  ["2.08", "Academia", "UE-2", 34, 3, 4, "exercicio", "academia", 12, 600, 14, "L", 6, true],
  ["2.09", "Adega", "UE-2", 12.2, 2.6, 2, "sentado_leve", "residencia", 8, 1200, 5, "S", 1, false],
  ["2.10", "Suíte Hóspede 1", "UE-2", 22, 2.8, 2, "repouso", "residencia", 10, 300, 10, "N", 4, true],
  ["2.11", "Suíte Hóspede 2", "UE-2", 22, 2.8, 2, "repouso", "residencia", 10, 300, 10, "S", 4, true],
  ["2.12", "Sala de Massagem", "UE-2", 26, 2.8, 3, "sentado_leve", "residencia", 10, 250, 10, "L", 4, true],
  ["2.13", "Lavanderia", "UE-2", 9.5, 2.6, 1, "atividade_moderada", "residencia", 10, 800, 4, "S", 1, false],
].map(([tag, nome, ue, area, peDireito, nPessoas, atividade, categoria, iluminacaoWm2, equipamentosW, paredeExtArea, orientacao, vidroArea, coberturaExposta]) =>
  ({ id: tag, tag, nome, ue, area, peDireito, nPessoas, atividade, categoria, iluminacaoWm2, equipamentosW, paredeExtArea, orientacao, vidroArea, coberturaExposta }));

const PROJETOS = [
  { id: "fbv", nome: "Fazenda Boa Vista", codigo: "QVIII-L01-FBV", cliente: "Jordan e Juliana", local: "Porto Feliz / SP", status: "calculado", editavel: true },
  { id: "cvn", nome: "Cobertura Vila Nova", codigo: "CVN-024", cliente: "Almeida", local: "São Paulo / SP", status: "rascunho", editavel: false },
  { id: "efl", nome: "Escritório Faria Lima", codigo: "EFL-118", cliente: "Grupo Seta", local: "São Paulo / SP", status: "memorial_gerado", editavel: false },
  { id: "alp", nome: "Casa Alphaville", codigo: "ALP-076", cliente: "Tanaka", local: "Barueri / SP", status: "concluido", editavel: false },
];
const STATUS = { rascunho: ["Rascunho", "s-soft"], calculado: ["Calculado", "s-info"], memorial_gerado: ["Memorial gerado", "s-ok"], concluido: ["Concluído", "s-prim"] };
const ATIV = [["repouso", "Repouso"], ["sentado_leve", "Sentado leve"], ["atividade_moderada", "Moderada"], ["exercicio", "Exercício"]];
const ORI = [["N", "Norte"], ["L", "Leste"], ["S", "Sul"], ["O", "Oeste"]];
const CATEG = [["residencia", "Residência"], ["escritorio", "Escritório"], ["academia", "Academia"]];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
:root{--paper:#0a1b2e;--card:rgba(255,255,255,.055);--card2:rgba(255,255,255,.028);--ink:#e9f1f8;--ink-soft:#8ba6bf;--line:rgba(255,255,255,.11);--primary:#6fbfe0;--primary-deep:#a7dcef;--ice:rgba(120,200,227,.14);--ok:#47c98a;--warn:#e2ab45;--danger:#e5715f;--info:#66b4e6;--glow:0 10px 34px rgba(0,0,0,.30);--navy:#0b1c31;}
.light{--paper:#eef3f7;--card:#ffffff;--card2:#f7fafc;--ink:#12263f;--ink-soft:#5a7186;--line:#d5e0e8;--primary:#2e8bb0;--primary-deep:#1d6d8f;--ice:#dbeef5;--ok:#2c7a57;--warn:#b26a12;--danger:#b5372b;--info:#2e6ca6;--glow:0 6px 20px rgba(20,50,80,.10);}
*{box-sizing:border-box}
.app{font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:radial-gradient(1100px 560px at 12% -12%,rgba(111,191,224,.13),transparent 58%),radial-gradient(900px 500px at 100% 0%,rgba(30,109,143,.10),transparent 55%),var(--paper);min-height:100vh;display:grid;grid-template-columns:220px 1fr;transition:background .35s,color .35s}
.app.light{background:var(--paper)}
.sb{background:linear-gradient(180deg,#0c1e35,#081625);color:#fff;padding:16px 0;display:flex;flex-direction:column;min-height:100vh;position:sticky;top:0;border-right:1px solid rgba(255,255,255,.08)}
.sb-brand{padding:4px 18px 16px}.sb-brand .b{font-family:'Sora';font-weight:700;font-size:17px}.sb-brand .b span{color:#5fb4c9}
.sb-brand .s{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#8aa0ab;margin-top:2px}
.nav{padding:8px 10px;display:flex;flex-direction:column;gap:2px}
.nav button{font-family:'Inter';font-size:13.5px;font-weight:500;text-align:left;padding:9px 12px;background:transparent;border:none;color:#a8bccb;cursor:pointer;border-radius:7px;display:flex;gap:9px;align-items:center;transition:background .2s,color .2s}
.nav button:hover{background:rgba(255,255,255,.07);color:#fff}
.nav button.on{background:linear-gradient(135deg,#6fbfe0,#3f9dc4);color:#06243a;font-weight:600;box-shadow:0 4px 16px rgba(111,191,224,.32)}
.sb-user{margin-top:auto;padding:12px 16px;border-top:1px solid #263945;display:flex;align-items:center;gap:9px}
.av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6fbfe0,#3f9dc4);color:#06243a;font-family:'Sora';font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center}
.av.sm{width:22px;height:22px;font-size:10px;margin-left:-8px;border:1.5px solid var(--ink);background:#3a5563}
.sb-user .nm{font-size:12px}.sb-user .rl{font-size:10px;color:#8aa0ab}
.main{padding:22px 24px 60px;min-width:0}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:12px;flex-wrap:wrap}
.h1{font-family:'Sora';font-weight:600;font-size:22px}
.crumb{font-family:'IBM Plex Mono';font-size:11px;color:var(--ink-soft);margin-bottom:4px;cursor:pointer}
.crumb:hover{color:var(--primary)}
.btn{font-family:'Sora';font-weight:600;font-size:13px;padding:9px 15px;background:var(--ink);color:#fff;border:none;cursor:pointer;border-radius:4px}
.btn.pri{background:var(--primary)}.btn.gh{background:var(--card);color:var(--ink);border:1px solid var(--ink)}
.badge{font-family:'Sora';font-weight:600;font-size:10px;padding:3px 9px;border-radius:3px;color:#fff;white-space:nowrap}
.s-soft{background:var(--ink-soft)}.s-info{background:var(--info)}.s-ok{background:var(--ok)}.s-prim{background:var(--primary-deep)}
.s-warn{background:var(--warn)}.s-danger{background:var(--danger)}
/* project cards */
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.pcard{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--primary);padding:14px 16px;cursor:pointer}
.pcard:hover{border-color:var(--primary)}
.pcard .code{font-family:'IBM Plex Mono';font-size:11px;color:var(--primary-deep)}
.pcard .nm{font-family:'Sora';font-weight:600;font-size:16px;margin:3px 0 6px}
.pcard .cl{font-size:12px;color:var(--ink-soft)}
.pcard .ft{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.pcard .mt{font-family:'IBM Plex Mono';font-size:12px;color:var(--ink-soft)}
/* subtabs */
.subtabs{display:flex;gap:0;border-bottom:1.5px solid var(--ink);margin-bottom:18px}
.subtab{font-family:'Sora';font-weight:600;font-size:13.5px;padding:10px 16px;background:transparent;border:none;cursor:pointer;color:var(--ink-soft);border-bottom:3px solid transparent;margin-bottom:-1.5px}
.subtab.on{color:var(--ink);border-bottom-color:var(--primary)}
/* editor master-detail */
.md{display:grid;grid-template-columns:320px 1fr;gap:16px}
.list{border:1px solid var(--line);background:var(--card);max-height:620px;overflow-y:auto}
.li{display:flex;align-items:center;gap:9px;padding:9px 12px;border-bottom:1px solid var(--line);cursor:pointer;font-size:13px}
.li:last-child{border-bottom:none}.li:hover{background:var(--ice)}.li.on{background:var(--ice);box-shadow:inset 3px 0 0 var(--primary)}
.li .tg{font-family:'IBM Plex Mono';font-size:11px;color:var(--primary-deep);min-width:34px}
.li .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.li .bt{font-family:'IBM Plex Mono';font-size:11px;color:var(--ink-soft)}
.li .dot{width:7px;height:7px;border-radius:50%}
.liadd{padding:10px 12px;text-align:center;font-size:12.5px;color:var(--primary);cursor:pointer;font-family:'IBM Plex Mono'}
.liadd:hover{background:var(--ice)}
.edit{border:1px solid var(--line);background:var(--card)}
.edit-h{padding:12px 15px;border-bottom:1.5px solid var(--ink);display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
.edit-h .nm{font-family:'Sora';font-weight:600;font-size:16px}
.edit-h .tg{font-family:'IBM Plex Mono';font-size:11px;color:var(--ink-soft)}
.form{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line)}
.fld{background:var(--card);padding:8px 12px;display:flex;flex-direction:column;gap:3px}
.fld label{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft)}
.fld .inp{font-family:'IBM Plex Mono';font-size:13.5px;font-weight:500;border:1px solid var(--line);padding:5px 7px;background:var(--card2);color:var(--ink);width:100%;border-radius:4px;transition:border-color .2s,box-shadow .2s}
.fld .inp:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(111,191,224,.18)}
.chk{display:flex;align-items:center;gap:7px;font-family:'IBM Plex Mono';font-size:12.5px;cursor:pointer;padding-top:16px}
.res{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line)}
.rc{padding:10px 13px;border-right:1px solid var(--line)}.rc:last-child{border-right:none}
.rc .k{font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-soft)}
.rc .v{font-family:'IBM Plex Mono';font-size:19px;font-weight:600;margin-top:2px;line-height:1}
.rc .u{font-size:11px;color:var(--ink-soft)}
.brk{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--line);font-size:12px}
.brk .cl{border-right:1px solid var(--line)}.brk .cl:last-child{border-right:none}
.brk .ch{font-family:'Sora';font-weight:600;font-size:11px;padding:7px 13px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between}
.brk .pr{display:flex;justify-content:space-between;padding:4px 13px;color:var(--ink-soft)}
.brk .pr .pv{font-family:'IBM Plex Mono';color:var(--ink)}
.al{display:flex;gap:8px;padding:8px 13px;background:#fbf4e9;border-top:1px solid var(--warn);color:#7a4a0d;font-size:12px}
/* balanço */
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.ue{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--primary)}
.ue.warn{border-top-color:var(--warn)}.ue.danger{border-top-color:var(--danger)}
.ue-h{display:flex;justify-content:space-between;align-items:baseline;padding:13px 15px 2px}
.ue-tag{font-family:'Sora';font-weight:700;font-size:16px}.ue-md{font-family:'IBM Plex Mono';font-size:11px;color:var(--ink-soft)}
.gr{display:flex;justify-content:center}.grd{text-align:center;margin-top:-38px;margin-bottom:8px}
.gp{font-family:'IBM Plex Mono';font-weight:600;font-size:26px;line-height:1}.gl{font-size:9px;letter-spacing:.15em;text-transform:uppercase;margin-top:3px;font-weight:600}
.st{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line)}
.st .c{padding:9px 15px;border-right:1px solid var(--line)}.st .c:nth-child(2n){border-right:none}
.st .k{font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-soft)}.st .v{font-family:'IBM Plex Mono';font-size:14px;font-weight:500;margin-top:2px}
/* relatorios */
.rel{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:640px}
.rcard{border:1px solid var(--line);background:var(--card);padding:16px;display:flex;flex-direction:column;gap:10px}
.rcard .ic{font-family:'IBM Plex Mono';font-weight:600;font-size:13px;color:#fff;padding:5px 9px;border-radius:3px;align-self:flex-start}
.i-xls{background:var(--ok)}.i-doc{background:var(--danger)}
.rcard .tt{font-family:'Sora';font-weight:600;font-size:15px}.rcard .ss{font-size:12px;color:var(--ink-soft);flex:1}
.toast{background:var(--ice);border:1px solid var(--primary);color:var(--primary-deep);padding:9px 13px;font-size:12.5px;margin-bottom:14px;font-family:'IBM Plex Mono'}
/* tabela catalogo */
.tw{border:1px solid var(--line);background:var(--card);overflow-x:auto}
table.t{width:100%;border-collapse:collapse;min-width:520px}
.t thead th{font-size:9px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-soft);text-align:left;padding:10px 13px;border-bottom:1.5px solid var(--ink);white-space:nowrap}
.t td{font-family:'IBM Plex Mono';font-size:12.5px;padding:9px 13px;border-bottom:1px solid var(--line);white-space:nowrap}
.t tbody tr:hover{background:var(--ice)}.model{font-weight:600;color:var(--primary-deep)}
.emptyp{border:1px dashed var(--line);background:var(--card);padding:40px;text-align:center;color:var(--ink-soft);font-size:13px}
.fbanner{background:var(--ice);border:1px solid var(--primary);color:var(--primary-deep);padding:11px 14px;font-size:12.5px;margin-bottom:14px}
.fbanner b{font-family:'IBM Plex Mono'}
.fitem{border:1px solid var(--line);background:var(--card);padding:12px 15px;margin-bottom:12px}
.fhead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:8px;flex-wrap:wrap}
.ftg{font-family:'IBM Plex Mono';font-size:12px;color:var(--primary-deep)}
.fnm{font-family:'Sora';font-weight:600;font-size:15px}
.fmed{font-family:'IBM Plex Mono';font-size:12px;color:var(--ink-soft);margin-left:6px}
.fcount{font-family:'IBM Plex Mono';font-size:11px;color:var(--ink-soft)}
.fstrip{display:flex;gap:9px;overflow-x:auto;padding-bottom:4px}
.thumb{position:relative;width:80px;height:80px;flex:0 0 auto;border:1px solid var(--line);overflow:hidden}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.thumb .rm{position:absolute;top:2px;right:2px;width:18px;height:18px;background:rgba(20,35,46,.85);color:#fff;border-radius:50%;font-size:13px;line-height:18px;text-align:center;cursor:pointer}
.addfoto{width:80px;height:80px;flex:0 0 auto;border:1.5px dashed var(--primary);background:var(--ice);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;color:var(--primary-deep);font-family:'IBM Plex Mono';font-size:11px}
.addfoto .ic{font-size:18px}
@media(max-width:860px){.app{grid-template-columns:1fr}.sb{flex-direction:row;position:static;min-height:auto;padding:10px;align-items:center;gap:8px;overflow-x:auto}.sb-brand{padding:0 10px 0 6px}.sb-brand .s{display:none}.nav{flex-direction:row;padding:0;margin-left:8px}.sb-user{margin:0 0 0 auto;padding:0 8px;border:none}.sb-user .nm,.sb-user .rl{display:none}.sb-bottom{margin:0 0 0 auto;display:flex;align-items:center;gap:8px}.themebtn{margin:0;padding:6px 9px}.md{grid-template-columns:1fr}.form{grid-template-columns:repeat(2,1fr)}.res{grid-template-columns:repeat(2,1fr)}.rc:nth-child(2n){border-right:none}.rel{grid-template-columns:1fr}}
/* --- glassmorphism + transições (padrão Project Ar) --- */
.pcard,.edit,.list,.fitem,.ue,.rcard,.tw{backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:var(--glow);border-radius:10px}
.pcard{transition:transform .2s,border-color .2s,box-shadow .2s}
.pcard:hover{transform:translateY(-2px)}
.btn{border-radius:6px;transition:transform .15s,filter .2s,box-shadow .2s}
.btn:hover{transform:translateY(-1px);filter:brightness(1.08)}
.btn.pri{background:linear-gradient(135deg,#6fbfe0,#3f9dc4);color:#06243a;box-shadow:0 4px 16px rgba(111,191,224,.28)}
.subtab,.li,.nav button,.rc,.thumb,.addfoto{transition:all .18s}
.toast,.fbanner{border-radius:8px;backdrop-filter:blur(12px)}
.res,.st,.brk,.form,.subtabs,.md .list{overflow:hidden}
.themebtn{background:transparent;border:none;color:#6b8199;cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px;opacity:.5;transition:opacity .2s,background .2s}
.themebtn:hover{opacity:1;background:rgba(255,255,255,.08)}
.sb-bottom{margin-top:auto}
.h1{letter-spacing:-.01em}
.crumb:hover{color:var(--primary)}
/* --- login --- */
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;font-family:'Inter';color:var(--ink);background:radial-gradient(1100px 560px at 20% -10%,rgba(111,191,224,.16),transparent 58%),radial-gradient(900px 500px at 100% 110%,rgba(30,109,143,.14),transparent 55%),var(--paper);transition:background .35s}
.login-theme{position:absolute;top:18px;right:18px;background:transparent;border:none;color:var(--ink-soft);border-radius:7px;padding:6px;cursor:pointer;font-size:14px;opacity:.45;transition:opacity .2s}
.login-theme:hover{opacity:1}
.loginbox{width:100%;max-width:384px;background:var(--card);border:1px solid var(--line);border-radius:14px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:var(--glow);padding:32px 30px}
.login-brand{display:flex;align-items:center;gap:12px;justify-content:center;margin-bottom:8px}
.login-brand .b{font-family:'Sora';font-weight:700;font-size:21px}.login-brand .b span{color:var(--primary)}
.login-sub{text-align:center;font-size:12px;color:var(--ink-soft);margin-bottom:24px}
.lf{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.lf label{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-soft)}
.lf input{font-family:'Inter';font-size:14px;padding:10px 12px;border:1px solid var(--line);background:var(--card2);color:var(--ink);border-radius:7px;transition:border-color .2s,box-shadow .2s}
.lf input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(111,191,224,.18)}
.entrar{width:100%;padding:12px;margin-top:8px;font-family:'Sora';font-weight:600;font-size:14px;border:none;border-radius:7px;background:linear-gradient(135deg,#6fbfe0,#3f9dc4);color:#06243a;cursor:pointer;transition:transform .15s,filter .2s;box-shadow:0 6px 18px rgba(111,191,224,.3)}
.entrar:hover{transform:translateY(-1px);filter:brightness(1.07)}
.login-err{font-size:12px;color:var(--danger);text-align:center;margin-top:12px}
.login-forgot{text-align:center;font-size:12px;color:var(--primary);margin-top:16px;cursor:pointer}
.login-foot{text-align:center;font-size:11px;color:var(--ink-soft);margin-top:22px;padding-top:16px;border-top:1px solid var(--line)}
.sair{margin-left:8px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--ink-soft);border-radius:6px;padding:5px 10px;cursor:pointer;font-family:'Inter';font-size:11px}
/* --- anotações + sinalização --- */
.sig{display:flex;align-items:center;gap:11px;border:1px solid var(--warn);border-left-width:3px;background:linear-gradient(90deg,rgba(226,171,69,.16),transparent);color:var(--ink);border-radius:9px;padding:11px 14px;margin-bottom:16px;cursor:pointer;transition:filter .2s}
.sig:hover{filter:brightness(1.06)}
.sig .ic{color:var(--warn);font-size:16px}.sig b{color:var(--warn)}.sig .go{margin-left:auto;font-size:12px;color:var(--primary);white-space:nowrap}
.anot-new{border:1px solid var(--line);background:var(--card);border-radius:10px;padding:12px;margin-bottom:16px;backdrop-filter:blur(12px)}
.anot-input{width:100%;background:var(--card2);border:1px solid var(--line);border-radius:7px;color:var(--ink);font-family:'Inter';font-size:13.5px;padding:9px 11px;resize:vertical}
.anot-input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(111,191,224,.16)}
.anot-actions{display:flex;justify-content:space-between;align-items:center;margin-top:9px;gap:10px;flex-wrap:wrap}
.anot-imp{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-soft);cursor:pointer;user-select:none}
.anot-imp .flag{color:var(--ink-soft);font-size:14px}.anot-imp .flag.on{color:var(--warn)}
.anot-item{display:flex;align-items:flex-start;gap:11px;border:1px solid var(--line);background:var(--card);border-radius:9px;padding:11px 13px;margin-bottom:9px;backdrop-filter:blur(12px)}
.anot-item.imp{border-left:3px solid var(--warn);background:linear-gradient(90deg,rgba(226,171,69,.09),var(--card))}
.flagbtn{background:transparent;border:none;cursor:pointer;font-size:15px;color:var(--ink-soft);padding:0;margin-top:1px}
.flagbtn.on{color:var(--warn)}
.anot-txt{flex:1;font-size:13.5px;line-height:1.5}
.anot-rm{background:transparent;border:none;color:var(--ink-soft);cursor:pointer;font-size:16px}
.anot-empty{color:var(--ink-soft);font-size:13px;padding:22px;text-align:center;border:1px dashed var(--line);border-radius:9px}
.pcard{position:relative}
.pcard-del{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:6px;border:1px solid var(--line);background:var(--card2);color:var(--ink-soft);cursor:pointer;font-size:15px;line-height:1;opacity:0;transition:opacity .15s,background .2s,color .2s}
.pcard:hover .pcard-del{opacity:1}
.pcard-del:hover{background:rgba(229,113,95,.16);color:var(--danger);border-color:var(--danger)}
.proj-nome{font-family:'Sora';font-weight:600;font-size:22px;background:transparent;border:none;color:var(--ink);width:100%;padding:2px 4px;border-radius:6px;letter-spacing:-.01em}
.proj-nome:hover,.proj-nome:focus{background:var(--card2)}
.proj-nome:focus,.proj-cli:focus{outline:none;box-shadow:0 0 0 2px rgba(111,191,224,.3)}
.proj-cli{font-family:'Inter';font-size:13px;background:transparent;border:none;color:var(--ink-soft);width:100%;padding:3px 4px;margin-top:2px;border-radius:6px}
.proj-cli:hover{background:var(--card2)}
.cat-add{display:flex;gap:8px;align-items:end;flex-wrap:wrap;border:1px solid var(--line);background:var(--card);border-radius:10px;padding:12px;margin-bottom:14px;backdrop-filter:blur(12px)}
.cat-add .fld{display:flex;flex-direction:column;gap:4px}
.cat-add label{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft)}
.cat-add .inp{font-family:'Inter';font-size:13px;border:1px solid var(--line);padding:7px 9px;background:var(--card2);color:var(--ink);border-radius:6px;min-width:120px}
.cat-add .inp:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(111,191,224,.16)}
.cat-in{font-family:'Inter';font-size:12.5px;background:transparent;border:1px solid transparent;color:var(--ink);padding:4px 6px;border-radius:4px;width:100%;min-width:70px}
.cat-in.model{font-family:'IBM Plex Mono';color:var(--primary-deep)}
.cat-in:focus{outline:none;border-color:var(--primary);background:var(--card2)}
.cat-rm{background:transparent;border:none;color:var(--ink-soft);cursor:pointer;font-size:15px}
.cat-rm:hover{color:var(--danger)}
.cat-up{display:inline-flex;align-items:center;gap:8px;font-family:'Sora';font-weight:600;font-size:13px;padding:11px 18px;border:1px dashed var(--line);border-radius:8px;color:var(--primary-deep);cursor:pointer;background:var(--card2);margin-bottom:12px;transition:border-color .2s,background .2s}
.cat-up:hover{border-color:var(--primary);background:rgba(111,191,224,.08)}
.cat-file{display:flex;align-items:center;gap:11px;border:1px solid var(--line);background:var(--card);border-radius:9px;padding:10px 13px;margin-bottom:8px;backdrop-filter:blur(12px)}
.cat-file .fic{font-family:'IBM Plex Mono';font-size:10px;font-weight:600;color:#06243a;background:var(--primary);border-radius:4px;padding:3px 6px;letter-spacing:.03em}
.cat-file .fnm{flex:1;font-size:13.5px;color:var(--ink);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cat-file .fnm:hover{color:var(--primary-deep);text-decoration:underline}
.cat-file .fsz{font-family:'IBM Plex Mono';font-size:11px;color:var(--ink-soft);white-space:nowrap}
.cat-empty{color:var(--ink-soft);font-size:13px;padding:16px;text-align:center;border:1px dashed var(--line);border-radius:9px}
.flagbadge{font-family:'IBM Plex Mono';font-size:11px;color:var(--warn);border:1px solid var(--warn);border-radius:4px;padding:0 5px;margin-left:8px}
/* --- agenda + offline --- */
.ag-add{display:grid;grid-template-columns:1.2fr 1.2fr 1fr .9fr .7fr auto;gap:8px;align-items:end;border:1px solid var(--line);background:var(--card);border-radius:10px;padding:12px;margin-bottom:16px;backdrop-filter:blur(12px)}
.ag-add .fld{display:flex;flex-direction:column;gap:4px}
.ag-add label{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft)}
.ag-add .inp{font-family:'Inter';font-size:13px;border:1px solid var(--line);padding:7px 9px;background:var(--card2);color:var(--ink);border-radius:6px}
.ag-day{font-family:'Sora';font-weight:600;font-size:12px;color:var(--primary-deep);margin:14px 2px 8px;text-transform:capitalize}
.ag-item{display:flex;align-items:center;gap:13px;border:1px solid var(--line);background:var(--card);border-radius:10px;padding:12px 14px;margin-bottom:9px;backdrop-filter:blur(12px)}
.ag-time{font-family:'IBM Plex Mono';font-size:14px;font-weight:600;color:var(--primary-deep);min-width:52px}
.ag-info{flex:1;min-width:0}
.ag-obra{font-family:'Sora';font-weight:600;font-size:14px}
.ag-meta{font-size:12px;color:var(--ink-soft);margin-top:2px}
.ag-tipo{font-family:'Inter';font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;color:#06243a;background:var(--primary)}
.ag-tipo.visita{background:#6fbfe0}.ag-tipo.medicao{background:#47c98a}.ag-tipo.comiss{background:#e2ab45}
.ag-rm{background:transparent;border:none;color:var(--ink-soft);cursor:pointer;font-size:16px}
.ag-cal{background:var(--card2);border:1px solid var(--line);color:var(--primary-deep);border-radius:6px;padding:5px 10px;cursor:pointer;font-family:'Inter';font-size:11px;white-space:nowrap;transition:background .2s}
.ag-cal:hover{background:rgba(111,191,224,.14)}
.synch{display:flex;align-items:center;gap:7px;font-size:11px;font-family:'IBM Plex Mono';color:var(--ink-soft);padding:5px 10px;border:1px solid var(--line);border-radius:20px;cursor:pointer;background:var(--card2)}
.synch .d{width:8px;height:8px;border-radius:50%}
.synch.on .d{background:var(--ok);box-shadow:0 0 6px var(--ok)}
.synch.off .d{background:var(--warn)}
.synch.err{border-color:var(--danger);color:var(--danger)}
.synch.err .d{background:var(--danger);box-shadow:0 0 6px var(--danger)}
@media(max-width:860px){.ag-add{grid-template-columns:1fr 1fr}}
/* --- dimensionador de dutos (escopado) --- */
.duct .modes{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;margin-bottom:16px}
.duct .modes button{font-family:'Sora';font-weight:600;font-size:13px;padding:8px 16px;background:transparent;border:none;color:var(--ink-soft);cursor:pointer}
.duct .modes button.on{background:linear-gradient(135deg,#6fbfe0,#3f9dc4);color:#06243a}
.duct .sec{font-family:'Sora';font-weight:600;font-size:14px;margin:4px 0 10px;display:flex;align-items:baseline;gap:8px}
.duct .sec .tg{font-family:'IBM Plex Mono';font-size:10px;color:var(--primary);border:1px solid var(--line);padding:1px 7px;border-radius:4px}
.duct .form{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:16px}
.duct .fld{background:#0e2135;padding:9px 12px;display:flex;flex-direction:column;gap:4px}
.duct .fld label{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft)}
.duct .inp{font-family:'IBM Plex Mono';font-size:13.5px;font-weight:500;border:1px solid var(--line);padding:6px 8px;background:var(--card2);color:var(--ink);width:100%;border-radius:5px}
.duct .inp:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(111,191,224,.16)}
.duct .btn{font-family:'Sora';font-weight:600;font-size:13px;padding:9px 15px;border:none;border-radius:7px;background:linear-gradient(135deg,#6fbfe0,#3f9dc4);color:#06243a;cursor:pointer;transition:transform .15s,filter .2s}
.duct .btn:hover{transform:translateY(-1px);filter:brightness(1.07)}
.duct .tw{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--card);backdrop-filter:blur(12px);box-shadow:var(--glow);overflow-x:auto;margin-bottom:10px}
.duct table{width:100%;border-collapse:collapse;min-width:780px}
.duct thead th{font-size:9px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-soft);text-align:left;padding:9px 11px;border-bottom:1.5px solid rgba(255,255,255,.14);white-space:nowrap}
.duct tbody td{font-family:'IBM Plex Mono';font-size:12.5px;padding:7px 11px;border-bottom:1px solid var(--line);white-space:nowrap}
.duct tbody tr:last-child td{border-bottom:none}
.duct tbody tr:hover{background:rgba(255,255,255,.03)}
.duct .nomeinp{font-family:'Inter';font-size:12.5px;background:transparent;border:1px solid transparent;color:var(--ink);padding:3px 5px;border-radius:4px;width:112px}
.duct .nomeinp:focus,.duct .vinp:focus{outline:none;border-color:var(--primary);background:var(--card2)}
.duct .vinp{font-family:'IBM Plex Mono';font-size:12.5px;background:var(--card2);border:1px solid var(--line);color:var(--ink);padding:4px 6px;border-radius:4px;width:62px}
.duct .selin{font-family:'Inter';font-size:12px;background:var(--card2);border:1px solid var(--line);color:var(--ink);padding:4px 6px;border-radius:4px}
.duct .big{color:var(--primary-deep);font-weight:600}.duct .red{color:var(--warn)}.duct .vok{color:var(--ok)}.duct .vhi{color:var(--danger)}
.duct .rm{background:transparent;border:none;color:var(--ink-soft);cursor:pointer;font-size:15px}
.duct .ramal{font-size:12.5px;color:var(--ink-soft);font-family:'IBM Plex Mono';margin:2px 2px 16px}.duct .ramal b{color:var(--primary-deep)}
.duct .addbar{display:flex;gap:8px;align-items:end;margin-bottom:14px;flex-wrap:wrap}
.duct .addbar .fld{background:transparent;padding:0;min-width:140px}
.duct .esp{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--card);backdrop-filter:blur(12px);margin-bottom:8px}
.duct .ec{padding:12px 14px;border-right:1px solid var(--line)}.duct .ec:last-child{border-right:none}
.duct .ec .k{font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-soft)}
.duct .ec .v{font-family:'IBM Plex Mono';font-size:22px;font-weight:600;margin-top:3px;line-height:1}
.duct .ec .u{font-size:11px;color:var(--ink-soft)}
.duct .verdict{border-radius:9px;padding:11px 14px;font-size:13px;margin-bottom:8px;border:1px solid;display:flex;gap:10px;align-items:center}
.duct .verdict.ok{border-color:var(--ok);background:rgba(71,201,138,.1);color:#a7e6c6}
.duct .verdict.no{border-color:var(--danger);background:rgba(229,113,95,.12);color:#f2b8ae}
.duct .note{font-size:11px;color:var(--ink-soft);font-family:'IBM Plex Mono';margin-top:14px;line-height:1.6}.duct .note b{color:var(--warn)}
@media(max-width:720px){.duct .form{grid-template-columns:repeat(2,1fr)}.duct .esp{grid-template-columns:repeat(2,1fr)}}
/* --- ferramenta de cálculo de capacidade --- */
.toolsec{font-family:'Sora';font-weight:600;font-size:14px;margin:16px 0 10px;color:var(--ink);display:flex;align-items:baseline;gap:8px}
.toolsec .tg{font-family:'IBM Plex Mono';font-size:10px;color:var(--primary);border:1px solid var(--line);padding:1px 7px;border-radius:4px}
.calc-ui{display:flex;align-items:center;gap:10px;border:1px solid var(--line);background:linear-gradient(90deg,rgba(111,191,224,.12),var(--card));border-radius:9px;padding:11px 14px;margin:12px 0;font-size:13.5px}
.calc-ui b{font-family:'IBM Plex Mono';color:var(--primary-deep)}
.calc-mem{border:1px solid var(--ink);background:var(--card);border-radius:10px;overflow:hidden;backdrop-filter:blur(12px)}
.calc-mem .h{border-bottom:1.5px solid var(--ink);padding:11px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.calc-mem .h .t{font-family:'Sora';font-weight:600;font-size:14px}
.calc-mem .b{padding:14px 16px;font-size:13.5px;line-height:1.62;white-space:pre-wrap}
.calc-mem .b.ph{color:var(--ink-soft);font-style:italic}
`;

/* manômetro */
const GM = 160;
const pol = (cx, cy, r, v) => { const a = (180 - (Math.min(v, GM) / GM) * 180) * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
const arc = (cx, cy, r, a, b) => { const [x1, y1] = pol(cx, cy, r, a), [x2, y2] = pol(cx, cy, r, b); return `M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`; };
function Gauge({ pct }) {
  const cx = 120, cy = 120, r = 92, rw = 14; const [nx, ny] = pol(cx, cy, r - 24, pct);
  return (<svg viewBox="0 0 240 134" width="100%" style={{ maxWidth: 220 }}>
    <path d={arc(cx, cy, r, 0, 50)} stroke="var(--info)" strokeWidth={rw} fill="none" opacity=".26" />
    <path d={arc(cx, cy, r, 50, 110)} stroke="var(--ok)" strokeWidth={rw} fill="none" opacity=".85" />
    <path d={arc(cx, cy, r, 110, 130)} stroke="var(--warn)" strokeWidth={rw} fill="none" opacity=".9" />
    <path d={arc(cx, cy, r, 130, 160)} stroke="var(--danger)" strokeWidth={rw} fill="none" opacity=".9" />
    {[0, 50, 100, 130, 160].map((t) => { const [lx, ly] = pol(cx, cy, r + 11, t); return <text key={t} x={lx} y={ly} fontSize="9" fill="var(--ink-soft)" fontFamily="IBM Plex Mono" textAnchor="middle" dominantBaseline="middle">{t}</text>; })}
    <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" /><circle cx={cx} cy={cy} r="6" fill="var(--ink)" />
  </svg>);
}
const zona = (p) => p < 50 ? ["Subdim.", "var(--info)", "s-info", "info"] : p <= 110 ? ["Ideal", "var(--ok)", "s-ok", "ok"] : p <= 130 ? ["Atenção", "var(--warn)", "s-warn", "warn"] : ["Excede", "var(--danger)", "s-danger", "danger"];

/* ---- Editor de ambientes (ao vivo) ---- */
function Ambientes({ ambientes, setAmbientes, cond, selId, setSelId }) {
  const sel = ambientes.find((a) => a.id === selId) || ambientes[0];
  const setF = (k, v) => setAmbientes(ambientes.map((a) => a.id === sel.id ? { ...a, [k]: v } : a));
  const setN = (k) => (e) => setF(k, num(e.target.value));
  const setS = (k) => (e) => setF(k, e.target.value);
  const novo = () => { const id = "n" + Date.now(); setAmbientes([...ambientes, { id, tag: "—", nome: "Novo ambiente", ue: "UE-1", area: 20, peDireito: 2.8, nPessoas: 2, atividade: "atividade_moderada", categoria: "residencia", iluminacaoWm2: 10, equipamentosW: 200, paredeExtArea: 8, orientacao: "S", vidroArea: 3, coberturaExposta: false }]); setSelId(id); };
  if (!sel) return (<div className="md"><div><div className="list"><div className="liadd" onClick={novo}>+ novo ambiente</div></div></div><div className="edit"><div style={{ padding: "38px 22px", color: "var(--ink-soft)", fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>Nenhum ambiente cadastrado nesta obra.<br />Toque em <b style={{ color: "var(--primary-deep)" }}>+ novo ambiente</b> para iniciar o levantamento.</div></div></div>);
  const r = calc(sel, cond);
  const sp = r.par.filter((p) => p.t === "S"), lp = r.par.filter((p) => p.t === "L");
  return (<div className="md">
    <div>
      <div className="list">
        {ambientes.map((a) => { const rr = calc(a, cond); const z = zona(0); const dc = rr.al.length ? "var(--warn)" : "var(--ok)"; return (
          <div key={a.id} className={"li" + (a.id === sel.id ? " on" : "")} onClick={() => setSelId(a.id)}>
            <span className="dot" style={{ background: dc }}></span>
            <span className="tg">{a.tag}</span><span className="nm">{a.nome}</span><span className="bt">{fmt(rr.btu)}</span>
          </div>); })}
        <div className="liadd" onClick={novo}>+ novo ambiente</div>
      </div>
    </div>
    <div className="edit">
      <div className="edit-h"><span className="nm">{sel.nome}</span><span className="tg">{sel.tag} · {sel.ue} · seleção: {selUI(r.btu).m}</span></div>
      <div className="form">
        <div className="fld"><label>Nome</label><input className="inp" value={sel.nome} onChange={setS("nome")} /></div>
        <div className="fld"><label>Área (m²)</label><input className="inp" value={sel.area} onChange={setN("area")} /></div>
        <div className="fld"><label>Ocupação</label><input className="inp" value={sel.nPessoas} onChange={setN("nPessoas")} /></div>
        <div className="fld"><label>Atividade</label><select className="inp" value={sel.atividade} onChange={setS("atividade")}>{ATIV.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
        <div className="fld"><label>Orientação</label><select className="inp" value={sel.orientacao} onChange={setS("orientacao")}>{ORI.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
        <div className="fld"><label>Categoria (ar ext.)</label><select className="inp" value={sel.categoria} onChange={setS("categoria")}>{CATEG.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
        <div className="fld"><label>Parede ext. (m²)</label><input className="inp" value={sel.paredeExtArea} onChange={setN("paredeExtArea")} /></div>
        <div className="fld"><label>Vidro (m²)</label><input className="inp" value={sel.vidroArea} onChange={setN("vidroArea")} /></div>
        <div className="fld"><label>Iluminação (W/m²)</label><input className="inp" value={sel.iluminacaoWm2} onChange={setN("iluminacaoWm2")} /></div>
        <div className="fld"><label>Equipamentos (W)</label><input className="inp" value={sel.equipamentosW} onChange={setN("equipamentosW")} /></div>
        <div className="fld"><label>Pé-direito (m)</label><input className="inp" value={sel.peDireito} onChange={setN("peDireito")} /></div>
        <div className="fld"><label className="chk" onClick={() => setF("coberturaExposta", !sel.coberturaExposta)}><input type="checkbox" checked={sel.coberturaExposta} readOnly /> Cobertura exposta</label></div>
      </div>
      <div className="res">
        <div className="rc"><div className="k">Carga total</div><div className="v" style={{ color: "var(--primary-deep)" }}>{fmt(r.btu)}</div><div className="u">BTU/h</div></div>
        <div className="rc"><div className="k">FCS</div><div className="v" style={{ color: r.fcs < 0.65 ? "var(--danger)" : "var(--ink)" }}>{r.fcs.toFixed(2)}</div><div className="u">sens/total</div></div>
        <div className="rc"><div className="k">Densidade</div><div className="v" style={{ color: r.wm2 > 250 ? "var(--warn)" : "var(--ink)" }}>{r.wm2}</div><div className="u">W/m²</div></div>
        <div className="rc"><div className="k">Ar externo</div><div className="v">{r.vaz.toLocaleString("pt-BR")}</div><div className="u">L/s</div></div>
      </div>
      <div className="brk">
        <div className="cl"><div className="ch" style={{ color: "var(--primary-deep)" }}><span>Sensível</span><span>{fmt(r.s)} W</span></div>{sp.map((p) => <div className="pr" key={p.n}><span>{p.n}</span><span className="pv">{fmt(p.w)}</span></div>)}</div>
        <div className="cl"><div className="ch" style={{ color: "var(--info)" }}><span>Latente</span><span>{fmt(r.l)} W</span></div>{lp.map((p) => <div className="pr" key={p.n}><span>{p.n}</span><span className="pv">{fmt(p.w)}</span></div>)}</div>
      </div>
      {r.al.map((x, i) => <div className="al" key={i}><span>△</span><span>{x}</span></div>)}
    </div>
  </div>);
}

function Balanco({ ambientes, cond }) {
  const grupos = ["UE-1", "UE-2"];
  return (<div className="grid2">{grupos.map((g) => {
    const us = ambientes.filter((a) => a.ue === g);
    const soma = us.reduce((s, a) => s + selUI(calc(a, cond).btu).cap, 0);
    const pct = Math.round(1000 * soma / 191100) / 10; const [lbl, cor, cls, k] = zona(pct);
    return (<div key={g} className={"ue " + (k === "danger" ? "danger" : k === "warn" ? "warn" : "")}>
      <div className="ue-h"><div><div className="ue-tag">{g}</div><div className="ue-md">RXYQ20BTL(G)</div></div><span className={"badge " + cls}>{lbl}</span></div>
      <div className="gr"><Gauge pct={pct} /></div>
      <div className="grd"><div className="gp" style={{ color: cor }}>{pct.toLocaleString("pt-BR")}%</div><div className="gl" style={{ color: cor }}>Taxa de conexão</div></div>
      <div className="st"><div className="c"><div className="k">Soma UIs</div><div className="v">{fmt(soma)}</div></div><div className="c"><div className="k">Nominal</div><div className="v">191.100</div></div><div className="c"><div className="k">Evaporadoras</div><div className="v">{us.length} / 64</div></div><div className="c"><div className="k">Limite</div><div className="v">130%</div></div></div>
    </div>);
  })}</div>);
}

function Relatorios({ ambientes, cond }) {
  const [msg, setMsg] = useState("");
  const total = ambientes.reduce((s, a) => s + calc(a, cond).btu, 0);
  return (<>
    {msg && <div className="toast">{msg}</div>}
    <div className="toast" style={{ background: "var(--card)", borderColor: "var(--line)", color: "var(--ink-soft)" }}>Gera do estado atual: {ambientes.length} ambientes · {fmt(total)} BTU/h ({(total / 12000).toFixed(2)} TR)</div>
    <div className="rel">
      <div className="rcard"><span className="ic i-xls">XLSX</span><div className="tt">Memorial de cálculo</div><div className="ss">7 abas com fórmulas vivas — Condições, Coeficientes, Cálculo, Ambientes, Equipamentos e Memorial. Recalcula no Excel.</div><button className="btn pri" onClick={() => setMsg("Gerando XLSX das 7 abas a partir do projeto…")}>Gerar Excel</button></div>
      <div className="rcard"><span className="ic i-doc">DOCX</span><div className="tt">Memorial (Word)</div><div className="ss">Documento pronto pra assinar — metodologia, tabela de cargas, balanço por condensadora e espaço para ART.</div><button className="btn pri" onClick={() => setMsg("Gerando memorial DOCX…")}>Gerar Word</button></div>
    </div>
  </>);
}

const CAT_SEED = [
  { id: "s1", tipo: "ue", fabricante: "Daikin", linha: "VRV IV", modelo: "RXYQ12BTL(G)", cap: 114700, maxUI: 39 },
  { id: "s2", tipo: "ue", fabricante: "Daikin", linha: "VRV IV", modelo: "RXYQ16BTL(G)", cap: 152500, maxUI: 52 },
  { id: "s3", tipo: "ue", fabricante: "LG", linha: "Multi V 5", modelo: "ARUM200LTE5", cap: 191500, maxUI: 64 },
  { id: "s4", tipo: "ui", fabricante: "Daikin", linha: "Cassete 4 vias", modelo: "FXFSQ40AVM", cap: 13600, maxUI: 0 },
  { id: "s5", tipo: "ui", fabricante: "Daikin", linha: "Cassete 4 vias", modelo: "FXFSQ63AVM", cap: 21500, maxUI: 0 },
];
function Catalogo({ catalogo, setCatalogo, catArquivos, setCatArquivos }) {
  const [t, setT] = useState("ue");
  const [novo, setNovo] = useState({ fabricante: "", linha: "", modelo: "", cap: "", maxUI: "" });
  const [subindo, setSubindo] = useState(false);
  const upFile = async (e) => {
    const files = Array.from(e.target.files || []);
    setSubindo(true);
    for (const f of files) {
      const key = "catalogos/" + Date.now() + "-" + f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const up = await supabase.storage.from("fotos").upload(key, f, { upsert: true });
      if (!up.error) { const pub = supabase.storage.from("fotos").getPublicUrl(key); setCatArquivos((a) => [...a, { id: key, nome: f.name, url: pub.data.publicUrl, tamanho: f.size }]); }
    }
    setSubindo(false); e.target.value = "";
  };
  const rmFile = async (id) => { await supabase.storage.from("fotos").remove([id]); setCatArquivos((a) => a.filter((x) => x.id !== id)); };
  const lista = catalogo.filter((c) => c.tipo === t);
  const setN = (k) => (e) => setNovo({ ...novo, [k]: e.target.value });
  const add = () => {
    if (!novo.modelo.trim()) return;
    setCatalogo([...catalogo, { id: Math.random().toString(36).slice(2), tipo: t, fabricante: novo.fabricante.trim() || "—", linha: novo.linha.trim() || "—", modelo: novo.modelo.trim(), cap: num(novo.cap), maxUI: t === "ue" ? num(novo.maxUI) : 0 }]);
    setNovo({ fabricante: "", linha: "", modelo: "", cap: "", maxUI: "" });
  };
  const upd = (id, k, v) => setCatalogo(catalogo.map((c) => c.id === id ? { ...c, [k]: (k === "cap" || k === "maxUI") ? num(v) : v } : c));
  const rm = (id) => setCatalogo(catalogo.filter((c) => c.id !== id));
  return (<>
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      <button className={"btn " + (t === "ue" ? "pri" : "gh")} onClick={() => setT("ue")}>Condensadoras</button>
      <button className={"btn " + (t === "ui" ? "pri" : "gh")} onClick={() => setT("ui")}>Evaporadoras</button>
    </div>
    <div className="cat-add">
      <div className="fld"><label>Fabricante</label><input className="inp" value={novo.fabricante} onChange={setN("fabricante")} placeholder="Daikin, LG…" /></div>
      <div className="fld"><label>Linha</label><input className="inp" value={novo.linha} onChange={setN("linha")} placeholder="VRV IV, Multi V…" /></div>
      <div className="fld"><label>Modelo</label><input className="inp" value={novo.modelo} onChange={setN("modelo")} placeholder="RXYQ12…" /></div>
      <div className="fld"><label>Cap. (BTU/h)</label><input className="inp" style={{ minWidth: 110 }} value={novo.cap} onChange={setN("cap")} /></div>
      {t === "ue" && <div className="fld"><label>Máx UIs</label><input className="inp" style={{ minWidth: 80 }} value={novo.maxUI} onChange={setN("maxUI")} /></div>}
      <button className="btn pri" onClick={add}>+ Cadastrar</button>
    </div>
    <div className="tw"><table className="t">
      <thead><tr><th>Modelo</th><th>Fabr.</th><th>Linha</th><th>Cap. (BTU/h)</th>{t === "ue" && <th>Máx UIs</th>}<th></th></tr></thead>
      <tbody>{lista.length === 0 ? (<tr><td colSpan={t === "ue" ? 6 : 5} style={{ color: "var(--ink-soft)", padding: 18 }}>Nenhum equipamento cadastrado nesta aba. Adicione acima.</td></tr>) : lista.map((c) => (
        <tr key={c.id}>
          <td><input className="cat-in model" value={c.modelo} onChange={(e) => upd(c.id, "modelo", e.target.value)} /></td>
          <td><input className="cat-in" value={c.fabricante} onChange={(e) => upd(c.id, "fabricante", e.target.value)} /></td>
          <td><input className="cat-in" value={c.linha} onChange={(e) => upd(c.id, "linha", e.target.value)} /></td>
          <td><input className="cat-in" value={c.cap} onChange={(e) => upd(c.id, "cap", e.target.value)} /></td>
          {t === "ue" && <td><input className="cat-in" value={c.maxUI} onChange={(e) => upd(c.id, "maxUI", e.target.value)} /></td>}
          <td><button className="cat-rm" onClick={() => rm(c.id)}>×</button></td>
        </tr>
      ))}</tbody>
    </table></div>
    <div className="toolsec" style={{ marginTop: 22 }}>Arquivos e datasheets dos fabricantes</div>
    <label className="cat-up"><input type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" multiple style={{ display: "none" }} onChange={upFile} />{subindo ? "Enviando…" : "＋ Enviar arquivo (PDF, planilha, imagem…)"}</label>
    {catArquivos.length === 0 && <div className="cat-empty">Nenhum arquivo enviado ainda.</div>}
    {catArquivos.map((f) => { const ext = (f.nome.split(".").pop() || "arq").toUpperCase().slice(0, 4); return (
      <div className="cat-file" key={f.id}>
        <span className="fic">{ext}</span>
        <a href={f.url} target="_blank" rel="noreferrer" className="fnm">{f.nome}</a>
        <span className="fsz">{(f.tamanho / 1048576).toFixed(1)} MB</span>
        <button className="cat-rm" onClick={() => rmFile(f.id)}>×</button>
      </div>); })}
  </>);
}

function Fotos({ ambientes, fotos, setFotos }) {
  const pick = (id) => async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const key = id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2);
      const up = await supabase.storage.from("fotos").upload(key, f, { upsert: true });
      if (!up.error) {
        const pub = supabase.storage.from("fotos").getPublicUrl(key);
        setFotos((p) => ({ ...p, [id]: [...(p[id] || []), { id: key, url: pub.data.publicUrl }] }));
      }
    }
    e.target.value = "";
  };
  const rm = (aid, fid) => setFotos((p) => ({ ...p, [aid]: (p[aid] || []).filter((x) => x.id !== fid) }));
  const totalFotos = Object.values(fotos).reduce((s, arr) => s + arr.length, 0);
  const comFotos = Object.values(fotos).filter((a) => a.length).length;
  return (<>
    <div className="fbanner">◈ Registro de campo — na visita, fotografe cada ambiente medido. As fotos ficam vinculadas ao ambiente e às suas medidas, prontas pro projeto ou orçamento depois. <b>{totalFotos}</b> foto(s) em <b>{comFotos}</b> ambiente(s).</div>
    {ambientes.map((a) => {
      const fs = fotos[a.id] || [];
      return (<div className="fitem" key={a.id}>
        <div className="fhead"><div><span className="ftg">{a.tag}</span> <span className="fnm">{a.nome}</span><span className="fmed">{a.area.toLocaleString("pt-BR")} m²</span></div><span className="fcount">{fs.length} foto{fs.length === 1 ? "" : "s"}</span></div>
        <div className="fstrip">
          {fs.map((ft) => <div className="thumb" key={ft.id}><img src={ft.url} alt="" /><span className="rm" onClick={() => rm(a.id, ft.id)}>×</span></div>)}
          <label className="addfoto"><input type="file" accept="image/*" capture="environment" multiple hidden onChange={pick(a.id)} /><span className="ic">▤</span><span>+ foto</span></label>
        </div>
      </div>);
    })}
  </>);
}

function Logo() {
  const cx = 22, cy = 27, r = 6;
  return (<svg viewBox="0 0 44 44" width="30" height="30" fill="none" style={{ flex: "0 0 auto" }}>
    <path d="M7 21 L22 8.5 L37 21" stroke="#8fd3e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30.5 13 L30.5 8.8 L33.5 8.8 L33.5 15.6" stroke="#8fd3e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 18.6 L10.5 35 L33.5 35 L33.5 18.6" stroke="#8fd3e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <g stroke="#d3edf7" strokeWidth="1.3" strokeLinecap="round">
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const rad = a * Math.PI / 180, x = cx + r * Math.cos(rad), y = cy + r * Math.sin(rad);
        const fx = cx + r * 0.62 * Math.cos(rad), fy = cy + r * 0.62 * Math.sin(rad);
        const f1 = (a + 148) * Math.PI / 180, f2 = (a - 148) * Math.PI / 180, fl = 2.1;
        return (<g key={a}>
          <line x1={cx} y1={cy} x2={x} y2={y} />
          <line x1={fx} y1={fy} x2={fx + fl * Math.cos(f1)} y2={fy + fl * Math.sin(f1)} />
          <line x1={fx} y1={fy} x2={fx + fl * Math.cos(f2)} y2={fy + fl * Math.sin(f2)} />
        </g>);
      })}
    </g>
  </svg>);
}

function Anotacoes({ lista, setLista }) {
  const [texto, setTexto] = useState("");
  const [imp, setImp] = useState(false);
  const add = () => { if (!texto.trim()) return; setLista([{ id: Math.random().toString(36).slice(2), texto: texto.trim(), importante: imp }, ...lista]); setTexto(""); setImp(false); };
  const toggle = (id) => setLista(lista.map((n) => n.id === id ? { ...n, importante: !n.importante } : n));
  const rm = (id) => setLista(lista.filter((n) => n.id !== id));
  return (<div>
    <div className="anot-new">
      <textarea className="anot-input" value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="Nova anotação — detalhe importante desta obra (ex.: exige agendamento na portaria, cliente quer silêncio no quarto…)" />
      <div className="anot-actions">
        <div className="anot-imp" onClick={() => setImp((v) => !v)}><span className={"flag" + (imp ? " on" : "")}>⚑</span> Marcar como importante (sinaliza na visita)</div>
        <button className="btn pri" onClick={add}>Adicionar</button>
      </div>
    </div>
    {lista.length === 0 && <div className="anot-empty">Sem anotações nesta obra ainda.</div>}
    {lista.map((n) => (
      <div className={"anot-item" + (n.importante ? " imp" : "")} key={n.id}>
        <button className={"flagbtn" + (n.importante ? " on" : "")} title="Importante" onClick={() => toggle(n.id)}>⚑</button>
        <div className="anot-txt">{n.texto}</div>
        <button className="anot-rm" onClick={() => rm(n.id)}>×</button>
      </div>
    ))}
  </div>);
}

const STD_DU = [100, 125, 150, 160, 180, 200, 224, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250];
const pKpaDu = (h) => 101.325 * Math.pow(1 - 2.25577e-5 * h, 5.25588);
const frictDu = (Q, D) => 0.022243 * Math.pow(Q, 1.852) / Math.pow(D, 4.973);
function circularDu(vazao, metodo, alvo) {
  const Q = vazao / 3600; let D;
  if (metodo === "velocidade") D = Math.sqrt(4 * (Q / alvo) / Math.PI);
  else D = Math.pow(0.022243 * Math.pow(Q, 1.852) / alvo, 1 / 4.973);
  const Dstd = STD_DU.find((s) => s >= D * 1000) ?? STD_DU[STD_DU.length - 1];
  const A = Math.PI * Math.pow(Dstd / 1000, 2) / 4;
  return { Dstd, vel: Q / A, atrito: frictDu(Q, Dstd / 1000) };
}
function retangDu(vazao, De, rel) {
  const k = 1.30 * Math.pow(rel, 0.625) * Math.pow(rel + 1, -0.25);
  const snap = (x) => Math.max(100, Math.round(x / 50) * 50);
  const b = snap(De / k), a = snap(rel * (De / k));
  const Q = vazao / 3600, A = (a / 1000) * (b / 1000);
  return { a, b, vel: Q / A };
}
const ACESSORIOS = [["Curva 90° raio médio", 0.30], ["Curva 90° raio curto", 0.60], ["Curva 90° gomada", 1.20], ["Curva 45°", 0.18], ["Tê — derivação (ramal)", 1.20], ["Tê — passagem reta", 0.20], ["Redução gradual", 0.08], ["Ampliação gradual", 0.25], ["Transformação retang/circ", 0.12], ["Registro / damper (aberto)", 0.30], ["Entrada de ar (borda viva)", 0.50], ["Descarga / saída", 1.00], ["Veneziana externa", 1.80]];
const APPS_DU = [["insufl_princ", "Insuflamento — principal", 6.0], ["insufl_ramal", "Insuflamento — ramal", 4.0], ["retorno", "Retorno", 5.0], ["exaustao", "Exaustão geral", 8.0], ["vent_ind", "Ventilação / exaustão industrial", 10.0], ["ar_ext", "Tomada de ar externo", 4.0]];
const EQUIP_DU = [["VRF dutado FXSQ40", 660, 90], ["VRF dutado FXSQ50", 780, 90], ["VRF dutado FXSQ63", 960, 120], ["VRF dutado FXSQ80", 1140, 120], ["VRF dutado FXSQ100", 1440, 150], ["VRF dutado FXSQ125", 1620, 150], ["Exaustor banheiro", 180, 60], ["Coifa / cozinha", 600, 120], ["Ventilação genérica", 1000, 150]];

function Dutos() {
  const [modo, setModo] = useState("simplificado");
  const [cfg, setCfg] = useState({ app: "insufl_princ", metodo: "friccao", alvo: "0,8", forma: "circular", rel: "2", altitude: "560" });
  const [equip, setEquip] = useState("VRF dutado FXSQ100");
  const [nBocas, setNBocas] = useState("4");
  const [terminais, setTerminais] = useState("25");
  const [espManual, setEspManual] = useState("");
  const [trechos, setTrechos] = useState([{ id: "t1", nome: "Tronco 1", vazao: 1440, L: 3 }, { id: "t2", nome: "Tronco 2", vazao: 1080, L: 3 }, { id: "t3", nome: "Tronco 3", vazao: 720, L: 3 }, { id: "t4", nome: "Tronco 4", vazao: 360, L: 3 }]);
  const [acess, setAcess] = useState([{ id: "x1", tipo: 0, trechoId: "t1", qtd: 2 }, { id: "x2", tipo: 4, trechoId: "t1", qtd: 3 }]);
  const [novoAc, setNovoAc] = useState({ tipo: 0, trechoId: "t1", qtd: 1 });
  const app = APPS_DU.find((a) => a[0] === cfg.app), vmax = app[2];
  const metodo = cfg.metodo, alvo = num(cfg.alvo), rel = num(cfg.rel) || 2;
  const dens = 1.2 * (pKpaDu(num(cfg.altitude)) / 101.325);
  const eq = EQUIP_DU.find((e) => e[0] === equip);
  const espDisp = espManual !== "" ? num(espManual) : (eq ? eq[2] : 0);
  const setC = (k) => (e) => setCfg({ ...cfg, [k]: e.target.value });
  const gerar = () => { const n = Math.max(1, Math.round(num(nBocas))), Qt = eq ? eq[1] : 0; if (!Qt) return; const Qb = Qt / n, nv = []; for (let i = 0; i < n; i++) nv.push({ id: "g" + i, nome: `Tronco ${i + 1}`, vazao: Math.round(Qt - i * Qb), L: 3 }); setTrechos(nv); setAcess([{ id: "a0", tipo: 0, trechoId: "g0", qtd: 2 }, { id: "a1", tipo: 4, trechoId: "g0", qtd: n - 1 }]); };
  const updT = (id, k, val) => setTrechos(trechos.map((t) => t.id === id ? { ...t, [k]: (k === "nome" ? val : num(val)) } : t));
  const rmT = (id) => setTrechos(trechos.filter((t) => t.id !== id));
  const addT = () => setTrechos([...trechos, { id: Math.random().toString(36).slice(2), nome: "Novo trecho", vazao: 500, L: 3 }]);
  const addAc = () => setAcess([...acess, { id: Math.random().toString(36).slice(2), ...novoAc, qtd: Math.max(1, Math.round(num(novoAc.qtd))) }]);
  const updAc = (id, k, val) => setAcess(acess.map((a) => a.id === id ? { ...a, [k]: (k === "trechoId" ? val : num(val)) } : a));
  const rmAc = (id) => setAcess(acess.filter((a) => a.id !== id));
  let prev = null, somaAtrito = 0;
  const linhas = trechos.map((t) => { const c = circularDu(t.vazao, metodo, alvo), rt = retangDu(t.vazao, c.Dstd, rel); const vel = cfg.forma === "retangular" ? rt.vel : c.vel; const dpAtrito = c.atrito * t.L; somaAtrito += dpAtrito; const red = prev && prev !== c.Dstd ? `${prev} → ${c.Dstd}` : "—"; prev = c.Dstd; return { ...t, c, rt, vel, dpAtrito, red, alto: vel > vmax }; });
  const velDe = (id) => { const l = linhas.find((x) => x.id === id) || linhas[0]; return l ? l.vel : 0; };
  let somaAcess = 0;
  const acLinhas = acess.map((a) => { const C = ACESSORIOS[a.tipo][1], vel = velDe(a.trechoId), pd = dens * vel * vel / 2; const dpUnit = C * pd, dpTot = a.qtd * dpUnit; somaAcess += dpTot; return { ...a, C, vel, dpUnit, dpTot }; });
  const term = num(terminais), total = somaAtrito + somaAcess + term, ok = espDisp > 0 ? total <= espDisp : null;
  const Qb = eq && num(nBocas) ? eq[1] / Math.max(1, Math.round(num(nBocas))) : 0;
  const ramal = Qb ? circularDu(Qb, metodo, alvo) : null;
  return (<div className="duct">
    <div className="modes"><button className={modo === "simplificado" ? "on" : ""} onClick={() => setModo("simplificado")}>Simplificado</button><button className={modo === "manual" ? "on" : ""} onClick={() => setModo("manual")}>Manual</button></div>
    {modo === "simplificado" && (<>
      <div className="sec">Equipamento e distribuição <span className="tg">gera os dutos</span></div>
      <div className="form">
        <div className="fld"><label>Evaporadora dutada</label><select className="inp" value={equip} onChange={(e) => setEquip(e.target.value)}>{EQUIP_DU.filter((e) => e[1]).map((e) => <option key={e[0]} value={e[0]}>{e[0]} — {e[1]} m³/h</option>)}</select></div>
        <div className="fld"><label>Nº de bocas</label><input className="inp" value={nBocas} onChange={(e) => setNBocas(e.target.value)} /></div>
        <div className="fld"><label>ESP disponível (Pa)</label><input className="inp" value={espManual === "" ? (eq ? eq[2] : "") : espManual} onChange={(e) => setEspManual(e.target.value)} /></div>
        <div className="fld" style={{ justifyContent: "flex-end" }}><button className="btn pri" onClick={gerar}>Gerar dutos</button></div>
      </div>
      {ramal && <div className="ramal">Cada boca: <b>{fmt(Qb)} m³/h</b> → ramal <b>Ø {ramal.Dstd} mm</b> ({ramal.vel.toFixed(2)} m/s).</div>}
    </>)}
    <div className="sec">Critério <span className="tg">método</span></div>
    <div className="form">
      <div className="fld"><label>Aplicação (limite vel.)</label><select className="inp" value={cfg.app} onChange={setC("app")}>{APPS_DU.map((a) => <option key={a[0]} value={a[0]}>{a[1]} — {a[2]} m/s</option>)}</select></div>
      <div className="fld"><label>Método</label><select className="inp" value={cfg.metodo} onChange={(e) => { const m = e.target.value; setCfg({ ...cfg, metodo: m, alvo: m === "friccao" ? "0,8" : String(vmax) }); }}><option value="friccao">Perda de carga (Pa/m)</option><option value="velocidade">Velocidade (m/s)</option></select></div>
      <div className="fld"><label>{metodo === "friccao" ? "Fricção (Pa/m)" : "Velocidade (m/s)"}</label><input className="inp" value={cfg.alvo} onChange={setC("alvo")} /></div>
      <div className="fld"><label>Forma</label><select className="inp" value={cfg.forma} onChange={setC("forma")}><option value="circular">Circular</option><option value="retangular">Retangular</option></select></div>
      <div className="fld"><label>Relação a/b</label><input className="inp" value={cfg.rel} onChange={setC("rel")} disabled={cfg.forma !== "retangular"} /></div>
      <div className="fld"><label>Altitude (m)</label><input className="inp" value={cfg.altitude} onChange={setC("altitude")} /></div>
    </div>
    <div className="sec">Trechos e reduções <span className="tg">{linhas.length} trechos</span></div>
    <div className="tw"><table>
      <thead><tr><th>Trecho</th><th>Vazão</th><th>L (m)</th><th>Ø circ</th><th>Retang</th><th>Vel</th><th>Δp atrito</th><th>Redução</th><th></th></tr></thead>
      <tbody>{linhas.map((l) => (<tr key={l.id}><td><input className="nomeinp" value={l.nome} onChange={(e) => updT(l.id, "nome", e.target.value)} /></td><td><input className="vinp" value={l.vazao} onChange={(e) => updT(l.id, "vazao", e.target.value)} /></td><td><input className="vinp" style={{ width: 46 }} value={l.L} onChange={(e) => updT(l.id, "L", e.target.value)} /></td><td className="big">Ø {l.c.Dstd}</td><td>{l.rt.a}×{l.rt.b}</td><td className={l.alto ? "vhi" : "vok"}>{l.vel.toFixed(2)}{l.alto ? " ⚠" : ""}</td><td>{l.dpAtrito.toFixed(1)} Pa</td><td className="red">{l.red}</td><td><button className="rm" onClick={() => rmT(l.id)}>×</button></td></tr>))}</tbody>
    </table></div>
    {modo === "manual" && <div style={{ marginBottom: 14 }}><button className="btn pri" onClick={addT}>+ trecho</button></div>}
    <div className="sec">Acessórios (caminho crítico) <span className="tg">coef. de perda</span></div>
    <div className="addbar">
      <div className="fld"><label>Acessório</label><select className="selin" value={novoAc.tipo} onChange={(e) => setNovoAc({ ...novoAc, tipo: +e.target.value })}>{ACESSORIOS.map((a, i) => <option key={i} value={i}>{a[0]} (C={a[1]})</option>)}</select></div>
      <div className="fld"><label>No trecho</label><select className="selin" value={novoAc.trechoId} onChange={(e) => setNovoAc({ ...novoAc, trechoId: e.target.value })}>{linhas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></div>
      <div className="fld"><label>Qtd</label><input className="vinp" value={novoAc.qtd} onChange={(e) => setNovoAc({ ...novoAc, qtd: e.target.value })} /></div>
      <button className="btn pri" onClick={addAc}>+ acessório</button>
    </div>
    <div className="tw"><table>
      <thead><tr><th>Acessório</th><th>Trecho</th><th>C</th><th>Qtd</th><th>Vel</th><th>Δp unit.</th><th>Δp total</th><th></th></tr></thead>
      <tbody>{acLinhas.map((a) => (<tr key={a.id}><td><select className="selin" value={a.tipo} onChange={(e) => updAc(a.id, "tipo", e.target.value)}>{ACESSORIOS.map((x, i) => <option key={i} value={i}>{x[0]}</option>)}</select></td><td><select className="selin" value={a.trechoId} onChange={(e) => updAc(a.id, "trechoId", e.target.value)}>{linhas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></td><td>{a.C.toFixed(2)}</td><td><input className="vinp" style={{ width: 44 }} value={a.qtd} onChange={(e) => updAc(a.id, "qtd", e.target.value)} /></td><td>{a.vel.toFixed(2)}</td><td>{a.dpUnit.toFixed(1)} Pa</td><td className="big">{a.dpTot.toFixed(1)} Pa</td><td><button className="rm" onClick={() => rmAc(a.id)}>×</button></td></tr>))}</tbody>
    </table></div>
    <div className="addbar" style={{ marginTop: 4 }}><div className="fld"><label>Perda nos terminais — difusores/grelhas (Pa)</label><input className="inp" style={{ maxWidth: 160 }} value={terminais} onChange={(e) => setTerminais(e.target.value)} /></div></div>
    <div className="sec">Perda de carga total <span className="tg">ESP</span></div>
    <div className="esp">
      <div className="ec"><div className="k">Atrito</div><div className="v">{somaAtrito.toFixed(1)}</div><div className="u">Pa</div></div>
      <div className="ec"><div className="k">Acessórios</div><div className="v">{somaAcess.toFixed(1)}</div><div className="u">Pa</div></div>
      <div className="ec"><div className="k">Terminais</div><div className="v">{term.toFixed(0)}</div><div className="u">Pa</div></div>
      <div className="ec"><div className="k">Total (ESP)</div><div className="v" style={{ color: "var(--primary-deep)" }}>{total.toFixed(1)}</div><div className="u">Pa</div></div>
    </div>
    {ok !== null && (ok ? <div className="verdict ok"><span>✓</span><span>Perda total <b>{total.toFixed(0)} Pa</b> ≤ ESP disponível <b>{espDisp} Pa</b> — folga de {(espDisp - total).toFixed(0)} Pa.</span></div> : <div className="verdict no"><span>⚠</span><span>Perda total <b>{total.toFixed(0)} Pa</b> excede a ESP de <b>{espDisp} Pa</b>. Suba bitola, reduza acessórios ou use modelo de maior pressão.</span></div>)}
    <div className="note"><b>◈</b> Acessórios por coeficiente C sobre a pressão dinâmica na velocidade do trecho, ρ corrigido por altitude. Coeficientes típicos ASHRAE/SMACNA — ajuste pela geometria real. ESP e terminais: confirmar datasheet.</div>
  </div>);
}

function Agenda({ visitas, setVisitas, projetos, onCriarObra }) {
  const [obra, setObra] = useState("");
  const [cliente, setCliente] = useState("");
  const [tipo, setTipo] = useState("visita");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const add = () => {
    if (!data || !obra.trim()) return;
    if (!projetos.some((p) => p.nome.toLowerCase() === obra.trim().toLowerCase())) onCriarObra(obra.trim(), cliente.trim());
    setVisitas([...visitas, { id: Math.random().toString(36).slice(2), obra: obra.trim(), cliente: cliente.trim(), tipo, data, hora }]);
    setData("");
  };
  const rm = (id) => setVisitas(visitas.filter((v) => v.id !== id));
  const ordenadas = [...visitas].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const tlabel = { visita: "Visita técnica", medicao: "Medição / levantamento", comiss: "Comissionamento" };
  const diaFmt = (d) => { const [y, m, dd] = d.split("-"); const dt = new Date(+y, +m - 1, +dd); return dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }); };
  const pad = (n) => String(n).padStart(2, "0");
  const icsStart = (d, h) => { const [y, m, dd] = d.split("-"); const [hh, mm] = h.split(":"); return `${y}${m}${dd}T${pad(hh)}${pad(mm)}00`; };
  const icsEnd = (d, h) => { const [y, m, dd] = d.split("-"); const [hh, mm] = h.split(":"); const dt = new Date(+y, +m - 1, +dd, +hh + 1, +mm); return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`; };
  const baixarICS = (v) => {
    const sum = `${tlabel[v.tipo]} — ${v.obra}`;
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Project Ar//Agenda//PT", "BEGIN:VEVENT", `UID:${v.id}@projectar`, `DTSTAMP:${icsStart(v.data, v.hora)}`, `DTSTART:${icsStart(v.data, v.hora)}`, `DTEND:${icsEnd(v.data, v.hora)}`, `SUMMARY:${sum}`, "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Lembrete de visita", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a"); a.href = url; a.download = `visita-${v.data}.ics`; a.click(); URL.revokeObjectURL(url);
  };
  let ultimoDia = null;
  return (<>
    <div className="ag-add">
      <div className="fld"><label>Obra</label><input className="inp" list="obras-dl" value={obra} onChange={(e) => setObra(e.target.value)} placeholder="Nova ou existente" /><datalist id="obras-dl">{projetos.map((p) => <option key={p.id} value={p.nome} />)}</datalist></div>
      <div className="fld"><label>Cliente</label><input className="inp" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" /></div>
      <div className="fld"><label>Tipo</label><select className="inp" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="visita">Visita técnica</option><option value="medicao">Medição</option><option value="comiss">Comissionamento</option></select></div>
      <div className="fld"><label>Data</label><input className="inp" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
      <div className="fld"><label>Hora</label><input className="inp" type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></div>
      <button className="btn pri" onClick={add}>Agendar</button>
    </div>
    {ordenadas.length === 0 && <div className="anot-empty">Nenhuma visita agendada.</div>}
    {ordenadas.map((v) => {
      const showDia = v.data !== ultimoDia; ultimoDia = v.data;
      return (<div key={v.id}>
        {showDia && <div className="ag-day">{diaFmt(v.data)}</div>}
        <div className="ag-item">
          <div className="ag-time">{v.hora}</div>
          <div className="ag-info"><div className="ag-obra">{v.obra}</div><div className="ag-meta">{tlabel[v.tipo]}{v.cliente ? ` · ${v.cliente}` : ""}</div></div>
          <span className={"ag-tipo " + v.tipo}>{v.tipo === "visita" ? "Visita" : v.tipo === "medicao" ? "Medição" : "Comiss."}</span>
          <button className="ag-cal" title="Adicionar ao calendário do celular" onClick={() => baixarICS(v)}>＋ calendário</button>
          <button className="ag-rm" onClick={() => rm(v.id)}>×</button>
        </div>
      </div>);
    })}
  </>);
}

function CalculoTool() {
  const [c, setC] = useState({ textBS: "34", urExt: "60", tInt: "24", urInt: "50", altitude: "560" });
  const [a, setA] = useState({ nome: "Ambiente", area: "24", peDireito: "2,80", nPessoas: "2", atividade: "atividade_moderada", categoria: "residencia", iluminacaoWm2: "12", equipamentosW: "350", paredeExtArea: "11", orientacao: "O", vidroArea: "4,5", coberturaExposta: false });
  const [mem, setMem] = useState(""); const [loading, setLoading] = useState(false);
  const cond = { textBS: num(c.textBS), urExt: num(c.urExt), tInt: num(c.tInt), urInt: num(c.urInt), altitude: num(c.altitude) };
  const amb = { area: num(a.area), peDireito: num(a.peDireito), nPessoas: num(a.nPessoas), atividade: a.atividade, categoria: a.categoria, iluminacaoWm2: num(a.iluminacaoWm2), equipamentosW: num(a.equipamentosW), paredeExtArea: num(a.paredeExtArea), orientacao: a.orientacao, vidroArea: num(a.vidroArea), coberturaExposta: a.coberturaExposta };
  const r = calc(amb, cond), ui = selUI(r.btu);
  const sp = r.par.filter((p) => p.t === "S"), lp = r.par.filter((p) => p.t === "L");
  const setCv = (k) => (e) => setC({ ...c, [k]: e.target.value });
  const setAv = (k) => (e) => setA({ ...a, [k]: e.target.value });
  const fb = (d) => `O ambiente ${d.ambiente} (${d.area} m²) teve a carga térmica determinada pelo método de componentes conforme NBR 16401-1, com correção psicrométrica para a altitude. A carga total é de ${fmt(d.total_btu)} BTU/h (sensível ${fmt(d.s)} W, latente ${fmt(d.l)} W; FCS ${d.fcs}; ${d.wm2} W/m²). Recomenda-se unidade interna ${d.ui}.`;
  async function gerar() {
    setLoading(true); setMem("");
    const dados = { ambiente: a.nome, area: amb.area, total_btu: r.btu, s: r.s, l: r.l, fcs: r.fcs.toFixed(2), wm2: r.wm2, ui: ui.m };
    const prompt = `Você é engenheiro de climatização. Escreva UM parágrafo (4-6 linhas) do memorial justificativo conforme NBR 16401-1, a partir destes resultados JÁ CALCULADOS — não recalcule nem invente números. Cite parcelas dominantes, a correção por altitude e a capacidade recomendada. Só o parágrafo, em português.\nDADOS: ${JSON.stringify(dados)}`;
    try {
      const resp = await fetch("/api/memorial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const d = await resp.json();
      setMem((d.text || "").trim() || fb(dados));
    } catch { setMem(fb(dados) + "\n\n(gerado localmente — IA indisponível)"); } finally { setLoading(false); }
  }
  return (<div>
    <div className="toolsec">Condições de projeto <span className="tg">NBR 16401-1/-2</span></div>
    <div className="form">
      <div className="fld"><label>TBS externa (°C)</label><input className="inp" value={c.textBS} onChange={setCv("textBS")} /></div>
      <div className="fld"><label>UR externa (%)</label><input className="inp" value={c.urExt} onChange={setCv("urExt")} /></div>
      <div className="fld"><label>TBS interna (°C)</label><input className="inp" value={c.tInt} onChange={setCv("tInt")} /></div>
      <div className="fld"><label>UR interna (%)</label><input className="inp" value={c.urInt} onChange={setCv("urInt")} /></div>
      <div className="fld"><label>Altitude (m)</label><input className="inp" value={c.altitude} onChange={setCv("altitude")} /></div>
    </div>
    <div className="toolsec">Ambiente <span className="tg">parâmetros</span></div>
    <div className="form">
      <div className="fld"><label>Nome</label><input className="inp" value={a.nome} onChange={setAv("nome")} /></div>
      <div className="fld"><label>Área (m²)</label><input className="inp" value={a.area} onChange={setAv("area")} /></div>
      <div className="fld"><label>Ocupação</label><input className="inp" value={a.nPessoas} onChange={setAv("nPessoas")} /></div>
      <div className="fld"><label>Atividade</label><select className="inp" value={a.atividade} onChange={setAv("atividade")}>{ATIV.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
      <div className="fld"><label>Orientação</label><select className="inp" value={a.orientacao} onChange={setAv("orientacao")}>{ORI.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
      <div className="fld"><label>Categoria</label><select className="inp" value={a.categoria} onChange={setAv("categoria")}>{CATEG.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
      <div className="fld"><label>Parede ext. (m²)</label><input className="inp" value={a.paredeExtArea} onChange={setAv("paredeExtArea")} /></div>
      <div className="fld"><label>Vidro (m²)</label><input className="inp" value={a.vidroArea} onChange={setAv("vidroArea")} /></div>
      <div className="fld"><label>Iluminação (W/m²)</label><input className="inp" value={a.iluminacaoWm2} onChange={setAv("iluminacaoWm2")} /></div>
      <div className="fld"><label>Equipamentos (W)</label><input className="inp" value={a.equipamentosW} onChange={setAv("equipamentosW")} /></div>
      <div className="fld"><label>Pé-direito (m)</label><input className="inp" value={a.peDireito} onChange={setAv("peDireito")} /></div>
      <div className="fld" style={{ justifyContent: "center" }}><label className="chk" onClick={() => setA({ ...a, coberturaExposta: !a.coberturaExposta })}><input type="checkbox" checked={a.coberturaExposta} readOnly /> Cobertura exposta</label></div>
    </div>
    <div className="res">
      <div className="rc"><div className="k">Carga total</div><div className="v" style={{ color: "var(--primary-deep)" }}>{fmt(r.btu)}</div><div className="u">BTU/h</div></div>
      <div className="rc"><div className="k">FCS</div><div className="v" style={{ color: r.fcs < 0.65 ? "var(--danger)" : "var(--ink)" }}>{r.fcs.toFixed(2)}</div><div className="u">sens/total</div></div>
      <div className="rc"><div className="k">Densidade</div><div className="v" style={{ color: r.wm2 > 250 ? "var(--warn)" : "var(--ink)" }}>{r.wm2}</div><div className="u">W/m²</div></div>
      <div className="rc"><div className="k">Ar externo</div><div className="v">{r.vaz.toLocaleString("pt-BR")}</div><div className="u">L/s</div></div>
    </div>
    <div className="calc-ui"><span>◆</span><span>UI recomendada: <b>{ui.m}</b> — {fmt(ui.cap)} BTU/h (menor que atende a carga).</span></div>
    <div className="brk">
      <div className="cl"><div className="ch" style={{ color: "var(--primary-deep)" }}><span>Sensível</span><span>{fmt(r.s)} W</span></div>{sp.map((p) => <div className="pr" key={p.n}><span>{p.n}</span><span className="pv">{fmt(p.w)}</span></div>)}</div>
      <div className="cl"><div className="ch" style={{ color: "var(--info)" }}><span>Latente</span><span>{fmt(r.l)} W</span></div>{lp.map((p) => <div className="pr" key={p.n}><span>{p.n}</span><span className="pv">{fmt(p.w)}</span></div>)}</div>
    </div>
    {r.al.map((x, i) => <div className="al" key={i}><span>△</span><span>{x}</span></div>)}
    <div className="toolsec" style={{ marginTop: 18 }}>Memorial justificativo <span className="tg">IA</span></div>
    <div className="calc-mem">
      <div className="h"><span className="t">Parágrafo do memorial — {a.nome}</span><button className="btn pri" onClick={gerar} disabled={loading}>{loading ? "Gerando…" : "Gerar com IA"}</button></div>
      <div className={"b" + (mem ? "" : " ph")}>{mem || "Clique em \u201cGerar com IA\u201d. A IA escreve o texto a partir dos números do motor — não recalcula nada."}</div>
    </div>
  </div>);
}

function Login({ onEntrar, tema, setTema }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const entrar = (e) => { e.preventDefault(); if (!email || !senha) { setErro("Informe e-mail e senha."); return; } setErro(""); onEntrar(email); };
  const recuperar = (e) => { e.preventDefault(); if (!email) { setErro("Informe seu e-mail."); return; } setErro(""); setEnviado(true); };
  return (<div className={"login-wrap" + (tema === "light" ? " light" : "")}>
    <button className="login-theme" onClick={() => setTema((t) => t === "dark" ? "light" : "dark")}>{tema === "dark" ? "☀" : "☾"}</button>
    <div className="loginbox">
      <div className="login-brand"><Logo /><div className="b">PROJECT <span>AR</span></div></div>
      {modo === "login" ? (<>
        <div className="login-sub">Acesso ao sistema de memorial · VRV / VRF</div>
        <form onSubmit={entrar}>
          <div className="lf"><label>E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@projectarc.com.br" /></div>
          <div className="lf"><label>Senha</label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" /></div>
          <button className="entrar" type="submit">Entrar</button>
          {erro && <div className="login-err">{erro}</div>}
        </form>
        <div className="login-forgot" onClick={() => { setModo("reset"); setErro(""); }}>Esqueci minha senha</div>
      </>) : enviado ? (<>
        <div className="login-sub" style={{ marginTop: 10, lineHeight: 1.5 }}>Se houver uma conta com <b>{email}</b>, enviamos um link para redefinir a senha. Confira seu e-mail.</div>
        <button className="entrar" onClick={() => { setModo("login"); setEnviado(false); }}>Voltar ao login</button>
      </>) : (<>
        <div className="login-sub">Recuperar senha</div>
        <form onSubmit={recuperar}>
          <div className="lf"><label>E-mail da conta</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@projectarc.com.br" /></div>
          <button className="entrar" type="submit">Enviar link de recuperação</button>
          {erro && <div className="login-err">{erro}</div>}
        </form>
        <div className="login-forgot" onClick={() => { setModo("login"); setErro(""); }}>Voltar ao login</div>
      </>)}
    </div>
  </div>);
}

export default function App() {
  const [screen, setScreen] = useState("projetos");
  const [projId, setProjId] = useState(null);
  const [aba, setAba] = useState("ambientes");
  const [ambientesByProj, setAmbientesByProj] = useState({ fbv: AMB0 });
  const [selId, setSelId] = useState("1.01");
  const [fotos, setFotos] = useState({});
  const [tema, setTema] = useState("dark");
  const [sync, setSync] = useState("idle");
  const [ultimaSync, setUltimaSync] = useState(null);
  const [catalogo, setCatalogo] = useState(CAT_SEED);
  const [catArquivos, setCatArquivos] = useState([]);
  const [visitas, setVisitas] = useState([
    { id: "v1", obra: "Fazenda Boa Vista", tipo: "medicao", data: "2026-08-27", hora: "09:00" },
    { id: "v2", obra: "Cobertura Vila Nova", tipo: "visita", data: "2026-08-27", hora: "14:30" },
    { id: "v3", obra: "Fazenda Boa Vista", tipo: "comiss", data: "2026-09-02", hora: "10:00" },
  ]);
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [anotacoes, setAnotacoes] = useState({ fbv: [
    { id: "a1", texto: "Cliente pediu unidades o mais silenciosas possível no quarto da Cecília (bebê).", importante: true },
    { id: "a2", texto: "Condomínio exige agendamento na portaria com 24h de antecedência para acesso.", importante: true },
    { id: "a3", texto: "Confirmar prumada de dreno da adega em obra antes de fechar tubulação.", importante: false },
  ] });
  const [projetos, setProjetos] = useState(PROJETOS);
  const criarObra = (nome, cliente) => setProjetos((ps) => ps.some((p) => p.nome.toLowerCase() === nome.toLowerCase()) ? ps : [...ps, { id: "o" + Date.now(), nome, codigo: "OBRA-" + String(Date.now()).slice(-4), cliente: cliente || "—", local: "", status: "rascunho", editavel: true }]);

  // Puxa o estado da nuvem (usado no login e no botão de recarregar)
  const carregarNuvem = async () => {
    try {
      const { data: row, error } = await supabase.from("app_estado").select("dados").eq("org", "projectar").maybeSingle();
      if (error) { console.error("Sync — erro ao carregar:", error.message); setSync("error"); return; }
      if (row && row.dados) {
        const d = row.dados;
        if (d.projetos) setProjetos(d.projetos);
        if (d.ambientesByProj) setAmbientesByProj(d.ambientesByProj);
        if (d.anotacoes) setAnotacoes(d.anotacoes);
        if (d.visitas) setVisitas(d.visitas);
        if (d.fotos) setFotos(d.fotos);
        if (d.catalogo) setCatalogo(d.catalogo);
        if (d.catArquivos) setCatArquivos(d.catArquivos);
      }
      setSync("saved"); setUltimaSync(new Date());
    } catch (e) { console.error("Sync — falha ao carregar:", e); setSync("error"); }
  };

  // Carrega sessão + estado no login
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = "/login"; return; }
      if (!alive) return;
      setUsuario(data.session.user.email || "");
      await carregarNuvem();
      if (alive) setLogado(true);
    });
    return () => { alive = false; };
  }, []);

  // Salva na nuvem (debounced) com status visível
  useEffect(() => {
    if (!logado) return;
    setSync("saving");
    const t = setTimeout(async () => {
      const { error } = await supabase.from("app_estado").upsert({ org: "projectar", dados: { projetos, ambientesByProj, anotacoes, visitas, fotos, catalogo, catArquivos }, updated_at: new Date().toISOString() }, { onConflict: "org" });
      if (error) { console.error("Sync — erro ao salvar:", error.message); setSync("error"); }
      else { setSync("saved"); setUltimaSync(new Date()); }
    }, 900);
    return () => clearTimeout(t);
  }, [projetos, ambientesByProj, anotacoes, visitas, fotos, catalogo, catArquivos, logado]);
  const proj = projetos.find((p) => p.id === projId);
  const ambientes = (proj && ambientesByProj[proj.id]) || [];
  const setAmbientes = (nl) => { if (proj) setAmbientesByProj((prev) => ({ ...prev, [proj.id]: typeof nl === "function" ? nl(prev[proj.id] || []) : nl })); };
  const totalProj = ambientes.reduce((s, a) => s + calc(a, COND).btu, 0);

  const abrir = (p) => { setProjId(p.id); setScreen("projeto"); setAba("ambientes"); setSelId((ambientesByProj[p.id] || [])[0]?.id || ""); };
  const novoProjeto = () => {
    const id = "p" + Date.now();
    setProjetos((ps) => [{ id, nome: "Novo projeto", codigo: "OBRA-" + String(Date.now()).slice(-4), cliente: "", local: "", status: "rascunho", editavel: true }, ...ps]);
    setProjId(id); setScreen("projeto"); setAba("ambientes"); setSelId("");
  };
  const excluirProjeto = (id) => {
    setProjetos((ps) => ps.filter((p) => p.id !== id));
    setAmbientesByProj((m) => { const n = { ...m }; delete n[id]; return n; });
    setAnotacoes((m) => { const n = { ...m }; delete n[id]; return n; });
  };
  const updProjeto = (id, campo, valor) => setProjetos((ps) => ps.map((p) => p.id === id ? { ...p, [campo]: valor } : p));

  if (!logado) return (<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a1b2e", color: "#8ba6bf", fontFamily: "system-ui" }}>Carregando…</div>);

  return (<div className={"app" + (tema === "light" ? " light" : "")}><style>{CSS}</style>
    <div className="sb">
      <div className="sb-brand" style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo /><div><div className="b">PROJECT <span>AR</span></div><div className="s">Memorial VRV/VRF</div></div></div>
      <div className="nav">
        <button className={screen === "projetos" || screen === "projeto" ? "on" : ""} onClick={() => setScreen("projetos")}>◧ Projetos</button>
        <button className={screen === "agenda" ? "on" : ""} onClick={() => setScreen("agenda")}>◔ Agenda</button>
        <button className={screen === "calculo" ? "on" : ""} onClick={() => setScreen("calculo")}>◆ Cálculo</button>
        <button className={screen === "dutos" ? "on" : ""} onClick={() => setScreen("dutos")}>❋ Dutos</button>
        <button className={screen === "catalogo" ? "on" : ""} onClick={() => setScreen("catalogo")}>▤ Catálogo</button>
      </div>
      <div className="sb-bottom">
        <div style={{ padding: "0 12px 8px" }}><div className={"synch " + (sync === "error" ? "err" : "on")} onClick={carregarNuvem} title="Toque para recarregar da nuvem"><span className="d"></span>{sync === "saving" ? "Sincronizando…" : sync === "error" ? "Erro ao sincronizar" : ultimaSync ? "Sincronizado às " + ultimaSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sincronizado"}</div></div>
        <div className="sb-user"><div className="av">{(usuario[0] || "U").toUpperCase()}</div><div style={{ marginLeft: 8, minWidth: 0, flex: 1 }}><div className="nm" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{usuario.split("@")[0] || "usuário"}</div><div className="rl">conectado</div></div><button className="themebtn" title="Alternar tema" onClick={() => setTema((t) => t === "dark" ? "light" : "dark")}>{tema === "dark" ? "☀" : "☾"}</button><button className="sair" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>Sair</button></div>
      </div>
    </div>

    <div className="main">
      {screen === "projetos" && (<>
        <div className="top"><div className="h1">Projetos</div><button className="btn pri" onClick={novoProjeto}>+ Novo projeto</button></div>
        <div className="pgrid">{projetos.map((p) => { const [lbl, cls] = STATUS[p.status]; const impN = (anotacoes[p.id] || []).filter((n) => n.importante).length; const tot = (ambientesByProj[p.id] || []).reduce((s, a) => s + calc(a, COND).btu, 0); return (
          <div key={p.id} className="pcard" onClick={() => abrir(p)}>
            <button className="pcard-del" title="Excluir obra" onClick={(e) => { e.stopPropagation(); if (window.confirm('Excluir a obra "' + p.nome + '"? Esta ação não pode ser desfeita.')) excluirProjeto(p.id); }}>×</button>
            <div className="code">{p.codigo}</div><div className="nm">{p.nome}{impN > 0 && <span className="flagbadge">⚑ {impN}</span>}</div><div className="cl">{(p.cliente || "—") + " · " + (p.local || "—")}</div>
            <div className="ft"><span className={"badge " + cls}>{lbl}</span><span className="mt">{tot ? fmt(tot) + " BTU/h" : "abrir p/ medir"}</span></div>
          </div>); })}</div>
      </>)}

      {screen === "projeto" && proj && (<>
        <div onClick={() => setScreen("projetos")} className="crumb">◧ Projetos / {proj.codigo}</div>
        <div className="top"><div style={{ minWidth: 0, flex: 1 }}><input className="proj-nome" value={proj.nome} onChange={(e) => updProjeto(proj.id, "nome", e.target.value)} /><input className="proj-cli" value={proj.cliente === "—" ? "" : proj.cliente} placeholder="Cliente" onChange={(e) => updProjeto(proj.id, "cliente", e.target.value)} /></div><div style={{ fontFamily: "IBM Plex Mono", fontSize: 13, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{ambientes.length} amb · {fmt(totalProj)} BTU/h · {(totalProj / 12000).toFixed(2)} TR</div></div>
        {(anotacoes[proj.id] || []).some((n) => n.importante) && (
          <div className="sig" onClick={() => setAba("anotacoes")}>
            <span className="ic">⚑</span>
            <span><b>{(anotacoes[proj.id] || []).filter((n) => n.importante).length} anotação(ões) importante(s)</b> nesta obra — confira antes da visita.</span>
            <span className="go">ver →</span>
          </div>
        )}
        <div className="subtabs">
          <button className={"subtab" + (aba === "ambientes" ? " on" : "")} onClick={() => setAba("ambientes")}>Ambientes</button>
          <button className={"subtab" + (aba === "fotos" ? " on" : "")} onClick={() => setAba("fotos")}>Fotos</button>
          <button className={"subtab" + (aba === "balanco" ? " on" : "")} onClick={() => setAba("balanco")}>Balanço</button>
          <button className={"subtab" + (aba === "relatorios" ? " on" : "")} onClick={() => setAba("relatorios")}>Relatórios</button>
          <button className={"subtab" + (aba === "anotacoes" ? " on" : "")} onClick={() => setAba("anotacoes")}>Anotações{(anotacoes[proj.id] || []).some((n) => n.importante) && <span className="flagbadge">⚑ {(anotacoes[proj.id] || []).filter((n) => n.importante).length}</span>}</button>
        </div>
        {aba === "ambientes" && <Ambientes ambientes={ambientes} setAmbientes={setAmbientes} cond={COND} selId={selId} setSelId={setSelId} />}
        {aba === "fotos" && <Fotos ambientes={ambientes} fotos={fotos} setFotos={setFotos} />}
        {aba === "balanco" && <Balanco ambientes={ambientes} cond={COND} />}
        {aba === "relatorios" && <Relatorios ambientes={ambientes} cond={COND} />}
        {aba === "anotacoes" && <Anotacoes lista={anotacoes[proj.id] || []} setLista={(nl) => setAnotacoes((prev) => ({ ...prev, [proj.id]: nl }))} />}
      </>)}

      {screen === "agenda" && (<>
        <div className="top"><div className="h1">Agenda de visitas</div><div style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color: "var(--ink-soft)" }}>{visitas.length} agendadas</div></div>
        <Agenda visitas={visitas} setVisitas={setVisitas} projetos={projetos} onCriarObra={criarObra} />
      </>)}

      {screen === "calculo" && (<>
        <div className="top"><div className="h1">Cálculo de capacidade</div></div>
        <CalculoTool />
      </>)}

      {screen === "dutos" && (<>
        <div className="top"><div className="h1">Dimensionamento de dutos</div></div>
        <Dutos />
      </>)}

      {screen === "catalogo" && (<>
        <div className="top"><div className="h1">Catálogo de equipamentos</div></div>
        <Catalogo catalogo={catalogo} setCatalogo={setCatalogo} catArquivos={catArquivos} setCatArquivos={setCatArquivos} />
      </>)}
    </div>
  </div>);
}
