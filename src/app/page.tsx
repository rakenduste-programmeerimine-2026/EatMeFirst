import Link from "next/link";
import AddItemForm from "@/components/AddItemForm";
import ItemList from "@/components/ItemList";
import RecipeIdeas from "@/components/RecipeIdeas";
import WeeklyStats from "@/components/WeeklyStats";
import { fridgeLabel, pickFridge } from "@/lib/fridges";
import { getMyFridges } from "@/lib/fridges-query";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ fridge?: string }> }) {
  const { fridge: requestedId } = await searchParams;
  const fridges = await getMyFridges();
  const fridge = pickFridge(fridges, requestedId);

  if (!fridge) {
    return <p className="alert alert-error">Külmkappi ei leitud.</p>;
  }

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("items")
    .select("id, name, quantity, unit, expiry_date")
    .eq("fridge_id", fridge.id)
    .eq("status", "active")
    .order("expiry_date", { ascending: true })
    .order("name");

  return (
    <>
      <section>
        <h1>Söö esimesena</h1>
        <p className="muted">{fridgeLabel(fridge)} · kõige varem aeguv on eespool</p>
        <WeeklyStats fridgeId={fridge.id} />
      </section>

      {fridges.length > 1 && (
        <nav className="fridge-switcher" aria-label="Külmkapid">
          {fridges.map((other) => (
            <Link
              key={other.id}
              href={`/?fridge=${other.id}`}
              className={other.id === fridge.id ? "chip chip-active" : "chip"}
            >
              {fridgeLabel(other)}
            </Link>
          ))}
        </nav>
      )}

      <ItemList items={items ?? []} />
      <AddItemForm fridgeId={fridge.id} />
      <RecipeIdeas fridgeId={fridge.id} />
    </>
  );
}
