"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) setErro("E-mail ou senha inválidos.");
    else router.push("/");
  }

  async function recuperar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErro(""); setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    setLoading(false);
    // Não revela se o e-mail existe (boa prática de segurança)
    setMsg(`Se houver uma conta com ${email}, enviamos um link para redefinir a senha.`);
  }

  const box: React.CSSProperties = { width: 360, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.11)", borderRadius: 14, padding: 30, backdropFilter: "blur(16px)" };
  const inp: React.CSSProperties = { width: "100%", padding: 10, margin: "4px 0 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,.11)", background: "rgba(255,255,255,.03)", color: "#fff" };
  const btn: React.CSSProperties = { width: "100%", padding: 12, borderRadius: 7, border: "none", background: "linear-gradient(135deg,#6fbfe0,#3f9dc4)", color: "#06243a", fontWeight: 600, cursor: "pointer" };
  const link: React.CSSProperties = { textAlign: "center", fontSize: 12, color: "#6fbfe0", marginTop: 16, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a1b2e", color: "#e9f1f8", fontFamily: "system-ui" }}>
      <div style={box}>
        <h1 style={{ fontSize: 20, textAlign: "center", marginBottom: 4 }}>PROJECT <span style={{ color: "#6fbfe0" }}>AR</span></h1>

        {modo === "login" ? (
          <>
            <p style={{ textAlign: "center", fontSize: 12, color: "#8ba6bf", marginBottom: 22 }}>Acesso ao sistema de memorial</p>
            <form onSubmit={entrar}>
              <label style={{ fontSize: 11, color: "#8ba6bf" }}>E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
              <label style={{ fontSize: 11, color: "#8ba6bf" }}>Senha</label>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={inp} />
              <button type="submit" disabled={loading} style={btn}>{loading ? "Entrando…" : "Entrar"}</button>
              {erro && <p style={{ color: "#e5715f", fontSize: 12, textAlign: "center", marginTop: 12 }}>{erro}</p>}
            </form>
            <div style={link} onClick={() => { setModo("reset"); setErro(""); setMsg(""); }}>Esqueci minha senha</div>
          </>
        ) : (
          <>
            <p style={{ textAlign: "center", fontSize: 12, color: "#8ba6bf", marginBottom: 22 }}>Recuperar senha</p>
            {msg ? (
              <>
                <p style={{ fontSize: 13, color: "#e9f1f8", lineHeight: 1.5, textAlign: "center" }}>{msg}</p>
                <div style={link} onClick={() => { setModo("login"); setMsg(""); }}>Voltar ao login</div>
              </>
            ) : (
              <form onSubmit={recuperar}>
                <label style={{ fontSize: 11, color: "#8ba6bf" }}>E-mail da conta</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
                <button type="submit" disabled={loading} style={btn}>{loading ? "Enviando…" : "Enviar link de recuperação"}</button>
                {erro && <p style={{ color: "#e5715f", fontSize: 12, textAlign: "center", marginTop: 12 }}>{erro}</p>}
                <div style={link} onClick={() => { setModo("login"); setErro(""); }}>Voltar ao login</div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
