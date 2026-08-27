import { NextResponse } from "next/server";
import { z } from "zod";
import { supabasePublic, supabaseAdmin } from "@/lib/supabase";

// GET /api/catalogo/ui?fabricante=Daikin&tipo=Cassete 4 vias&cap_min=8000&cap_max=20000
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let q = supabasePublic.from("equipamentos_ui").select("*").eq("ativo", true);

  const fabricante = searchParams.get("fabricante");
  const tipo = searchParams.get("tipo");
  const capMin = searchParams.get("cap_min");
  const capMax = searchParams.get("cap_max");
  if (fabricante) q = q.eq("fabricante", fabricante);
  if (tipo) q = q.eq("tipo", tipo);
  if (capMin) q = q.gte("cap_refrig_btu", Number(capMin));
  if (capMax) q = q.lte("cap_refrig_btu", Number(capMax));

  const { data, error } = await q.order("cap_refrig_btu");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

const uiSchema = z.object({
  fabricante: z.enum(["Daikin", "LG", "Outro"]),
  tipo: z.string().min(1),
  modelo: z.string().min(1),
  cap_refrig_btu: z.number().int().positive(),
  cap_refrig_kw: z.number().optional(),
  vazao_ar_m3h: z.number().int().optional(),
  tensao_v: z.number().int().optional(),
  fases: z.number().int().optional(),
  diam_tubo_liquido_mm: z.number().optional(),
  diam_tubo_gas_mm: z.number().optional(),
  dreno_mm: z.number().optional(),
});

// POST /api/catalogo/ui  (cadastro — service role)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = uiSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("equipamentos_ui")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
