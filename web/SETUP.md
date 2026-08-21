# Setup do app (Fase 0)

Guia passo a passo para colocar o app no ar. As partes marcadas **[VOCÊ]** só
podem ser feitas por você (criar contas, colar chaves) — por regra de segurança
eu não faço essas. O resto do código já está pronto.

Ordem: Supabase → rodar SQL → criar admin → rodar local → deploy na Vercel.

---

## 1. Criar o projeto no Supabase **[VOCÊ]**

1. Acesse https://supabase.com e crie uma conta (grátis).
2. **New project** → dê um nome (ex.: `conteudo-engine`), escolha uma senha de
   banco (guarde) e a região mais próxima (ex.: South America / São Paulo).
3. Espere ~2 min o projeto subir.

## 2. Pegar as chaves **[VOCÊ]**

No projeto: **Project Settings → API Keys** (e **General** para a URL). Anote:
- **Project URL** → vira `NEXT_PUBLIC_SUPABASE_URL`
- **Publishable key** (`sb_publishable_...`) → vira
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

> A **Publishable key** é pública/segura de expor no front (é a versão nova da
> antiga "anon key"). **Nunca** use a **Secret key** (`sb_secret_...`) no
> navegador — ela não é usada nesta fase.

## 3. Rodar o SQL (criar as tabelas) **[VOCÊ]**

1. No Supabase: **SQL Editor → New query**.
2. Cole todo o conteúdo de `web/supabase/migrations/0001_init.sql` e clique
   **Run**.
3. Deve concluir sem erros (cria `profiles`, `tenants`, `tenant_members`,
   políticas RLS e o gatilho de perfil).

## 4. Criar seu usuário admin **[VOCÊ]**

1. **Authentication → Users → Add user** → informe seu e-mail e uma senha
   (marque "Auto confirm user").
2. Volte ao **SQL Editor** e rode (troque o e-mail):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'voce@exemplo.com');
   ```
Isso te torna admin. Clientes (ex.: o Cesar) serão criados do mesmo jeito e
associados a um tenant na Fase 2.

## 5. Rodar localmente

1. Crie o arquivo `web/.env.local` a partir do exemplo:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...                 (o Project URL do passo 2)
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...      (a publishable key do passo 2)
   ```
2. No terminal (Git Bash ou PowerShell), dentro de `web/`:
   ```bash
   npm install
   npm run dev
   ```
3. Abra http://localhost:3000 → você cai no `/login`. Entre com o e-mail/senha do
   passo 4. Como admin, você vai para o **Painel de Controle**.

## 6. Deploy na Vercel **[VOCÊ]**

1. Acesse https://vercel.com e entre com a conta do GitHub.
2. **Add New → Project** → importe o repositório `NExa_MultiTenant`.
3. Em **Root Directory**, selecione **`web`** (o app fica nessa subpasta).
4. Em **Environment Variables**, adicione **TODAS** as do seu `web/.env.local`
   (menos linhas de comentário):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` — server-only; cria usuários-cliente e lê
     segredos/tokens (chave Anthropic por tenant, tokens do Canva). Sem ela o
     painel admin e a geração quebram.
   - `CANVA_CLIENT_ID`
   - `CANVA_CLIENT_SECRET`
   - `CANVA_REDIRECT_URI` = `https://SEU-APP.vercel.app/api/canva/callback`
     (ajuste depois de saber a URL final — ver passo 7).
5. **Deploy**. Ao final, você recebe uma URL (ex.: `conteudo-engine.vercel.app`).

## 7. Ajustes pós-deploy **[VOCÊ]**

1. **Auth (login em produção)** — Supabase → **Authentication → URL
   Configuration** → em **Site URL** e **Redirect URLs**, adicione a URL da
   Vercel (ex.: `https://conteudo-engine.vercel.app`).
2. **Canva (só se for reconectar em produção)** — Canva Developers → sua
   integração → **Authentication → Authorized redirects** → adicione
   `https://SEU-APP.vercel.app/api/canva/callback`. Depois volte na Vercel,
   ajuste `CANVA_REDIRECT_URI` para essa URL e **redeploy**.
   > A conexão do Canva já feita continua valendo: os tokens ficam no banco
   > (`canva_connection`) e são renovados sozinhos, sem depender do redirect.
   > Isso só é necessário se você clicar em "Reconectar Canva" em produção.
3. **Banco** — se a produção usa o **mesmo** projeto Supabase de agora, as
   tabelas (migrações 0001–0010) já estão aplicadas. Se for um banco novo, rode
   `web/supabase/migrations/0001…0010` no SQL Editor antes de usar (a 0009
   cria o papel `owner` e precisa vir antes da 0010).
4. **Auto-cadastro** — o fluxo de onboarding autônomo (`/cadastro` → fila de
   pendentes no painel → ativação) está documentado em
   [`ONBOARDING.md`](ONBOARDING.md).

---

## Pronto — o que você tem ao fim da Fase 0

- Login funcionando (local e na Vercel).
- Admin (você) vê o Painel de Controle; clientes veem só o próprio conteúdo.
- Isolamento garantido no banco por RLS.

As telas ainda estão "vazias" de propósito — dados e dashboards entram na Fase 1.

## Como me passar as chaves com segurança

**Não cole as chaves aqui no chat.** Você mesmo as coloca no `web/.env.local`
(local) e nas Environment Variables da Vercel (produção). Se algo der errado,
me diga a mensagem de erro — sem incluir as chaves.
