#!/usr/bin/env bash
set -euo pipefail

T="${1:?uso: new-tenant.sh <slug>}"

# Valida slug: apenas letras minúsculas, números e hífen
if [[ ! "$T" =~ ^[a-z0-9-]+$ ]]; then
  echo "erro: slug deve conter apenas letras minúsculas, números e hífen"
  exit 1
fi

[ -d "tenants/$T" ] && { echo "tenant já existe: tenants/$T"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

mkdir -p "$ROOT/tenants/$T"/{referencias,pauta,output}

# Copia templates substituindo o placeholder SLUG e NOME
sed "s/SLUG/$T/g; s/NOME/$T/g" "$ROOT/core/templates/tenant.yaml.template" \
  > "$ROOT/tenants/$T/tenant.yaml"

sed "s/NOME/$T/g" "$ROOT/core/templates/context.template.md" \
  > "$ROOT/tenants/$T/context.md"

sed "s/NOME/$T/g" "$ROOT/core/templates/voice.template.md" \
  > "$ROOT/tenants/$T/voice.md"

printf '# Backlog\n\n| Tema | Ângulo | Formato | Objetivo | Status |\n|---|---|---|---|---|\n' \
  > "$ROOT/tenants/$T/pauta/backlog.md"

printf '# Publicados\n\n| Data | Tema | Formato | Link | Desempenho |\n|---|---|---|---|---|\n' \
  > "$ROOT/tenants/$T/pauta/publicados.md"

printf '# Calibração\n\n| Data | Peça | Motivo | Regra criada | Promovida ao core? |\n|---|---|---|---|---|\n' \
  > "$ROOT/tenants/$T/calibracao.md"

printf 'data,tenant,formato,pecas_geradas,pecas_aprovadas,taxa,tokens_entrada,tokens_saida,custo_usd,minutos_ciclo\n' \
  > "$ROOT/tenants/$T/metricas.csv"

echo "tenant '$T' criado em tenants/$T"
echo "próximos passos:"
echo "  1. preencha tenants/$T/tenant.yaml"
echo "  2. preencha tenants/$T/context.md (especialmente § Prova disponível)"
echo "  3. preencha tenants/$T/voice.md (§ Jargão deste tenant)"
