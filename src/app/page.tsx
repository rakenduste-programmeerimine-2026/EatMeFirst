import Link from "next/link";
import AddItemSheet from "@/components/AddItemSheet";
import ItemList from "@/components/ItemList";
import RecentlyFinished from "@/components/RecentlyFinished";
import RecipeIdeas from "@/components/RecipeIdeas";
import WeeklyStats from "@/components/WeeklyStats";
import { fridgeLabel, pickFridge } from "@/lib/fridges";
import { getMyFridges } from "@/lib/fridges-query";
import { homeSummary } from "@/lib/home";
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
    .select("id, name, quantity, unit, expiry_date, category")
    .eq("fridge_id", fridge.id)
    .eq("status", "active")
    .order("expiry_date", { ascending: true })
    .order("name");

  const summary = homeSummary(items ?? []);

  return (
    <>
      {fridges.length > 1 && (
        <nav className="fridge-switcher" aria-label="Külmkapid">
          {fridges.map((other) => (
            <Link
              key={other.id}
              href={`/?fridge=${other.id}`}
              className={other.id === fridge.id ? "chip chip-active" : "chip"}
              aria-current={other.id === fridge.id ? "page" : undefined}
            >
              {fridgeLabel(other)}
            </Link>
          ))}
        </nav>
      )}

      <section className="hero">
        <p className="eyebrow">{fridgeLabel(fridge)}</p>
        <h1>Söö esimesena</h1>
        {summary && <p className="summary">{summary}</p>}
      </section>

      <WeeklyStats fridgeId={fridge.id} />
      <ItemList items={items ?? []} />
      <RecentlyFinished fridgeId={fridge.id} />
      <RecipeIdeas fridgeId={fridge.id} />
      <AddItemSheet fridgeId={fridge.id} />
    </>
  );
}
