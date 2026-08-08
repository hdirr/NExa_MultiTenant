# Operação

## Ciclo padrão de produção

1. Informe o tenant ao abrir a sessão
2. Peça a skill `pauta` — revise e aprove os temas
3. Para cada tema aprovado, peça a skill do formato (`carrossel-instagram`,
   `roteiro-reels` ou `post-linkedin`)
4. Aguarde o checkpoint de roteiro — aprove antes de prosseguir
5. A skill `revisao-marca` roda automaticamente antes de cada entrega
6. Copie o output aprovado para `tenants/<t>/output/AAAA-MM-DD/<slug>/`
7. Registre em `metricas.csv` e em `pauta/publicados.md` após publicação

## Adicionando um novo tenant

```bash
./scripts/new-tenant.sh <slug>
```

Depois:
- Preencha `tenants/<slug>/tenant.yaml` (todos os campos obrigatórios)
- Preencha `tenants/<slug>/context.md` (especialmente § Prova disponível)
- Preencha `tenants/<slug>/voice.md` (§ Jargão deste tenant)

## Promovendo regra ao core

Quando uma reprovação revelar uma regra que vale para qualquer marca:
1. Adicione-a na skill `revisao-marca` em `core/skills/revisao-marca/SKILL.md`
2. Registre em `tenants/<t>/calibracao.md` com a coluna "Promovida ao core?" = sim

## Janela antirrepetição

`janela_antirepeticao_dias` em `tenant.yaml` controla quantos dias um tema
fica bloqueado após publicação. A skill `pauta` e a `revisao-marca` consultam
`pauta/publicados.md` para verificar.
