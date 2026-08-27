# Login e senha de acesso

Autenticação por e-mail/senha via Supabase Auth — mesmo padrão do controle financeiro.

## Arquivos

- `app/login/page.tsx` — login + "esqueci minha senha" (envia link de recuperação).
- `app/reset/page.tsx` — página aberta pelo link do e-mail; define a nova senha.
- `components/AuthGuard.tsx` — protege as páginas internas; sem sessão, vai pro `/login`. Traz `logout()`.
- `lib/supabaseClient.ts` — cliente de navegador que mantém a sessão.
- RLS já exige usuário `authenticated`: sem login, o banco não devolve nada.

## Seu login (importante)

Não existe login pré-definido no código — **você cria os usuários no Supabase**.
Não há cadastro público (é equipe fechada). Passos:

1. Supabase → **Authentication → Users → Add user**.
2. Crie sua conta com o e-mail que você já usa (ex.: `matheus@projectarc.com.br`)
   e uma senha à sua escolha. Repita para Vittória e Flávio.
3. **Authentication → Providers → Email**: deixe **Confirm email** desligado (acesso interno).

A partir daí, seu login é esse e-mail + a senha que você definiu.

## Fazer o "esqueci minha senha" funcionar

O fluxo já está codado. Falta só 1 configuração no Supabase:

1. Supabase → **Authentication → URL Configuration**.
2. Em **Site URL**, coloque a URL do app na Vercel (ex.: `https://memorial.projectarc.com.br`).
3. Em **Redirect URLs**, adicione a URL da página de reset: `https://SEU-APP/reset`
   (e, para testes locais, `http://localhost:3000/reset`).

Sem isso, o link do e-mail não sabe pra onde voltar. Com isso configurado:
pedir recuperação → chega e-mail → clica no link → cai em `/reset` → define nova senha.

> O e-mail sai pelo servidor padrão do Supabase (ok para pouco volume). Para um
> visual próprio e sem limite, configure um SMTP em **Authentication → Emails**.
