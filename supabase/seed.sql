-- Retseptid, mida suggest_recipes() pakub. ingredients = väiketähtedega märksõnad.
insert into public.recipes (title, instructions, ingredients, minutes) values
  ('Omlett',             'Klopi munad piimaga, lisa juust ja prae pannil.',             array['muna', 'piim', 'juust'], 10),
  ('Pannkoogid',         'Sega munad, piim ja jahu, prae õhukesed koogid.',             array['muna', 'piim', 'jahu'], 25),
  ('Kanasalat',          'Lõika kana, kurk ja tomat, sega jogurtikastmega.',            array['kana', 'kurk', 'tomat', 'jogurt'], 15),
  ('Juustuvõileib',      'Pane leivale juust ja tomat, kuumuta ahjus.',                 array['leib', 'juust', 'tomat'], 8),
  ('Jogurt marjadega',   'Sega jogurt marjade ja kaerahelvestega.',                     array['jogurt', 'mari', 'kaer'], 3),
  ('Hakklihapasta',      'Prae hakkliha sibulaga, lisa tomat ja keedetud pasta.',       array['hakkliha', 'sibul', 'tomat', 'pasta'], 30),
  ('Köögiviljapuder',    'Haudu kartul, porgand ja sibul pehmeks, purusta.',            array['kartul', 'porgand', 'sibul'], 35),
  ('Kodujuustu pannkoogid', 'Sega kohupiim, muna ja jahu, prae väikesed koogid.',       array['kohupiim', 'muna', 'jahu'], 20);
