import Link from "next/link";
import CopyCodeButton from "@/components/CopyCodeButton";
import JoinFridgeForm from "@/components/JoinFridgeForm";
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
        <p className="muted">
          Jaga külmkappi pere või korterikaaslastega: saada neile kutsekood ja nad saavad allpool liituda.
        </p>
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
              <div className="invite">
                <label htmlFor={`invite-${fridge.id}`}>Kutsekood</label>
                <div className="invite-row">
                  <input id={`invite-${fridge.id}`} type="text" readOnly value={code} />
                  <CopyCodeButton code={code} />
                </div>
              </div>
            )}
          </article>
        );
      })}

      <JoinFridgeForm />
    </>
  );
}
