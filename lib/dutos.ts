// =====================================================================
//  MOTOR DE DIMENSIONAMENTO DE DUTOS (SI)
//  Fricção: equação de Wright/ASHRAE (chapa galvanizada).
//  Circular padrão (espiro-duto) + retangular por diâmetro equivalente.
//  Valores de vazão de equipamento e limites de velocidade são
//  valores-base editáveis — confira datasheet e SMACNA/NBR 16401.
// =====================================================================

export const BITOLAS_STD = [100, 125, 150, 160, 180, 200, 224, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250];

/** Perda de carga por metro (Pa/m). Q em m³/s, D em m. */
export function fricaoPorMetro(Q: number, D: number): number {
  return 0.022243 * Math.pow(Q, 1.852) / Math.pow(D, 4.973);
}

/** Diâmetro equivalente (mm) de um duto retangular a×b (mm). */
export function diametroEquivalente(a: number, b: number): number {
  return 1.30 * Math.pow(a * b, 0.625) / Math.pow(a + b, 0.25);
}

export interface ResultadoCircular { dCalcMm: number; dStdMm: number; velocidade: number; atrito: number; }

/**
 * Dimensiona duto circular.
 * @param vazaoM3h vazão em m³/h
 * @param metodo "friccao" (alvo em Pa/m) | "velocidade" (alvo em m/s)
 * @param alvo alvo do método
 */
export function dimensionarCircular(vazaoM3h: number, metodo: "friccao" | "velocidade", alvo: number): ResultadoCircular {
  const Q = vazaoM3h / 3600;
  let D: number;
  if (metodo === "velocidade") D = Math.sqrt(4 * (Q / alvo) / Math.PI);
  else D = Math.pow(0.022243 * Math.pow(Q, 1.852) / alvo, 1 / 4.973);
  const dCalcMm = D * 1000;
  const dStdMm = BITOLAS_STD.find((s) => s >= dCalcMm) ?? BITOLAS_STD[BITOLAS_STD.length - 1];
  const area = Math.PI * Math.pow(dStdMm / 1000, 2) / 4;
  return { dCalcMm: Math.round(dCalcMm), dStdMm, velocidade: Q / area, atrito: fricaoPorMetro(Q, dStdMm / 1000) };
}

export interface ResultadoRetangular { aMm: number; bMm: number; velocidade: number; deReal: number; }

/** Converte um diâmetro equivalente em duto retangular, dada a relação a/b. */
export function dimensionarRetangular(vazaoM3h: number, deMm: number, relacao: number): ResultadoRetangular {
  const k = 1.30 * Math.pow(relacao, 0.625) * Math.pow(relacao + 1, -0.25);
  const snap = (x: number) => Math.max(100, Math.round(x / 50) * 50);
  const bMm = snap(deMm / k), aMm = snap(relacao * (deMm / k));
  const Q = vazaoM3h / 3600, area = (aMm / 1000) * (bMm / 1000);
  return { aMm, bMm, velocidade: Q / area, deReal: Math.round(diametroEquivalente(aMm, bMm)) };
}

/** Limites de velocidade recomendados (m/s) por aplicação — editável. */
export const VELOCIDADE_MAX: Record<string, number> = {
  insuflamento_principal: 6.0,
  insuflamento_ramal: 4.0,
  retorno: 5.0,
  exaustao: 8.0,
  ventilacao_industrial: 10.0,
  ar_externo: 4.0,
};

/** Dimensiona uma lista de trechos e marca a redução entre bitolas consecutivas. */
export function dimensionarSistema(
  trechos: { nome: string; vazaoM3h: number }[],
  metodo: "friccao" | "velocidade",
  alvo: number,
) {
  let anterior: number | null = null;
  return trechos.map((t) => {
    const circ = dimensionarCircular(t.vazaoM3h, metodo, alvo);
    const reducao = anterior && anterior !== circ.dStdMm ? { de: anterior, para: circ.dStdMm } : null;
    anterior = circ.dStdMm;
    return { ...t, circular: circ, reducao };
  });
}
