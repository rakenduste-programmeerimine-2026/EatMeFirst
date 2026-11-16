-- Olafi review #6 punkt 6: pikemad kutsekoodid ja join_fridge katsete piirang
begin;
select plan(9);

insert into auth.users (id, email) values
  ('77777777-7777-7777-7777-777777777777', 'omanik7@test.ee'),
  ('88888888-8888-8888-8888-888888888888', 'arvaja@test.ee'),
  ('99999999-9999-9999-9999-999999999999', 'aus@test.ee');

create temp table code as
  select f.id as fridge_id, f.invite_code from public.fridges f
  where f.created_by = '77777777-7777-7777-7777-777777777777';
grant select on code to authenticated;

select is((select char_length(invite_code) from code), 16, 'uus kutsekood on 16 märki');
select throws_ok(
  $$ update public.fridges set invite_code = 'lyhike' where id = (select fridge_id from code) $$,
  '23514', null, 'lühemat kui 16-märgilist koodi ei saa panna'
);

-- arvaja proovib 5 vale koodi
set local role authenticated;
set local request.jwt.claims = '{"sub":"88888888-8888-8888-8888-888888888888"}';
select is(public.join_fridge('0000000000000001'), null, 'vale kood tagastab null');
select public.join_fridge('000000000000000' || n) from generate_series(2, 5) n;

select throws_ok(
  $$ select public.join_fridge((select invite_code from code)) $$,
  'P0001', 'too many invalid invite codes, try again later',
  'pärast 5 vale katset keeldutakse ka õigest koodist'
);
select is((select count(*)::int from public.fridges), 1, 'arvaja ei pääsenud võõrasse külmkappi');
select throws_ok($$ select * from public.join_attempts $$, '42501', null, 'katsete tabelit ei saa lugeda');

-- teist kasutajat piirang ei mõjuta
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
select is(public.join_fridge((select invite_code from code)), (select fridge_id from code),
          'teine kasutaja saab õige koodiga liituda');

-- 10 minuti pärast saab uuesti proovida
reset role;
update public.join_attempts set attempted_at = now() - interval '11 minutes'
 where user_id = '88888888-8888-8888-8888-888888888888';
set local role authenticated;
set local request.jwt.claims = '{"sub":"88888888-8888-8888-8888-888888888888"}';
select is(public.join_fridge((select invite_code from code)), (select fridge_id from code),
          '10 minuti pärast saab õige koodiga liituda');
select is(public.join_fridge(' ' || (select invite_code from code) || ' '), (select fridge_id from code),
          'tühikud koodi ümber ei sega');

select * from finish();
rollback;
