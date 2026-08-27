"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Página aberta pelo link do e-mail de recuperação.
// O Supabase cria uma sessão temporária de "PASSWORD_RECOVERY";
// aqui o usuário define a nova senha via updateUser.
export default function ResetPage() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // sessão já pode existir (link processado) ...
    supabase.auth.getSession().then(({ data }) => { if (data.session) setPronto(true); });
    // ... ou chegar pelo evento de recuperação
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPronto(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 6) { setErro("A senha precisa de pelo menos 6 caracteres."); return; }
    if (senha !== confirma) { setErro("As senhas não coincidem."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) setErro("Não foi possível redefinir. O link pode ter expirado — peça um novo.");
    else { setMsg("Senha redefinida com sucesso! Redirecionando…"); setTimeout(() => router.push("/"), 1500); }
  }

  const box: React.CSSProperties = { width: 360, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.11)", borderRadius: 14, padding: 30, backdropFilter: "blur(16px)" };
  const inp: React.CSSProperties = { width: "100%", padding: 10, margin: "4px 0 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,.11)", background: "rgba(255,255,255,.03)", color: "#fff" };
  const btn: React.CSSProperties = { width: "100%", padding: 12, borderRadius: 7, border: "none", background: "linear-gradient(135deg,#6fbfe0,#3f9dc4)", color: "#06243a", fontWeight: 600, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a1b2e", color: "#e9f1f8", fontFamily: "system-ui" }}>
      <div style={box}>
        <h1 style={{ fontSize: 20, textAlign: "center", marginBottom: 4 }}>PROJECT <span style={{ color: "#6fbfe0" }}>AR</span></h1>
        <p style={{ textAlign: "center", fontSize: 12, color: "#8ba6bf", marginBottom: 22 }}>Definir nova senha</p>
        {msg ? (
          <p style={{ fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>{msg}</p>
        ) : !pronto ? (
          <p style={{ fontSize: 13, color: "#8ba6bf", textAlign: "center", lineHeight: 1.5 }}>Abra esta página pelo link enviado ao seu e-mail. Se já abriu e nada aconteceu, o link pode ter expirado.</p>
        ) : (
          <form onSubmit={salvar}>
            <label style={{ fontSize: 11, color: "#8ba6bf" }}>Nova senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={inp} />
            <label style={{ fontSize: 11, color: "#8ba6bf" }}>Confirmar senha</label>
            <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} style={inp} />
            <button type="submit" disabled={loading} style={btn}>{loading ? "Salvando…" : "Redefinir senha"}</button>
            {erro && <p style={{ color: "#e5715f", fontSize: 12, textAlign: "center", marginTop: 12 }}>{erro}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
