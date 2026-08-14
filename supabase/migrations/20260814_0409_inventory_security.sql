-- BRC Build 04.09 database migration
-- Run once in Supabase SQL Editor before using Build 04.09 cloud editing/security features.

alter table public.belt_catalog add column if not exists core_diameter_mm numeric;
alter table public.belt_catalog add column if not exists application text;
alter table public.profiles add column if not exists can_backup boolean not null default true;
alter table public.profiles add column if not exists inventory_pin_hash text;

-- Backup is allowed by default; restore remains explicit/opt-in.
update public.profiles set can_backup = true where can_backup is null;

create or replace function public.set_inventory_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(coalesce(p_pin,'')) < 4 then raise exception 'Inventory password must be at least 4 characters'; end if;
  update public.profiles
     set inventory_pin_hash = crypt(p_pin, gen_salt('bf')), updated_at = now()
   where id = auth.uid();
end;
$$;

create or replace function public.verify_inventory_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select coalesce((select inventory_pin_hash = crypt(p_pin, inventory_pin_hash)
                     from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.set_inventory_pin(text) to authenticated;
grant execute on function public.verify_inventory_pin(text) to authenticated;
