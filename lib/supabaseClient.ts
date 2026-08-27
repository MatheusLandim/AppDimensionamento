"use client";
import { createClient } from "@supabase/supabase-js";

// Cliente de navegador — mantém a sessão do usuário logado.
// Usa a anon key (pública). A escrita sensível continua nas rotas server-side.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
