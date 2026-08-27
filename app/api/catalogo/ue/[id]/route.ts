import { NextResponse } from "next/server";
import { supabasePublic, supabaseAdmin } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { data, error } = await supabasePublic
    .from("equipamentos_ue")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { data, error } = await supabaseAdmin
    .from("equipamentos_ue")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// Soft delete: marca ativo=false (preserva histórico de projetos antigos).
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("equipamentos_ue")
    .update({ ativo: false })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
