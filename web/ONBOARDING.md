# Onboarding autônomo (Fase 7)

O negócio entra sozinho, sem a agência criar nada manualmente.

## Fluxo

```
/cadastro (público)                /admin (você)                 tenant pendente
───────────────────               ─────────────                 ───────────────
dono preenche empresa +    ──►    fila "Aguardando      ──►     owner preenche o
conta + senha opcional            ativação" → ✓ Ativar          briefing guiado
                                  (ou revisa antes)             (contexto, voz…)
```

1. **Cadastro** (`/cadastro`, rota pública): empresa, identificador (slug,
   sugerido automaticamente), nome/e-mail/senha do dono e — opcionalmente —
   o que vende / para quem. Cria numa tacada: usuário Auth com papel
   **owner**, tenant com `status = 'pendente'`, vínculo de membership,
   contexto inicial e pasta no Canva (best-effort). Tem honeypot anti-bot.
2. **Ativação** (painel `/admin`): a fila no topo lista os pendentes com os
   botões *Revisar cadastro* e *✓ Ativar* (`setTenantStatus`). Enquanto
   pendente, o tenant vê tudo mas **não produz** — as actions de produção
   (pauta, peças, IA) recusam com `exigirTenantAtivo`.
3. **Onboarding guiado**: a página do tenant mostra um checklist com o que
   falta (dados, contexto, voz, canal, chave Anthropic, template Canva) com
   links âncora para cada seção. Campos cruciais vazios continuam em vermelho.

## Papéis

| Papel | Vê | Faz |
|---|---|---|
| `admin` | todos os tenants | tudo: criar/excluir tenant, status, chaves, usuários |
| `owner` | só o próprio | editar dados/contexto/voz/canais/chaves/template/usuários do próprio; **não** muda status nem exclui |
| `client` | relatório + aprovação | ler e aprovar/reprovar peças |

Reforços no banco (`0010_owner_policies.sql`):

- `is_tenant_admin(tenant_id)` — dono do próprio tenant;
- policies de escrita espelhando as de admin nas tabelas de conteúdo;
- trigger `guarda_status_do_tenant`: **só admin muda status**, mesmo que
  algo escape pelo app;
- owner gerencia membros do próprio tenant; aprovações ficam visíveis ao dono.

## Decisões de arquitetura (o que NÃO foi feito e por quê)

Avaliou-se uma proposta externa de sistema de login paralelo (Express +
tenant.yaml + JWT manual + bcrypt em YAML + subdomínios) e ela foi descartada:

- **Express separado** → dois apps/duas sessões; o Next.js já é o servidor.
- **Senhas/JWT manuais** → regressão frente a Supabase Auth; RLS isola **no
  banco**, não só no código.
- **bcrypt em YAML versionado** → segredo em git é risco real.
- **Executar shell scripts via request** → command injection/race.
- **Subdomínios** → complexidade DNS para poucos tenants; adiar até haver demanda.

O valor aproveitado da proposta foi o **self-service onboarding**, implementado
dentro do app existente.

## Pendências operacionais

- Rodar `0009_owner_role.sql` e depois `0010_owner_policies.sql` no Supabase
  (SQL Editor, nesta ordem) **antes** do primeiro auto-cadastro.
- Rate limit sério no `/cadastro` quando houver domínio próprio (hoje: honeypot).
- E-mail transacional (avisar a agência de novos cadastros) — futuro.
