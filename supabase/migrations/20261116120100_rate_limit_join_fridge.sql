-- Olafi review #6 punkt 6 (2/2): join_fridge'il on katsete piirang.
-- Pärast 5 vale koodi 10 minuti jooksul keeldub join_fridge ka õigest koodist,
-- kuni aeg möödub. Nii ei saa koode massiliselt ära arvata.
--
-- NB: vale kood tagastab nüüd NULL (mitte viga). Viga keeraks tehingu tagasi
-- ja koos sellega ka ebaõnnestunud katse kirje, mistõttu piirang ei töötaks.

create table public.join_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index join_attempts_user_time_idx on public.join_attempts (user_id, attempted_at);

-- Ainult join_fridge (security definer) kasutab seda tabelit
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from anon, authenticated;

create or replace function public.join_fridge(p_invite_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id   uuid := (select auth.uid());
  v_fridge_id uuid;
  v_recent    int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- vanad katsed ära, et tabel ei kasvaks
  delete from public.join_attempts
   where user_id = v_user_id and attempted_at < now() - interval '1 hour';

  select count(*) into v_recent
    from public.join_attempts
   where user_id = v_user_id and attempted_at > now() - interval '10 minutes';

  if v_recent >= 5 then
    raise exception 'too many invalid invite codes, try again later';
  end if;

  select id into v_fridge_id from public.fridges where invite_code = trim(p_invite_code);

  if v_fridge_id is null then
    insert into public.join_attempts (user_id) values (v_user_id);
    return null;
  end if;

  insert into public.fridge_members (fridge_id, user_id)
  values (v_fridge_id, v_user_id)
  on conflict do nothing;

  return v_fridge_id;
end;
$$;
