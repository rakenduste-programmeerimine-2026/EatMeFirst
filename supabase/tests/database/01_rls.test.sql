-- Käivitamine: npx supabase test db   (vajab: npx supabase start)
begin;
select plan(19);

-- ---------- Testandmed: kaks kasutajat (Mari ja Jüri) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'mari@test.ee', '{"display_name":"Mari"}'),
  ('22222222-2222-2222-2222-222222222222', 'juri@test.ee', '{}');

-- Trigger lõi profiili ja külmkapi
select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
          'Mari', 'profiil luuakse registreerumisel');
select is((select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
          'juri', 'display_name tuleb e-posti eesosast, kui seda ei antud');
select is((select count(*)::int from public.fridge_members where user_id = '11111111-1111-1111-1111-111111111111' and role = 'owner'),
          1, 'kasutaja on oma isikliku külmkapi omanik');

create temp table juri_fridge as
  select fridge_id from public.fridge_members where user_id = '22222222-2222-2222-2222-222222222222';
grant select on juri_fridge to authenticated;

-- ---------- Anonüümne kasutaja ei näe midagi ----------
set local role anon;
select throws_ok('select * from public.items', '42501', null, 'anon ei saa items tabelit lugeda');
reset role;

-- ---------- Mari ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select is((select count(*)::int from public.fridges), 1, 'Mari näeb ainult oma külmkappi');

insert into public.items (fridge_id, name, expiry_date)
select id, 'Piim 2,5%', current_date + 2 from public.fridges;
insert into public.items (fridge_id, name, expiry_date)
select id, 'Munad', current_date + 7 from public.fridges;
insert into public.items (fridge_id, name, expiry_date)
select id, 'Jogurt', current_date - 1 from public.fridges;

select is((select count(*)::int from public.items), 3, 'Mari saab tooteid lisada');
select is((select added_by from public.items limit 1), '11111111-1111-1111-1111-111111111111'::uuid,
          'added_by täidetakse automaatselt');

select is((select name from public.items where status = 'active' order by expiry_date limit 1),
          'Jogurt', 'kõige varem aeguv toode on järjekorras esimene');

select results_eq(
  $$ select title from public.suggest_recipes((select id from public.fridges limit 1)) $$,
  $$ values ('Jogurt marjadega'), ('Kanasalat'), ('Omlett'), ('Pannkoogid'), ('Kodujuustu pannkoogid') $$,
  'retseptid algavad kõige varem aeguva toote retseptidest'
);

update public.items set status = 'wasted' where name = 'Jogurt';
select isnt((select status_changed_at from public.items where name = 'Jogurt'), null,
            'status_changed_at pannakse staatuse muutmisel');
select is((select wasted_count from public.fridge_weekly_stats limit 1), 1, 'statistika loeb ära visatud tooteid');

select throws_ok(
  $$ insert into public.items (fridge_id, name, expiry_date)
     values ((select fridge_id from juri_fridge), 'Häkk', current_date) $$,
  '42501', null, 'võõrasse külmkappi ei saa toodet lisada'
);

reset role;
-- kutsekood võetakse adminina, et Jüri saaks liituda
create temp table invite as select invite_code from public.fridges where created_by = '11111111-1111-1111-1111-111111111111';
grant select on invite to authenticated;

-- ---------- Jüri ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

select is((select count(*)::int from public.items), 0, 'Jüri ei näe Mari tooteid');
select is((select count(*)::int from public.profiles), 1, 'Jüri näeb ainult enda profiili');

update public.items set name = 'muudetud';
delete from public.items;
reset role;
select is((select count(*)::int from public.items where name <> 'muudetud'), 3, 'Jüri ei saa Mari tooteid muuta ega kustutada');

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select throws_ok($$ select public.join_fridge('valekood') $$, 'P0001', 'invalid invite code', 'vale kutsekood annab vea');
select lives_ok($$ select public.join_fridge((select invite_code from invite)) $$, 'õige kutsekoodiga saab liituda');

select is((select count(*)::int from public.items), 3, 'pärast liitumist näeb Jüri ühise külmkapi tooteid');
select is((select count(*)::int from public.profiles), 2, 'külmkapikaaslased näevad üksteise profiili');

select * from finish();
rollback;
