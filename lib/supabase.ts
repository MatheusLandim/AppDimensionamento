import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Leitura: respeita RLS. Usar em GET.
export const supabasePublic = createClient(url, anon);

// Escrita: ignora RLS. NUNCA expor ao browser — só em route handlers.
export const supabaseAdmin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
