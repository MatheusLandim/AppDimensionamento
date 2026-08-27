# Project Ar — App de produção (Next.js + Supabase)

App completo: projetos, cálculo de capacidade, dutos + perda de carga, catálogo,
agenda com calendário, anotações, fotos, login com recuperação de senha e memorial com IA.

## Subir em produção (passo a passo)

### 1. Supabase
1. Crie um projeto novo no Supabase.
2. SQL Editor → rode, nesta ordem: `supabase/schema.sql`, `supabase/schema-fase2.sql`, `supabase/schema-app.sql`.
3. Authentication → Users → Add user: crie seu login (ex.: matheus@projectarc.com.br) e senha. Repita p/ Vittória e Flávio.
4. Authentication → Providers → Email: desligue "Confirm email".
5. Copie: Project URL, anon key e service_role key (Settings → API).

### 2. GitHub
Suba esta pasta num repositório novo.

### 3. Vercel
1. Importe o repositório.
2. Em Environment Variables, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`  (para o memorial com IA)
3. Deploy.

### 4. Recuperação de senha
Supabase → Authentication → URL Configuration:
- Site URL: a URL do app na Vercel.
- Redirect URLs: adicione `https://SEU-APP/reset`.

Pronto. Acesse a URL, faça login e use.

## O que persiste
- **Supabase (tabela app_estado, JSONB):** projetos, ambientes, anotações e visitas — sincroniza entre você, Vittória e Flávio.
- **Supabase Storage (bucket fotos):** fotos das obras.
- **Memorial com IA:** via rota segura `/api/memorial` (sua chave nunca vai ao navegador).

## Notas honestas (v1)
- Persistência usa um documento JSONB por organização — simples e confiável para a equipe.
  Quando o volume crescer, dá para migrar projetos/ambientes para as tabelas normalizadas
  (já existem no schema) e usar a API de catálogo (`/api/catalogo`), que também já está pronta.
- A aba Catálogo mostra dados de referência; ligá-la ao catálogo do banco é o próximo incremento.
- O modelo da IA no memorial está como `claude-sonnet-5` em `app/api/memorial/route.ts` — ajuste se quiser outro.
