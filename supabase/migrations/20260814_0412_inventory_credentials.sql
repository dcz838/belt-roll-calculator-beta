-- BRC Build 04.12 inventory credential hardening
-- Run once after the 04.09 migration and before testing inventory-password administration.

create table if not exists private.inventory_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.inventory_credentials from public, anon, authenticated;

-- Migrate any hashes created by 04.09 before removing them from the browser-readable profiles table.
insert into private.inventory_credentials (user_id, pin_hash, updated_at)
select id, inventory_pin_hash, now()
from public.profiles
where inventory_pin_hash is not null and length(inventory_pin_hash) > 0
on conflict (user_id) do update set pin_hash = excluded.pin_hash, updated_at = now();

alter table public.profiles drop column if exists inventory_pin_hash;

create or replace function public.set_inventory_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(p_pin,'') !~ '^[0-9]{4,}$' then raise exception 'Inventory password must contain at least 4 digits'; end if;
  insert into private.inventory_credentials (user_id, pin_hash, updated_at)
  values (auth.uid(), crypt(p_pin, gen_salt('bf')), now())
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, updated_at = now();
end;
$$;

create or replace function public.verify_inventory_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = public, private, extensions
as $$
  select (select pin_hash = crypt(p_pin, pin_hash)
            from private.inventory_credentials
           where user_id = auth.uid());
$$;

create or replace function public.admin_set_inventory_pin(p_user_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  if coalesce(p_pin,'') !~ '^[0-9]{4,}$' then raise exception 'Inventory password must contain at least 4 digits'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'User profile not found'; end if;
  insert into private.inventory_credentials (user_id, pin_hash, updated_at)
  values (p_user_id, crypt(p_pin, gen_salt('bf')), now())
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, updated_at = now();
end;
$$;

revoke all on function public.set_inventory_pin(text) from public, anon;
revoke all on function public.verify_inventory_pin(text) from public, anon;
revoke all on function public.admin_set_inventory_pin(uuid,text) from public, anon, authenticated;
grant execute on function public.set_inventory_pin(text) to authenticated;
grant execute on function public.verify_inventory_pin(text) to authenticated;
grant execute on function public.admin_set_inventory_pin(uuid,text) to service_role;
