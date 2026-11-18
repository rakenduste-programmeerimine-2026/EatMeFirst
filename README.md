# EatMeFirst

Veebirakendus, mis näitab, mida külmkapist esimesena ära süüa, et toit ei läheks raisku.
Mõeldud tudengitele ja noortele, kes ostavad ise toitu või jagavad külmkappi korterikaaslastega.

Next.js (App Router) + TypeScript + Supabase.

## Mida rakendus teeb

- **Söö esimesena** (avaleht): külmkapi tooted aegumise järgi, kõige kiiremini aeguv ees. Aegunud on punased, kuni 3 päeva jäänud kollased.
- **Söödud / Ära visatud**: toode märgitakse ühe vajutusega ja kaob nimekirjast.
- **Lisa toode**: nimi, aegumiskuupäev (kiirnupud „Homme“, „+3 päeva“, „+1 nädal“ toodetele, millel kuupäeva pole), kogus ja ühik.
- **Mida täna teha?**: retseptiideed toodetest, mis aeguvad kõige varem.
- **Nädala kokkuvõte**: mitu toodet sel nädalal söödi ja mitu ära visati, võrdluseks eelmise nädala äravisatud toodete arv.
- **Külmkapid** (`/fridges`): iga külmkapi kutsekood korterikaaslastele ja liikmete nimekiri. Kui oled mitme külmkapi liige, saab avalehel nende vahel vahetada.

## Käivitamine

```bash
npm install
cp .env.example .env.local   # täida Supabase URL ja publishable võti
npm run dev                  # http://localhost:3000
```

## Käsud

| Käsk | Mida teeb |
| --- | --- |
| `npm run dev` | arendusserver |
| `npm run build` | tootmisversiooni ehitus |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScripti kontroll |
| `npm test` | unit-testid (Vitest) |
| `npm run db:types` | genereerib `src/types/database.types.ts` (vajab `npx supabase start`) |

## Struktuur

```
src/
  app/                    lehed (App Router) ja server actionid
    page.tsx              avaleht
    login/                sisselogimine ja registreerumine
    items/actions.ts      toote lisamine ja staatuse muutmine
    fridges/              külmkappide leht (kutsekoodid ja liikmed)
  components/             UI komponendid (nimekiri, vormid, retseptid, statistika)
  lib/
    expiry.ts             kuupäevad, aegumise arvutus ja sildid
    fridges.ts            külmkapi valik ja silt
    fridges-query.ts      kasutaja külmkapid andmebaasist
    items/                toote valideerimine ja server actionite tulemuse tüüp
    recipes/              retseptiideede päring
    supabase/             Supabase kliendid: client.ts (brauser), server.ts (server), proxy.ts (sessioon)
  proxy.ts                suunab sisselogimata kasutaja /login lehele
  types/                  genereeritud andmebaasi tüübid
```

Andmebaasi kirjeldus: `docs/DATABASE.md`.
