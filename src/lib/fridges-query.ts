import type { MyFridge } from "@/lib/fridges";
import { createClient } from "@/lib/supabase/server";

// The logged-in user's fridges, newest-joined first.
// fridge_members also returns flatmates' rows (RLS), so we filter by our own id.
export async function getMyFridges(): Promise<MyFridge[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("fridge_members")
    .select("role, fridges(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  return (data ?? []).flatMap((row) => (row.fridges ? [{ ...row.fridges, role: row.role }] : []));
}
