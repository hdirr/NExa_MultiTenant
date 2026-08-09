-- Conteúdo Engine — Fase 3: aprovação online
-- Permite o cliente aprovar/reprovar peças do seu tenant; um trigger aplica
-- a decisão no status da peça (contornando a política admin-only via definer).
-- Rode DEPOIS das migrações anteriores.

-- Cliente pode inserir uma aprovação para peças do seu tenant.
create policy approvals_client_insert on public.approvals
  for insert
  with check (
    public.is_tenant_member(
      (select tenant_id from public.pieces p where p.id = piece_id)
    )
  );

-- Aplica a decisão no status da peça.
create or replace function public.apply_approval()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.decisao in ('aprovado', 'reprovado') then
    update public.pieces
      set status = new.decisao
      where id = new.piece_id;
  end if;
  return new;
end;
$$;

create trigger on_approval_insert
  after insert on public.approvals
  for each row execute function public.apply_approval();
