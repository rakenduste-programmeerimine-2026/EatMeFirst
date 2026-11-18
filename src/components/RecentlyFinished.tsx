import RestoreItemButton from "@/components/RestoreItemButton";
import { createClient } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

// Start of the "recently marked" window.
function sinceIso(): string {
  return new Date(Date.now() - DAY_MS).toISOString();
}

// Items marked eaten / thrown away in the last 24 hours, so a wrong tap can be undone.
// Lives outside the item list because a marked item leaves that list right away.
export default async function RecentlyFinished({ fridgeId }: { fridgeId: string }) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("items")
    .select("id, name, quantity, unit, status")
    .eq("fridge_id", fridgeId)
    .neq("status", "active")
    .gte("status_changed_at", sinceIso())
    .order("status_changed_at", { ascending: false })
    .limit(5);

  if (!items || items.length === 0) return null;

  return (
    <section className="recent">
      <h2>Viimati märgitud</h2>
      <ul className="recent-list">
        {items.map((item) => (
          <li key={item.id} className="recent-item">
            <span>
              {item.name}
              {item.quantity !== null && (
                <span className="muted">
                  {" "}
                  {item.quantity.toLocaleString("et-EE")} {item.unit}
                </span>
              )}
              <span className="muted"> · {item.status === "used" ? "söödud" : "ära visatud"}</span>
            </span>
            <RestoreItemButton itemId={item.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
