// =====================================================================
//  MOTOR DE CARGA TÉRMICA — método por componentes
//  Base: NBR 16401-1 (carga), -2 (conforto interno), -3 (ar externo),
//        alinhado a ASHRAE Fundamentals.
//
//  IMPORTANTE (engenharia, não marketing):
//  - A física é determinística. A IA NÃO entra aqui.
//  - As TABELAS abaixo são valores-base EDITÁVEIS. Confira contra a
//    NBR 16401 e as condições reais do projeto (cidade, vidro, construção).
//  - É um método de carga de PICO por componentes — estimativa de
//    engenharia sólida, não simulação horária (EnergyPlus/TRNSYS).
// =====================================================================

// ---------- Psicrometria ----------
/** Pressão atmosférica (kPa) pela altitude (m) — fórmula barométrica ISA. */
export function pressaoKpa(altitude_m: number): number {
  return 101.325 * Math.pow(1 - 2.25577e-5 * altitude_m, 5.25588);
}
/** Fator de densidade do ar relativo ao nível do mar. Corrige as constantes de ar externo. */
export function fatorDensidade(altitude_m: number): number {
  return pressaoKpa_(altitude_m) / 101.325;
}
const pressaoKpa_ = pressaoKpa;
/** Pressão de vapor saturado (kPa) — Magnus. */
export function pvSat(T: number): number {
  return 0.61094 * Math.exp((17.625 * T) / (T + 243.04));
}
/** Razão de umidade (kg/kg) a partir de T (°C), UR (%) e P (kPa). */
export function razaoUmidade(T: number, UR: number, P: number): number {
  const pv = (UR / 100) * pvSat(T);
  return (0.622 * pv) / (P - pv);
}

// ---------- Tabelas-base (EDITÁVEIS — validar na NBR/projeto) ----------
export const DEFAULTS = {
  // Ganho por pessoa (W) — sensível/latente por nível de atividade (ASHRAE/NBR 16401-2)
  pessoa: {
    repouso: { s: 65, l: 35 },
    sentado_leve: { s: 70, l: 45 },
    atividade_moderada: { s: 75, l: 55 },
    exercicio: { s: 185, l: 315 },
  } as Record<string, { s: number; l: number }>,

  // Renovação de ar (NBR 16401-3): L/s por pessoa (pp) + L/s por m² (pa)
  renovacao: {
    residencia: { pp: 2.5, pa: 0.3 },
    escritorio: { pp: 2.5, pa: 0.3 },
    academia: { pp: 10.0, pa: 0.3 },
    restaurante: { pp: 5.0, pa: 0.9 },
  } as Record<string, { pp: number; pa: number }>,

  // Transmitância U (W/m²·K) — construção típica
  u: { parede: 2.5, vidro_simples: 5.8, vidro_duplo: 2.9, cobertura: 2.0, piso: 2.5 },

  // Fator solar do vidro (SHGC)
  shgc: { simples_incolor: 0.82, laminado: 0.72, refletivo: 0.45, duplo_lowe: 0.40 },

  // ΔT equivalente sol-ar (K) p/ superfície opaca por orientação
  dtEq: { parede: { N: 14, L: 20, S: 10, O: 25 } as Record<string, number>, coberturaSol: 40, coberturaSombra: 12 },

  // Radiação solar de projeto através de vidro simples (W/m²) por orientação (pico)
  radVidro: { N: 130, L: 500, S: 90, O: 520, H: 700 } as Record<string, number>,

  fatorUsoIluminacao: 0.85,
  // Constantes de ar externo ao nível do mar (por L/s): sensível, latente
  cSens: 1.23,
  cLat: 3010,
};

const W_PARA_BTU = 3.412142;

// ---------- Tipos ----------
export interface Condicoes {
  textBS: number;   // bulbo seco externo de projeto (°C) — NBR 16401-1 por cidade
  urExt: number;    // UR externa de projeto (%)
  tInt: number;     // bulbo seco interno de conforto (°C) — NBR 16401-2
  urInt: number;    // UR interna (%)
  altitude: number; // m
}

export interface AmbienteInput {
  nome: string;
  area: number;            // m²
  peDireito: number;       // m
  nPessoas: number;
  atividade: keyof typeof DEFAULTS.pessoa;
  categoria: keyof typeof DEFAULTS.renovacao;
  iluminacaoWm2: number;   // W/m²
  equipamentosW: number;   // W (sensível)
  paredeExtArea: number;   // m² de parede externa (sem vidro)
  orientacao: "N" | "L" | "S" | "O";
  vidroArea: number;       // m²
  shgc?: number;
  uVidro?: number;
  uParede?: number;
  coberturaExposta: boolean;
  coberturaArea?: number;  // default = area
  pisoSobreNaoCond?: boolean;
}

