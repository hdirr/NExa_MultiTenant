#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Consolida todos os metricas.csv de tenants ativos
TMPFILE="$(mktemp)"
HEADER_WRITTEN=false

for csv in "$ROOT"/tenants/*/metricas.csv; do
  if [ ! -f "$csv" ]; then continue; fi
  if [ "$HEADER_WRITTEN" = false ]; then
    head -1 "$csv" >> "$TMPFILE"
    HEADER_WRITTEN=true
  fi
  tail -n +2 "$csv" >> "$TMPFILE"
done

if [ ! -s "$TMPFILE" ] || [ "$(wc -l < "$TMPFILE")" -le 1 ]; then
  echo "Nenhum dado de métricas encontrado."
  rm -f "$TMPFILE"
  exit 0
fi

echo ""
echo "=== Métricas do Conteúdo Engine ==="
echo ""

# Processa por tenant usando awk
awk -F',' '
NR == 1 { next }  # pula header

{
  tenant = $2
  formato = $3
  geradas = $4 + 0
  aprovadas = $5 + 0
  tokens_in = $7 + 0
  tokens_out = $8 + 0
  custo = $9 + 0
  data = $1

  total_geradas[tenant] += geradas
  total_aprovadas[tenant] += aprovadas
  total_custo[tenant] += custo
  rodadas[tenant]++
  if (data > ultima_data[tenant]) ultima_data[tenant] = data

  # Taxa da última rodada (por data mais recente)
  if (data >= ultima_data[tenant]) {
    ultima_geradas[tenant] = geradas
    ultima_aprovadas[tenant] = aprovadas
  }
}

END {
  printf "%-15s %-12s %-12s %-15s %-12s\n", \
    "Tenant", "Última rodada", "Taxa geral", "Custo/peça aprov.", "Rodadas"
  printf "%-15s %-12s %-12s %-15s %-12s\n", \
    "---------------", "------------", "------------", "---------------", "--------"

  for (t in total_geradas) {
    taxa_geral = (total_geradas[t] > 0) \
      ? sprintf("%.0f%%", total_aprovadas[t] / total_geradas[t] * 100) \
      : "n/a"

    taxa_ultima = (ultima_geradas[t] > 0) \
      ? sprintf("%.0f%%", ultima_aprovadas[t] / ultima_geradas[t] * 100) \
      : "n/a"

    custo_por_peca = (total_aprovadas[t] > 0) \
      ? sprintf("$%.4f", total_custo[t] / total_aprovadas[t]) \
      : "n/a"

    printf "%-15s %-12s %-12s %-15s %-12s\n", \
      t, taxa_ultima, taxa_geral, custo_por_peca, rodadas[t]
  }
}
' "$TMPFILE"

echo ""
echo "=== Detalhe por tenant ==="
echo ""

awk -F',' '
NR == 1 { next }
{
  tenant = $2
  data = $1
  formato = $3
  geradas = $4
  aprovadas = $5
  taxa = $6
  custo = $9
  minutos = $10

  printf "[%s] %s | formato: %s | geradas: %s | aprovadas: %s | taxa: %s | custo: $%s | ciclo: %s min\n", \
    data, tenant, formato, geradas, aprovadas, taxa, custo, minutos
}
' "$TMPFILE" | sort

echo ""

rm -f "$TMPFILE"
