-- Olafi review #6 punkt 4: viimane omanik ei saa lahkuda
begin;
select plan(6);

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'omanik@test.ee'),
  ('66666666-6666-6666-6666-666666666666', 'liige@test.ee');

create temp table ids as
  select fridge_id, invite_code from public.fridge_members m
  join public.fridges f on f.id = m.fridge_id
  where m.user_id = '55555555-5555-5555-5555-555555555555';
grant select on ids to authenticated;

-- liige liitub omaniku külmkapiga
set local role authenticated;
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666"}';
select public.join_fridge((select invite_code from ids));

-- tavaliige saab lahkuda
select lives_ok(
  $$ delete from public.fridge_members
     where fridge_id = (select fridge_id from ids) and user_id = '66666666-6666-6666-6666-666666666666' $$,
  'tavaliige saab külmkapist lahkuda'
);

-- omanik ei saa lahkuda
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
select throws_ok(
  $$ delete from public.fridge_members
     where fridge_id = (select fridge_id from ids) and user_id = '55555555-5555-5555-5555-555555555555' $$,
  'P0001', 'last owner cannot leave the fridge; delete the fridge instead',
  'viimane omanik ei saa lahkuda'
);
select is((select count(*)::int from public.fridge_members where fridge_id = (select fridge_id from ids)),
          1, 'omanik on endiselt liige');

-- omanik saab külmkapi kustutada (liikmed kustuvad kaasa)
select lives_ok($$ delete from public.fridges where id = (select fridge_id from ids) $$,
                'omanik saab külmkapi kustutada');
reset role;
select is((select count(*)::int from public.fridge_members where fridge_id = (select fridge_id from ids)),
          0, 'külmkapi kustutamisel kaovad ka liikmed');

-- konto kustutamine ei jää omaniku-kontrolli taha kinni
select lives_ok($$ delete from auth.users where id = '66666666-6666-6666-6666-666666666666' $$,
                'kasutaja konto saab kustutada, ka kui ta on oma külmkapi ainus omanik');

select * from finish();
rollback;
