-- EatMeFirst: algne andmebaasiskeem
-- Tabelid: profiles, fridges, fridge_members, items, recipes
-- Kõigil tabelitel on RLS sees. Kasutaja näeb ainult nende külmkappide andmeid, mille liige ta on.

-- =========================================================
-- Tüübid
-- =========================================================
create type public.member_role as enum ('owner', 'member');
create type public.item_status as enum ('active', 'used', 'wasted');

-- =========================================================
-- Tabelid
-- =========================================================

-- Avalik profiil iga auth.users kasutaja kohta (luuakse triggeriga)
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 50),
  created_at   timestamptz not null default now()
);

-- Külmkapp. Iga kasutaja saab registreerumisel ühe isikliku külmkapi;
-- korterikaaslased liituvad invite_code abil.
create table public.fridges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.fridge_members (
  fridge_id uuid not null references public.fridges (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (fridge_id, user_id)
);

create table public.items (
  id                uuid primary key default gen_random_uuid(),
  fridge_id         uuid not null references public.fridges (id) on delete cascade,
  added_by          uuid default auth.uid() references public.profiles (id) on delete set null,
  name              text not null check (char_length(name) between 1 and 80),
  category          text check (char_length(category) <= 40),
  quantity          numeric check (quantity > 0),
  unit              text check (char_length(unit) <= 20),
  expiry_date       date not null,
  status            public.item_status not null default 'active',
  status_changed_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Retseptid on kõigile sisseloginud kasutajatele ühised (täidetakse seed'iga).
-- ingredients = väiketähtedega märksõnad, mida otsitakse toote nimest ("piim" leiab "Piim 2,5%").
create table public.recipes (
  id           bigint generated always as identity primary key,
  title        text not null,
  instructions text not null,
  ingredients  text[] not null check (cardinality(ingredients) > 0),
  minutes      int check (minutes > 0)
);

create index items_fridge_active_expiry_idx on public.items (fridge_id, expiry_date) where status = 'active';
create index items_fridge_status_changed_idx on public.items (fridge_id, status_changed_at) where status <> 'active';
create index fridge_members_user_idx on public.fridge_members (user_id);

-- =========================================================
-- Abifunktsioonid RLS-i jaoks (security definer => ei teki RLS-i rekursiooni)
-- =========================================================
create function public.is_fridge_member(p_fridge_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.fridge_members
    where fridge_id = p_fridge_id and user_id = (select auth.uid())
  );
$$;

create function public.is_fridge_owner(p_fridge_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.fridge_members
    where fridge_id = p_fridge_id and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- =========================================================
-- Triggerid
-- =========================================================

-- Uus kasutaja => profiil + isiklik külmkapp
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), ''), 50));

  insert into public.fridges (name, created_by)
  values ('Minu külmkapp', new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Külmkapi looja saab automaatselt omanikuks
create function public.add_fridge_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.fridge_members (fridge_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_fridge_created
  after insert on public.fridges
  for each row execute function public.add_fridge_owner();

-- items süsteemiveerud (added_by, created_at, updated_at, status_changed_at)
-- määrab andmebaas, mitte klient.
create function public.items_before_insert()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.created_at := now();
  new.updated_at := now();
  new.status_changed_at := case when new.status = 'active' then null else now() end;
  return new;
end;
$$;

create trigger items_set_insert_defaults
  before insert on public.items
  for each row execute function public.items_before_insert();

create function public.items_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.added_by := old.added_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.status_changed_at := case when new.status = 'active' then null else now() end;
  else
    new.status_changed_at := old.status_changed_at;
  end if;
  return new;
end;
$$;

create trigger items_set_timestamps
  before update on public.items
  for each row execute function public.items_before_update();

-- 3. fridges: looja (created_by) ja loomise aeg ei muutu
create function public.fridges_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger fridges_lock_creator
  before update on public.fridges
  for each row execute function public.fridges_before_update();

-- =========================================================
-- RPC funktsioonid (kutsutakse supabase.rpc(...) kaudu)
-- =========================================================

-- Korterikaaslane liitub külmkapiga kutsekoodi abil
create function public.join_fridge(p_invite_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_fridge_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  select id into v_fridge_id from public.fridges where invite_code = p_invite_code;
  if v_fridge_id is null then
    raise exception 'invalid invite code';
  end if;

  insert into public.fridge_members (fridge_id, user_id)
  values (v_fridge_id, (select auth.uid()))
  on conflict do nothing;

  return v_fridge_id;
end;
$$;

-- Retseptiideed: retseptid, mille koostisosi külmkapis on, kõige varem aeguv enne
create function public.suggest_recipes(p_fridge_id uuid, p_limit int default 5)
returns table (
  recipe_id     bigint,
  title         text,
  instructions  text,
  minutes       int,
  matched_items text[],
  match_count   int,
  soonest_expiry date
)
language sql stable set search_path = ''
as $$
  select r.id, r.title, r.instructions, r.minutes,
         array_agg(distinct i.name order by i.name),
         count(distinct ing)::int,
         min(i.expiry_date)
  from public.recipes r
  cross join lateral unnest(r.ingredients) as ing
  join public.items i
    on i.fridge_id = p_fridge_id
   and i.status = 'active'
   and lower(i.name) like '%' || ing || '%'
  group by r.id, r.title, r.instructions, r.minutes
  order by min(i.expiry_date), count(distinct ing) desc, r.title
  limit p_limit;
$$;

-- =========================================================
-- Statistika (eduka kriteeriumi mõõtmiseks: kas ära visatakse vähem?)
-- security_invoker => vaade järgib items tabeli RLS-i
-- =========================================================
create view public.fridge_weekly_stats
with (security_invoker = true)
as
select fridge_id,
       date_trunc('week', status_changed_at)::date as week_start,
       count(*) filter (where status = 'used')::int   as used_count,
       count(*) filter (where status = 'wasted')::int as wasted_count
from public.items
where status <> 'active' and status_changed_at is not null
group by fridge_id, date_trunc('week', status_changed_at);

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles       enable row level security;
alter table public.fridges        enable row level security;
alter table public.fridge_members enable row level security;
alter table public.items          enable row level security;
alter table public.recipes        enable row level security;

-- profiles: enda ja oma külmkapikaaslaste profiil
create policy "profiles: select self and fridge mates" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.fridge_members m
      where m.user_id = profiles.id and public.is_fridge_member(m.fridge_id)
    )
  );

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- fridges
create policy "fridges: select if member" on public.fridges
  for select to authenticated
  using (public.is_fridge_member(id) or created_by = (select auth.uid()));

create policy "fridges: insert own" on public.fridges
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "fridges: update if owner" on public.fridges
  for update to authenticated
  using (public.is_fridge_owner(id))
  with check (public.is_fridge_owner(id));

create policy "fridges: delete if owner" on public.fridges
  for delete to authenticated
  using (public.is_fridge_owner(id));

-- fridge_members: liikmed näevad üksteist; liitumine käib join_fridge() kaudu
create policy "members: select if member" on public.fridge_members
  for select to authenticated
  using (public.is_fridge_member(fridge_id));

create policy "members: leave or owner removes" on public.fridge_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_fridge_owner(fridge_id));

