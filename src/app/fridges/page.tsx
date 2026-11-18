import Link from "next/link";
import { fridgeLabel } from "@/lib/fridges";
import { getMyFridges } from "@/lib/fridges-query";
import { createClient } from "@/lib/supabase/server";

export default async function FridgesPage() {
  const supabase = await createClient();
  const fridges = await getMyFridges();
  const ids = fridges.map((fridge) => fridge.id);

  // Invite codes and members of all my fridges (RLS only returns my fridges).
  const [{ data: codes }, { data: members }] = await Promise.all([
    supabase.from("fridges").select("id, invite_code").in("id", ids),
    supabase.from("fridge_members").select("fridge_id, role, profiles(display_name)").in("fridge_id", ids),
  ]);

  return (
    <>
      <section>
        <h1>Külmkapid</h1>
        <p className="muted">Sinu külmkapid, nende liikmed ja kutsekoodid.</p>
      </section>

      {fridges.map((fridge) => {
        const code = codes?.find((row) => row.id === fridge.id)?.invite_code;
        const names = (members ?? [])
          .filter((row) => row.fridge_id === fridge.id)
          .map((row) => {
            const name = row.profiles?.display_name ?? "Nimetu";
            return row.role === "owner" ? `${name} (omanik)` : name;
          });

        return (
          <article key={fridge.id} className="card fridge">
            <div className="fridge-head">
              <h2>{fridgeLabel(fridge)}</h2>
              <Link href={`/?fridge=${fridge.id}`}>Ava</Link>
            </div>
            <p className="muted">Liikmed: {names.join(", ")}</p>
            {code && (
              <label className="invite">
                Kutsekood
                <input type="text" readOnly value={code} />
              </label>
            )}
          </article>
        );
      })}

      <p className="muted">Kutsekoodiga teise külmkapiga liitumine tuleb peagi.</p>
    </>
  );
}
