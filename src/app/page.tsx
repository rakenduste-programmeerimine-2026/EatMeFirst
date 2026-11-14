import AddItemForm from "@/components/AddItemForm";
import ItemList from "@/components/ItemList";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  // Every user gets a personal fridge on signup; for now we show the oldest one.
  const { data: fridges } = await supabase.from("fridges").select("id, name").order("created_at").limit(1);
  const fridge = fridges?.[0];

  if (!fridge) {
    return <p className="alert alert-error">Külmkappi ei leitud.</p>;
  }

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
        <p className="muted">{fridge.name} · kõige varem aeguv on eespool</p>
      </section>

      <ItemList items={items ?? []} />
      <AddItemForm fridgeId={fridge.id} />
    </>
  );
}
