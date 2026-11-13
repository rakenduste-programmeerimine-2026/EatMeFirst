# EatMeFirst — juhised Claude'ile ja tiimile

Next.js (App Router) + TypeScript + Supabase. Tiim: Joosep (andmebaas ja kvaliteet), Olaf (backend ja turvalisus), Uku (frontend ja disain).

## Git — kohustuslik

- **Ära kunagi commiti ega pushi otse `main`-i.** Iga muudatus = oma branch + pull request + review.
- Iga töö algab GitHubi issue'st. Branch: `<type>/<issue-nr>-<lühike-kirjeldus>`, nt `feat/12-add-item-form`.
- Commitid ja PR-i pealkirjad Angulari formaadis: `<type>(<scope>): <kokkuvõte>`
  - type: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `revert` (`chore` EI ole lubatud)
  - scope: `db` `auth` `items` `fridges` `recipes` `stats` `ui` `config`
  - kokkuvõte inglise keeles, väike algustäht, käskiv kõneviis, punktita: `feat(items): add expiry badge`
- PR-i kehasse `Closes #<issue-nr>`.

## Andmebaas — reeglid

- Skeemi, RLS-i ja funktsioonide kirjeldus: **`docs/DATABASE.md`**. Kasuta ainult seal olevaid tabeleid, veerge ja RPC-sid.
- **Ära muuda faile kaustas `supabase/`** ega loo uusi migratsioone, kui sa pole Joosep. Vajad muudatust → issue sildiga `db`.
- Ära muuda `src/types/database.types.ts` käsitsi — see on genereeritud.
- Ainult `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Service role / secret võtit ei kasutata kuskil rakenduse koodis.
- Ära dubleeri õiguste kontrolli koodis "turvalisuse pärast" teistsuguse loogikaga — RLS on tõe allikas. Kasutaja id-d ei saadeta kliendist; `added_by` ja `created_by` täidab andmebaas ise.
- Kuupäevad on `date` (`YYYY-MM-DD`), mitte timestamp.

## Kvaliteet

- `npm run lint`, `npm run typecheck` ja `npm test` peavad enne PR-i läbi minema.
- Uus loogika (nt aegumise arvutus, sorteerimine) tuleb koos unit-testiga.
- Andmebaasi testid: `npx supabase test db` (vajab Dockerit ja `npx supabase start`).
- GitHub Actions käivitab andmebaasi testid automaatselt igas PR-is, mis muudab kausta `supabase/`. PR-i ei merge'ita, kui **Database tests** on punane.
