-- BRC Build 04.28: per-user Tool access and user-controlled Tool ordering

create table if not exists public.user_tool_settings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool_id text not null check (tool_id in ('calculator','converter','wire','thread')),
  allowed boolean not null default true,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

alter table public.user_tool_settings enable row level security;

drop policy if exists tool_settings_select on public.user_tool_settings;
create policy tool_settings_select on public.user_tool_settings
for select to authenticated
using (user_id = auth.uid() or private.has_permission('manage_users'));

revoke insert, update, delete on public.user_tool_settings from anon, authenticated;
grant select on public.user_tool_settings to authenticated;

insert into public.user_tool_settings (user_id, tool_id, allowed, sort_order)
select p.id, t.tool_id, true, t.sort_order
from public.profiles p
cross join (values ('calculator',10),('converter',20),('wire',30),('thread',40)) as t(tool_id,sort_order)
on conflict (user_id,tool_id) do nothing;

create or replace function public.set_my_tool_order(p_tool_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tool text;
  v_pos integer := 10;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  foreach v_tool in array p_tool_ids loop
    if v_tool not in ('calculator','converter','wire','thread') then continue; end if;
    insert into public.user_tool_settings(user_id,tool_id,allowed,sort_order,updated_at)
    values(auth.uid(),v_tool,true,v_pos,now())
    on conflict(user_id,tool_id) do update
      set sort_order=excluded.sort_order, updated_at=now();
    v_pos := v_pos + 10;
  end loop;
end;
$$;

revoke all on function public.set_my_tool_order(text[]) from public, anon;
grant execute on function public.set_my_tool_order(text[]) to authenticated;
