import { NextResponse } from "next/server";
import { z } from "zod";
import { supabasePublic, supabaseAdmin } from "@/lib/supabase";

// GET /api/catalogo/ue?fabricante=Daikin&cap_min=100000&cap_max=200000
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let q = supabasePublic.from("equipamentos_ue").select("*").eq("ativo", true);

  const fabricante = searchParams.get("fabricante");
  const capMin = searchParams.get("cap_min");
  const capMax = searchParams.get("cap_max");
  if (fabricante) q = q.eq("fabricante", fabricante);
  if (capMin) q = q.gte("cap_refrig_btu", Number(capMin));
  if (capMax) q = q.lte("cap_refrig_btu", Number(capMax));

  const { data, error } = await q.order("cap_refrig_btu");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

const ueSchema = z.object({
  fabricante: z.enum(["Daikin", "LG", "Outro"]),
  modelo: z.string().min(1),
  linha: z.string().optional(),
  cap_refrig_btu: z.number().int().positive(),
  cap_refrig_kw: z.number().optional(),
  max_ui_conectaveis: z.number().int().optional(),
  taxa_conexao_min_pct: z.number().optional(),
  taxa_conexao_max_pct: z.number().optional(),
  fluido_refrig: z.enum(["R410A", "R32", "R454B", "Outro"]).optional(),
  tensao_v: z.number().int().optional(),
  fases: z.number().int().optional(),
});

// POST /api/catalogo/ue  (cadastro — service role)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ueSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("equipamentos_ue")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