-- items: kõik külmkapi liikmed saavad tooteid hallata
create policy "items: select if member" on public.items
  for select to authenticated
  using (public.is_fridge_member(fridge_id));

create policy "items: insert if member" on public.items
  for insert to authenticated
  with check (public.is_fridge_member(fridge_id) and added_by = (select auth.uid()));

create policy "items: update if member" on public.items
  for update to authenticated
  using (public.is_fridge_member(fridge_id))
  with check (public.is_fridge_member(fridge_id));

create policy "items: delete if member" on public.items
  for delete to authenticated
  using (public.is_fridge_member(fridge_id));

-- recipes: kõigile sisseloginutele lugemiseks
create policy "recipes: read for authenticated" on public.recipes
  for select to authenticated
  using (true);

-- =========================================================
-- Õigused: anon ei saa midagi, RPC-d ainult sisseloginutele
-- =========================================================
revoke all on all tables in schema public from anon;
-- Ka tulevastes migratsioonides loodud tabelid/sequence'id ei anna anon'ile õigusi
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
revoke execute on function public.join_fridge(text) from public, anon;
revoke execute on function public.suggest_recipes(uuid, int) from public, anon;
revoke execute on function public.is_fridge_member(uuid) from public, anon;
revoke execute on function public.is_fridge_owner(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.add_fridge_owner() from public, anon, authenticated;
revoke execute on function public.items_before_insert() from public, anon, authenticated;
revoke execute on function public.items_before_update() from public, anon, authenticated;
revoke execute on function public.fridges_before_update() from public, anon, authenticated;
grant execute on function public.join_fridge(text) to authenticated;
grant execute on function public.suggest_recipes(uuid, int) to authenticated;
grant execute on function public.is_fridge_member(uuid) to authenticated;
grant execute on function public.is_fridge_owner(uuid) to authenticated;

-- Selged õigused sisseloginud kasutajale (töötab ka siis, kui projektis on
-- "Automatically expose new tables" välja lülitatud). RLS piirab ridu edasi.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.items   to authenticated;
grant select, insert, update, delete on public.fridges to authenticated;
grant select, delete                 on public.fridge_members to authenticated;
grant select, update                 on public.profiles to authenticated;
grant select                         on public.recipes  to authenticated;
grant select                         on public.fridge_weekly_stats to authenticated;
