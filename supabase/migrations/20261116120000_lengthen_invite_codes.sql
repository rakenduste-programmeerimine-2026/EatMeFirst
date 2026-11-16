-- Olafi review #6 punkt 6 (1/2): pikemad kutsekoodid.
-- 8 hex-märki = 32 bitti oli liiga lihtne ära arvata; 16 hex-märki = 64 bitti.

alter table public.fridges
  alter column invite_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);

-- Olemasolevad lühikesed koodid asendatakse (vanad koodid lakkavad töötamast)
update public.fridges
   set invite_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
 where char_length(invite_code) < 16;

alter table public.fridges
  add constraint fridges_invite_code_min_length check (char_length(invite_code) >= 16);
