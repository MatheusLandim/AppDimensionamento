"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Envolve as páginas protegidas. Sem sessão -> manda pro /login.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setOk(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ok) return null; // evita piscar conteúdo antes de checar a sessão
  return <>{children}</>;
}

// Botão de sair — usar na sidebar:
//   import { logout } from "@/components/AuthGuard";
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
