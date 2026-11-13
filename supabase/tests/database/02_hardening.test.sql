-- Olafi review (#6) punktid 1, 2, 3 ja 5
begin;
select plan(10);

-- 2. Liiga pikk nimi ei murra registreerumist
insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-3333-3333-3333-333333333333', 'pikk@test.ee', jsonb_build_object('display_name', repeat('a', 80))),
  ('44444444-4444-4444-4444-444444444444', 'teine@test.ee', '{}');

select is((select char_length(display_name) from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
          50, 'liiga pikk display_name lõigatakse 50 märgini');

create temp table ids as
  select (select fridge_id from public.fridge_members where user_id = '33333333-3333-3333-3333-333333333333') as fridge_a;
grant select on ids to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

-- 1. Insert: status_changed_at / created_at tulevad andmebaasist
insert into public.items (fridge_id, name, expiry_date, status, status_changed_at, created_at)
values ((select fridge_a from ids), 'Võltsitud', current_date, 'used', '2000-01-01', '2000-01-01');

select ok((select status_changed_at > now() - interval '1 minute' from public.items where name = 'Võltsitud'),
          'insertil ei saa status_changed_at-i ise valida');
select ok((select created_at > now() - interval '1 minute' from public.items where name = 'Võltsitud'),
          'insertil ei saa created_at-i ise valida');

insert into public.items (fridge_id, name, expiry_date, status_changed_at)
values ((select fridge_a from ids), 'Aktiivne', current_date, now());
select is((select status_changed_at from public.items where name = 'Aktiivne'), null,
          'aktiivsel tootel on status_changed_at tühi');

-- 1. Update: süsteemiveerge ei saa muuta
update public.items
   set added_by = '44444444-4444-4444-4444-444444444444',
       created_at = '2000-01-01',
       status_changed_at = '2000-01-01'
 where name = 'Võltsitud';

select is((select added_by from public.items where name = 'Võltsitud'),
          '33333333-3333-3333-3333-333333333333'::uuid, 'added_by ei muutu');
select ok((select created_at > now() - interval '1 minute' from public.items where name = 'Võltsitud'),
          'created_at ei muutu');
select ok((select status_changed_at > now() - interval '1 minute' from public.items where name = 'Võltsitud'),
          'status_changed_at ei muutu, kui staatus jääb samaks');

-- 3. Omanik ei saa külmkappi teise kasutaja nimele panna
update public.fridges set created_by = '44444444-4444-4444-4444-444444444444', name = 'Uus nimi'
 where id = (select fridge_a from ids);
select is((select created_by from public.fridges where id = (select fridge_a from ids)),
          '33333333-3333-3333-3333-333333333333'::uuid, 'created_by ei muutu');
select is((select name from public.fridges where id = (select fridge_a from ids)),
          'Uus nimi', 'omanik saab nime siiski muuta');

reset role;

-- 5. Tulevased tabelid ei anna anon'ile õigusi
create table public.tulevane_tabel (id int);
select ok(not has_table_privilege('anon', 'public.tulevane_tabel', 'select'),
          'uues tabelis pole anon-il vaikimisi õigusi');

select * from finish();
rollback;
