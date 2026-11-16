-- Olafi review #6 punkt 4: viimane omanik ei saa külmkapist lahkuda.
-- Muidu jääb külmkapp omanikuta ja keegi ei saa seda enam muuta ega kustutada.
-- Lubatud on: külmkapi kustutamine (liikmed kustuvad kaasa) ja konto kustutamine.

create function public.fridge_members_before_delete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role <> 'owner' then
    return old;
  end if;

  -- Külmkapp või kasutaja kustutatakse => liikmed kustuvad cascade'iga, see on ok
  if not exists (select 1 from public.fridges where id = old.fridge_id)
     or not exists (select 1 from public.profiles where id = old.user_id) then
    return old;
  end if;

  if not exists (
    select 1 from public.fridge_members
    where fridge_id = old.fridge_id and role = 'owner' and user_id <> old.user_id
  ) then
    raise exception 'last owner cannot leave the fridge; delete the fridge instead'
      using errcode = 'P0001';
  end if;

  return old;
end;
$$;

create trigger fridge_members_keep_owner
  before delete on public.fridge_members
  for each row execute function public.fridge_members_before_delete();

revoke execute on function public.fridge_members_before_delete() from public, anon, authenticated;
