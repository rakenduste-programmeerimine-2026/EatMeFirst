import { addDays, weekStart } from "@/lib/expiry";
import { createClient } from "@/lib/supabase/server";

// This week's eaten / thrown-away counts and last week's waste, so the user can
// see whether they throw away less than before (the project's success criterion).
export default async function WeeklyStats({ fridgeId }: { fridgeId: string }) {
  const thisWeek = weekStart();
  const lastWeek = addDays(thisWeek, -7);

  const supabase = await createClient();
  const { data } = await supabase
    .from("fridge_weekly_stats")
    .select("week_start, used_count, wasted_count")
    .eq("fridge_id", fridgeId)
    .gte("week_start", lastWeek);

  const now = data?.find((row) => row.week_start === thisWeek);
  const before = data?.find((row) => row.week_start === lastWeek);

  return (
    <p className="stats">
      Sel nädalal: <strong>{now?.used_count ?? 0} söödud</strong> ·{" "}
      <strong>{now?.wasted_count ?? 0} ära visatud</strong>
      {before && <span className="muted"> (eelmisel nädalal {before.wasted_count} ära visatud)</span>}
    </p>
  );
}
