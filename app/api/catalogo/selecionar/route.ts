import { NextResponse } from "next/server";
import { z } from "zod";
import { supabasePublic } from "@/lib/supabase";
import { selecionarUI, selecionarUE } from "@/lib/selecao";
import type { EquipamentoUE, EquipamentoUI } from "@/lib/types";

// POST /api/catalogo/selecionar
// body: { ambientes: [{ nome, cargaBtu }], filtros?: { fabricante?, tipo? } }
// -> para cada ambiente escolhe a UI; soma; sugere UEs compatíveis.
// Este é o contrato que o gerador de memorial (Fase 2) chama.

const schema = z.object({
  ambientes: z
    .array(z.object({ nome: z.string(), cargaBtu: z.number().positive() }))
    .min(1),
  filtros: z
    .object({ fabricante: z.string().optional(), tipo: z.string().optional() })
    .optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ambientes, filtros = {} } = parsed.data;

  const [uiRes, ueRes] = await Promise.all([
    supabasePublic.from("equipamentos_ui").select("*").eq("ativo", true),
    supabasePublic.from("equipamentos_ue").select("*").eq("ativo", true),
  ]);
  if (uiRes.error || ueRes.error)
    return NextResponse.json(
      { error: uiRes.error?.message ?? ueRes.error?.message },
      { status: 500 }
    );

  const catUI = uiRes.data as EquipamentoUI[];
  const catUE = ueRes.data as EquipamentoUE[];

  const itens = ambientes.map((a) => ({
    ambiente: a.nome,
    ...selecionarUI(a.cargaBtu, catUI, filtros),
  }));

  const somaUi = itens.reduce(
    (s, it) => s + (it.escolhida?.cap_refrig_btu ?? 0),
    0
  );
  const qtdUi = itens.filter((it) => it.escolhida).length;
  const uesSugeridas = selecionarUE(somaUi, qtdUi, catUE, {
    fabricante: filtros.fabricante,
  });

  return NextResponse.json({
    itens,
    resumo: { somaUi, qtdUi, uesSugeridas },
  });
}
