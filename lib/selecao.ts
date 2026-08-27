// Lógica de seleção e compatibilidade.
// Funções PURAS (sem I/O): testáveis e reaproveitadas pelo memorial (Fase 2).

import type { EquipamentoUE, EquipamentoUI } from "./types";

export type Zona = "subdimensionado" | "ideal" | "atencao" | "excede";

export function zonaTaxa(pct: number): Zona {
  if (pct < 50) return "subdimensionado";
  if (pct <= 110) return "ideal";
  if (pct <= 130) return "atencao";
  return "excede";
}

export interface SelecaoUI {
  carga: number;
  escolhida: EquipamentoUI | null;
  folgaPct: number | null;      // quanto a UI escolhida excede a carga
  alternativas: EquipamentoUI[];
  alerta: string | null;
}

/** Menor UI do catálogo que atende a carga (com folga mínima). */
export function selecionarUI(
  carga: number,
  catalogo: EquipamentoUI[],
  filtros: { fabricante?: string; tipo?: string; folgaMaxPct?: number } = {}
): SelecaoUI {
  const { fabricante, tipo, folgaMaxPct = 40 } = filtros;
  const candidatos = catalogo
    .filter((u) => u.ativo)
    .filter((u) => !fabricante || u.fabricante === fabricante)
    .filter((u) => !tipo || u.tipo === tipo)
    .filter((u) => u.cap_refrig_btu >= carga)
    .sort((a, b) => a.cap_refrig_btu - b.cap_refrig_btu);

  const escolhida = candidatos[0] ?? null;
  const folgaPct = escolhida
    ? Math.round((1000 * (escolhida.cap_refrig_btu - carga)) / carga) / 10
    : null;
  const alerta =
    folgaPct !== null && folgaPct > folgaMaxPct
      ? `Folga de ${folgaPct}% acima da carga — avaliar modelo menor ou reconferir a carga térmica.`
      : escolhida === null
      ? `Nenhuma UI no catálogo atende ${carga} BTU/h com os filtros aplicados.`
      : null;

  return { carga, escolhida, folgaPct, alternativas: candidatos.slice(1, 3), alerta };
}

export interface AvaliacaoUE {
  taxa: number;
  zona: Zona;
  dentroTaxa: boolean;
  dentroQtd: boolean;
  limiteTaxa: number;
  limiteQtd: number;
}

/** Avalia uma UE específica contra a soma das UIs conectadas. */
export function avaliarUE(
  ue: EquipamentoUE,
  somaUiBtu: number,
  qtdUi: number
): AvaliacaoUE {
  const taxa = Math.round((1000 * somaUiBtu) / ue.cap_refrig_btu) / 10;
  const limiteTaxa = ue.taxa_conexao_max_pct ?? 130;
  const limiteQtd = ue.max_ui_conectaveis ?? Number.POSITIVE_INFINITY;
  return {
    taxa,
    zona: zonaTaxa(taxa),
    dentroTaxa: taxa <= limiteTaxa,
    dentroQtd: qtdUi <= limiteQtd,
    limiteTaxa,
    limiteQtd,
  };
}

/** UEs do catálogo capazes de suportar a soma das UIs, ordenadas pela taxa mais próxima do alvo. */
export function selecionarUE(
  somaUiBtu: number,
  qtdUi: number,
  catalogo: EquipamentoUE[],
  filtros: { fabricante?: string; taxaAlvo?: number } = {}
) {
  const { fabricante, taxaAlvo = 100 } = filtros;
  return catalogo
    .filter((e) => e.ativo)
    .filter((e) => !fabricante || e.fabricante === fabricante)
    .map((ue) => ({ ue, ...avaliarUE(ue, somaUiBtu, qtdUi) }))
    .filter((r) => r.dentroTaxa && r.dentroQtd)
    .sort((a, b) => Math.abs(a.taxa - taxaAlvo) - Math.abs(b.taxa - taxaAlvo));
}