export interface Parcela { nome: string; tipo: "sensivel" | "latente"; w: number; }
export interface ResultadoCarga {
  ambiente: string;
  parcelas: Parcela[];
  sensivelW: number;
  latenteW: number;
  totalW: number;
  totalBtu: number;
  fcs: number;          // fator de calor sensível
  wm2: number;
  vazaoArLs: number;
  alertas: string[];
}

// ---------- Cálculo ----------
export function calcularCarga(a: AmbienteInput, c: Condicoes, d = DEFAULTS): ResultadoCarga {
  const P = pressaoKpa(c.altitude);
  const dens = P / 101.325;
  const dT = c.textBS - c.tInt;
  const Wext = razaoUmidade(c.textBS, c.urExt, P);
  const Wint = razaoUmidade(c.tInt, c.urInt, P);
  const dW = Math.max(0, Wext - Wint);

  const shgc = a.shgc ?? d.shgc.simples_incolor;
  const uVidro = a.uVidro ?? d.u.vidro_simples;
  const uParede = a.uParede ?? d.u.parede;
  const pes = d.pessoa[a.atividade] ?? d.pessoa.atividade_moderada;
  const ren = d.renovacao[a.categoria] ?? d.renovacao.residencia;

  const P_: Parcela[] = [];
  const S = (nome: string, w: number) => P_.push({ nome, tipo: "sensivel", w: Math.round(w) });
  const L = (nome: string, w: number) => P_.push({ nome, tipo: "latente", w: Math.round(w) });

  // --- Sensível ---
  S("Parede externa (sol-ar)", uParede * a.paredeExtArea * (d.dtEq.parede[a.orientacao] ?? dT));
  if (a.coberturaExposta) {
    const acob = a.coberturaArea ?? a.area;
    S("Cobertura (sol-ar)", d.u.cobertura * acob * d.dtEq.coberturaSol);
  }
  if (a.pisoSobreNaoCond) S("Piso", d.u.piso * a.area * (dT * 0.5));
  S("Vidro — condução", uVidro * a.vidroArea * dT);
  S("Vidro — radiação solar", a.vidroArea * shgc * (d.radVidro[a.orientacao] ?? 0));
  S("Pessoas (sensível)", a.nPessoas * pes.s);
  S("Iluminação", a.iluminacaoWm2 * a.area * d.fatorUsoIluminacao);
  S("Equipamentos", a.equipamentosW);

  // Ar externo (renovação) — NBR 16401-3, corrigido por densidade
  const vazaoLs = ren.pp * a.nPessoas + ren.pa * a.area;
  S("Ar externo (sensível)", d.cSens * dens * vazaoLs * dT);

  // --- Latente ---
  L("Pessoas (latente)", a.nPessoas * pes.l);
  L("Ar externo (latente)", d.cLat * dens * vazaoLs * dW);

  const sensivelW = P_.filter((p) => p.tipo === "sensivel").reduce((s, p) => s + p.w, 0);
  const latenteW = P_.filter((p) => p.tipo === "latente").reduce((s, p) => s + p.w, 0);
  const totalW = sensivelW + latenteW;
  const fcs = totalW > 0 ? sensivelW / totalW : 1;
  const wm2 = a.area > 0 ? totalW / a.area : 0;

  // --- Validadores (QA determinístico) ---
  const alertas: string[] = [];
  if (wm2 > 250) alertas.push(`Densidade de carga alta (${Math.round(wm2)} W/m²) — reconferir vidro/cobertura/orientação.`);
  if (wm2 < 80 && a.area > 0) alertas.push(`Densidade baixa (${Math.round(wm2)} W/m²) — conferir se faltou parcela.`);
  if (fcs < 0.6) alertas.push(`FCS ${fcs.toFixed(2)} baixo — carga latente elevada, revisar renovação de ar.`);
  if (a.nPessoas === 0) alertas.push("Ocupação zero — confirmar se o ambiente é ocupado.");
  if (a.vidroArea > a.paredeExtArea + a.vidroArea && a.vidroArea > 0)
    alertas.push("Área de vidro maior que a parede — conferir esquadrias.");

  return {
    ambiente: a.nome, parcelas: P_, sensivelW, latenteW, totalW,
    totalBtu: Math.round(totalW * W_PARA_BTU), fcs,
    wm2: Math.round(wm2), vazaoArLs: Math.round(vazaoLs * 10) / 10, alertas,
  };
}

/** Estimativa rápida por regra de bolso (só p/ orçamento preliminar). */
export function estimativaRapida(area: number, fatorBtuM2: number): number {
  return Math.round(area * fatorBtuM2);
}
