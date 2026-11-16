# EatMeFirst

Veebirakendus, mis näitab, mida külmkapist esimesena ära süüa, et toit ei läheks raisku.

Next.js (App Router) + TypeScript + Supabase.

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
  app/              lehed (App Router)
  lib/supabase/     Supabase kliendid: client.ts (brauser), server.ts (server)
  lib/expiry.ts     aegumise arvutus ja sildid
  types/            genereeritud andmebaasi tüübid
```

Andmebaasi kirjeldus: `docs/DATABASE.md`.
