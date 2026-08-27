// Tipos do catálogo — espelham as tabelas do schema.sql

export type Fabricante = "Daikin" | "LG" | "Outro";
export type Fluido = "R410A" | "R32" | "R454B" | "Outro";

export interface EquipamentoUE {
  id: string;
  fabricante: Fabricante;
  linha: string | null;
  modelo: string;
  cap_refrig_btu: number;
  cap_refrig_kw: number | null;
  cap_aquec_btu: number | null;
  max_ui_conectaveis: number | null;
  taxa_conexao_min_pct: number | null;
  taxa_conexao_max_pct: number | null;
  fluido_refrig: Fluido | null;
  carga_gas_fabrica_kg: number | null;
  tensao_v: number | null;
  fases: number | null;
  frequencia_hz: number | null;
  corrente_max_a: number | null;
  disjuntor_recomendado_a: number | null;
  potencia_nominal_kw: number | null;
  diam_tubo_liquido_mm: number | null;
  diam_tubo_gas_mm: number | null;
  comprimento_max_tub_m: number | null;
  comprimento_total_max_m: number | null;
  desnivel_max_m: number | null;
  largura_mm: number | null;
  altura_mm: number | null;
  profundidade_mm: number | null;
  peso_kg: number | null;
  nivel_ruido_db: number | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipamentoUI {
  id: string;
  fabricante: Fabricante;
  tipo: string;
  modelo: string;
  cap_refrig_btu: number;
  cap_refrig_kw: number | null;
  cap_aquec_btu: number | null;
  vazao_ar_m3h: number | null;
  tensao_v: number | null;
  fases: number | null;
  corrente_a: number | null;
  diam_tubo_liquido_mm: number | null;
  diam_tubo_gas_mm: number | null;
  dreno_mm: number | null;
  largura_mm: number | null;
  altura_mm: number | null;
  profundidade_mm: number | null;
  peso_kg: number | null;
  nivel_ruido_db: number | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}
