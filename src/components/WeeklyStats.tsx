import { addDays, weekStart } from "@/lib/expiry";
import { wasteComparison } from "@/lib/home";
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
  const used = now?.used_count ?? 0;
  const wasted = now?.wasted_count ?? 0;
  const comparison = wasteComparison(wasted, before?.wasted_count ?? null);
  const better = before?.wasted_count != null && wasted < before.wasted_count;

  return (
    <section className="stats" aria-label="Selle nädala kokkuvõte">
      <div className="stat">
        <strong className="stat-number stat-used">{used}</strong>
        <span>söödud sel nädalal</span>
      </div>
      <div className="stat">
        <strong className="stat-number stat-wasted">{wasted}</strong>
        <span>ära visatud</span>
      </div>
      {comparison && (
        <p className={better ? "stat-compare stat-better" : "stat-compare"}>
          {better && (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          )}
          {comparison}
        </p>
      )}
    </section>
  );
}
