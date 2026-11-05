# EatMeFirst andmebaas (Supabase)

Omanik: Joosep (andmebaas ja kvaliteet). Skeemi muudatused tulevad **ainult** uue migratsioonina kaustas `supabase/migrations/` ja käivad läbi PR-i, mille Joosep üle vaatab.

## Ühendus

```env
NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- Kasuta ainult publishable võtit. **Secret / service_role võtit ei pane keegi koodi ega `.env.local`-i.**
- Kliendid tehakse `@supabase/ssr` abil (`createBrowserClient` / `createServerClient`).
- TypeScripti tüübid: `src/types/database.types.ts` (genereeritud, käsitsi ei muudeta).

```ts
import type { Database } from '@/types/database.types';
type Item = Database['public']['Tables']['items']['Row'];
```

## Mudel

```
auth.users 1─1 profiles 1─* fridge_members *─1 fridges 1─* items
                                                    recipes (ühised kõigile)
```

Iga kasutaja saab registreerumisel automaatselt profiili ja isikliku külmkapi ("Minu külmkapp"), mille omanik ta on. Korterikaaslased liituvad kutsekoodiga.

### `profiles`
| Veerg | Tüüp | Märkus |
| --- | --- | --- |
| id | uuid | = `auth.users.id` |
| display_name | text | ≤ 50 märki; registreerumisel `options.data.display_name` või e-posti eesosa |
| created_at | timestamptz | |

### `fridges`
| Veerg | Tüüp | Märkus |
| --- | --- | --- |
| id | uuid | |
| name | text | 1–60 märki |
| invite_code | text | 8 märki, unikaalne, genereeritakse ise |
| created_by | uuid | täidetakse ise (`auth.uid()`) |
| created_at | timestamptz | |

Uue külmkapi loojast saab automaatselt `owner`.

### `fridge_members`
| Veerg | Tüüp | Märkus |
| --- | --- | --- |
| fridge_id | uuid | PK osa |
| user_id | uuid | PK osa |
| role | `owner` \| `member` | |
| joined_at | timestamptz | |

Otse sisestada ei saa — liitumine käib `join_fridge()` kaudu.

### `items`
| Veerg | Tüüp | Märkus |
| --- | --- | --- |
| id | uuid | |
| fridge_id | uuid | kohustuslik |
| added_by | uuid | täidetakse ise |
| name | text | 1–80 märki, kohustuslik |
| category | text \| null | ≤ 40 |
| quantity | numeric \| null | > 0 |
| unit | text \| null | ≤ 20 (nt "tk", "g", "l") |
| expiry_date | date | kohustuslik, `YYYY-MM-DD` |
| status | `active` \| `used` \| `wasted` | vaikimisi `active` |
| status_changed_at | timestamptz \| null | pannakse ise staatuse muutmisel |
| created_at, updated_at | timestamptz | `updated_at` uueneb ise |

### `recipes` (ainult lugemiseks)
| Veerg | Tüüp |
| --- | --- |
| id | bigint |
| title | text |
| instructions | text |
| ingredients | text[] — märksõnad, mida otsitakse toote nimest |
| minutes | int \| null |

## Õigused (RLS)

| Tabel | Kes mida saab |
| --- | --- |
| profiles | näed enda ja oma külmkapikaaslaste profiili; muudad ainult enda oma |
| fridges | näed külmkappe, mille liige oled; lood enda nimel; muudad/kustutad ainult omanikuna |
| fridge_members | näed oma külmkappide liikmeid; lahkud ise või omanik eemaldab |
| items | kõik külmkapi liikmed saavad lugeda, lisada, muuta, kustutada |
| recipes | kõik sisseloginud saavad lugeda |

Sisselogimata (`anon`) kasutaja ei saa midagi. RLS-i ei pea koodis üle kontrollima — andmebaas lihtsalt ei tagasta võõraid ridu (päring annab tühja tulemuse, sisestus annab vea `42501`).

## Valmis päringud

```ts
// Põhivaade: aktiivsed tooted, kõige kiiremini aeguv ees
const { data } = await supabase
  .from('items')
  .select('id, name, quantity, unit, expiry_date, category')
  .eq('fridge_id', fridgeId)
  .eq('status', 'active')
  .order('expiry_date', { ascending: true })
  .order('name');

// Toote lisamine (fridge_id on kohustuslik, added_by täitub ise)
await supabase.from('items').insert({ fridge_id: fridgeId, name: 'Piim', expiry_date: '2026-11-10' }).select().single();

// Märgi söödud / ära visatud
await supabase.from('items').update({ status: 'used' }).eq('id', itemId);   // või 'wasted'

// Kasutaja külmkapid
await supabase.from('fridges').select('id, name, invite_code').order('created_at');

// Korterikaaslase liitumine
const { data: fridgeId, error } = await supabase.rpc('join_fridge', { p_invite_code: 'ab12cd34' });

// Retseptiideed kõige varem aeguvatest toodetest
const { data: recipes } = await supabase.rpc('suggest_recipes', { p_fridge_id: fridgeId, p_limit: 5 });
// → [{ recipe_id, title, instructions, minutes, matched_items, match_count, soonest_expiry }]

// Nädalastatistika (edu kriteerium: kas ära visatakse vähem?)
await supabase.from('fridge_weekly_stats').select('*').eq('fridge_id', fridgeId).order('week_start');
// → [{ fridge_id, week_start, used_count, wasted_count }]

// Registreerumine koos nimega
await supabase.auth.signUp({ email, password, options: { data: { display_name: 'Mari' } } });
```

"Aegub varsti" loogika (nt ≤ 3 päeva) arvutatakse rakenduses `expiry_date` põhjal, mitte andmebaasis.

## Muudatuse soov

Kui vajad uut veergu, tabelit või päringut: tee issue sildiga `db`, kirjelda mida ja miks. Joosep teeb migratsiooni, genereerib tüübid uuesti ja uuendab seda faili.
