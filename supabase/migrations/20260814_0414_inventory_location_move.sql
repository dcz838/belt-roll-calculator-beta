-- BRC Build 04.14: atomic inventory location move
-- Run once after the 04.12 migration, before testing Location edits in Build 04.14.

create or replace function public.move_inventory_location(
  p_belt_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_device_id text default null,
  p_notes text default null
)
returns table (
  balance_id uuid,
  quantity_moved numeric,
  quantity_after numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_id uuid;
  v_target_id uuid;
  v_source_qty numeric(14,3);
  v_target_before numeric(14,3) := 0;
  v_target_after numeric(14,3);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not private.has_permission('modify_belt') then
    raise exception 'Permission denied: modify_belt';
  end if;

  if p_belt_id is null or p_from_location_id is null or p_to_location_id is null then
    raise exception 'Belt and location IDs are required';
  end if;

  if p_from_location_id = p_to_location_id then
    select ib.id, ib.quantity
      into v_source_id, v_source_qty
    from public.inventory_balances ib
    where ib.belt_id = p_belt_id and ib.location_id = p_from_location_id;

    if v_source_id is null then
      raise exception 'Source inventory balance not found';
    end if;

    return query select v_source_id, v_source_qty, v_source_qty;
    return;
  end if;

  select ib.id, ib.quantity
    into v_source_id, v_source_qty
  from public.inventory_balances ib
  where ib.belt_id = p_belt_id and ib.location_id = p_from_location_id
  for update;

  if v_source_id is null then
    raise exception 'Source inventory balance not found';
  end if;

  select ib.id, ib.quantity
    into v_target_id, v_target_before
  from public.inventory_balances ib
  where ib.belt_id = p_belt_id and ib.location_id = p_to_location_id
  for update;

  if v_target_id is null then
    -- Keep the existing balance row/id when the destination is empty.
    update public.inventory_balances
       set location_id = p_to_location_id,
           version = version + 1,
           updated_by = auth.uid()
     where id = v_source_id;
    v_target_id := v_source_id;
    v_target_before := 0;
    v_target_after := v_source_qty;
  else
    -- Merge into an existing destination balance and remove the obsolete source row.
    v_target_after := v_target_before + v_source_qty;
    update public.inventory_balances
       set quantity = v_target_after,
           version = version + 1,
           updated_by = auth.uid()
     where id = v_target_id;
    delete from public.inventory_balances where id = v_source_id;
  end if;

  insert into public.inventory_transactions (
    belt_id, location_id, transaction_type,
    quantity_change, quantity_before, quantity_after,
    reference, notes, device_id, performed_by
  ) values (
    p_belt_id, p_from_location_id, 'transfer_out',
    -v_source_qty, v_source_qty, 0,
    'BRC Location Move', p_notes, p_device_id, auth.uid()
  );

  insert into public.inventory_transactions (
    belt_id, location_id, transaction_type,
    quantity_change, quantity_before, quantity_after,
    reference, notes, device_id, performed_by
  ) values (
    p_belt_id, p_to_location_id, 'transfer_in',
    v_source_qty, v_target_before, v_target_after,
    'BRC Location Move', p_notes, p_device_id, auth.uid()
  );

  return query select v_target_id, v_source_qty, v_target_after;
end;
$$;

revoke all on function public.move_inventory_location(uuid,uuid,uuid,text,text) from public, anon;
grant execute on function public.move_inventory_location(uuid,uuid,uuid,text,text) to authenticated;
