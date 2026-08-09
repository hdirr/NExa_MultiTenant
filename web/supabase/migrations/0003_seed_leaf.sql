-- Conteúdo Engine — Seed de exemplo da Leaf (para preview dos dashboards).
-- OS NÚMEROS AQUI SÃO FICTÍCIOS. Substitua por dados reais quando o briefing
-- do Cesar voltar. Para limpar tudo:  delete from public.tenants where slug='leaf';

insert into public.tenants
  (slug, nome_exibicao, status, objetivo, aprovador,
   negocio_vende, negocio_publico, negocio_dor, negocio_diferencial)
values
  ('leaf','Leaf Comex','ativo','autoridade','Cesar',
   'Importação direta e indireta e distribuição em todo o Brasil',
   'Indústrias e distribuidoras de médio porte que importam insumos',
   'Custo tributário alto e prazo imprevisível na liberação',
   'Planejamento tributário + logística sob um só time')
on conflict (slug) do nothing;

-- Contexto (com prova de exemplo)
insert into public.tenant_context (tenant_id, o_que_vende, para_quem, prova_disponivel)
select id,
  'Importação direta e indireta e distribuição em todo o Brasil.',
  'Indústrias e distribuidoras de médio porte que importam insumos.',
  '8 anos de mercado; média de 22 dias de liberação alfandegária.'
from public.tenants where slug = 'leaf';

-- Canais
insert into public.channels (tenant_id, rede, handle, formatos, frequencia_semanal)
select id, 'instagram', '@leafcomex', array['carrossel'], 3 from public.tenants where slug='leaf'
union all
select id, 'linkedin', 'Leaf Comex', array['post'], 1 from public.tenants where slug='leaf';

-- Métricas (exemplo)
insert into public.metrics
  (tenant_id, data, formato, pecas_geradas, pecas_aprovadas, tokens_entrada, tokens_saida, custo_usd, minutos_ciclo)
select t.id, v.data::date, v.formato, v.g, v.a, v.ti, v.ts, v.c, v.m
from public.tenants t,
(values
  ('2026-07-14','carrossel',5,4,12400,3800,0.0280,45),
  ('2026-07-21','post',    4,4, 9800,2600,0.0190,30),
  ('2026-07-28','carrossel',5,5,12900,4000,0.0300,40),
  ('2026-08-04','reels',   3,2, 7200,2100,0.0150,35),
  ('2026-08-04','post',    4,4, 9600,2500,0.0180,28)
) as v(data,formato,g,a,ti,ts,c,m)
where t.slug='leaf';

-- Publicados (exemplo, com desempenho)
insert into public.published (tenant_id, data, tema, formato, canal, link, desempenho)
select t.id, v.data::date, v.tema, v.formato, v.canal, v.link, v.desempenho
from public.tenants t,
(values
  ('2026-07-15','Como reduzir custo tributário na importação','carrossel','instagram','https://instagram.com/p/exemplo1','12.4k alcance · 340 salvamentos'),
  ('2026-07-22','O que muda com a nova regra do Radar','post','linkedin','https://linkedin.com/exemplo2','5.1k impressões · 82 reações'),
  ('2026-07-29','Importação direta vs. indireta','carrossel','instagram','https://instagram.com/p/exemplo3','18.9k alcance · 520 salvamentos'),
  ('2026-08-05','Prazo de liberação: o que trava','reels','instagram','https://instagram.com/p/exemplo4','24.2k visualizações · 210 compart.'),
  ('2026-08-05','4 documentos que atrasam sua carga','post','linkedin','https://linkedin.com/exemplo5','6.7k impressões · 95 reações')
) as v(data,tema,formato,canal,link,desempenho)
where t.slug='leaf';

-- Pauta (backlog com status variados)
insert into public.pauta_items (tenant_id, tema, angulo, formato, objetivo, status)
select t.id, v.tema, v.angulo, v.formato, v.objetivo, v.status
from public.tenants t,
(values
  ('3 erros no câmbio de importação','Erro comum','carrossel','autoridade','aguardando'),
  ('Radar SISCOMEX na prática','Passo a passo','post','educacao','producao'),
  ('Incoterms sem dor de cabeça','Guia','carrossel','autoridade','backlog'),
  ('Case: economia tributária','Resultado','reels','autoridade','aguardando')
) as v(tema,angulo,formato,objetivo,status)
where t.slug='leaf';
