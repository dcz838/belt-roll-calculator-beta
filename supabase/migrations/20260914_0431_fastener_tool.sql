-- BRC Build 04.31: add Fastener Reference to per-user Tool access.
do $$
declare r record;
begin
  for r in select oid, conname from pg_constraint where conrelid='public.user_tool_settings'::regclass and contype='c' loop
    if pg_get_constraintdef(r.oid) ilike '%tool_id%' then execute format('alter table public.user_tool_settings drop constraint %I',r.conname); end if;
  end loop;
end $$;
alter table public.user_tool_settings add constraint user_tool_settings_tool_id_check check (tool_id in ('belt','calculator','converter','wire','thread','fractionchart','fastener'));
insert into public.user_tool_settings(user_id,tool_id,allowed,sort_order)
select p.id,'fastener',true,60 from public.profiles p on conflict(user_id,tool_id) do nothing;
create or replace function public.set_my_tool_order(p_tool_ids text[]) returns void language plpgsql security definer set search_path=public as $$
declare v_tool text; v_pos integer:=10;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 foreach v_tool in array p_tool_ids loop
  if v_tool not in ('belt','calculator','converter','wire','thread','fractionchart','fastener') then continue; end if;
  insert into public.user_tool_settings(user_id,tool_id,allowed,sort_order,updated_at) values(auth.uid(),v_tool,true,v_pos,now()) on conflict(user_id,tool_id) do update set sort_order=excluded.sort_order,updated_at=now();
  v_pos:=v_pos+10;
 end loop;
end;$$;
revoke all on function public.set_my_tool_order(text[]) from public,anon;
grant execute on function public.set_my_tool_order(text[]) to authenticated;
