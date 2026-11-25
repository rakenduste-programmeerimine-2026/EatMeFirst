// Text and grouping for the home page. Dates are "YYYY-MM-DD" strings, as in the database.
import { daysUntil, expiryLevel, todayString } from "@/lib/expiry";

type Dated = { name: string; expiry_date: string };

// The list in three groups, using the same limits as the expiry colors (lib/expiry.ts):
// already expired, expires within SOON_DAYS, later. Keeps the order the items came in.
export function groupByExpiry<T extends Dated>(items: T[], today: string = todayString()) {
  const groups = { expired: [] as T[], soon: [] as T[], later: [] as T[] };
  for (const item of items) {
    const level = expiryLevel(item.expiry_date, today);
    groups[level === "ok" ? "later" : level].push(item);
  }
  return groups;
}

// "2026-11-19" -> "19.11", printed in the "best before" stamp next to each item.
export function stampDate(expiryDate: string): string {
  const [, month, day] = expiryDate.split("-");
  return `${day}.${month}`;
}

// "1 toode", "2 toodet"
export function countItems(count: number): string {
  return `${count} ${count === 1 ? "toode" : "toodet"}`;
}

function dueText(days: number): string {
  if (days === 0) return "aegub täna";
  if (days === 1) return "aegub homme";
  return `aegub ${days} päeva pärast`;
}

// One or two sentences under the heading that answer "what should I eat first?".
// Expects the items sorted by expiry date, soonest first (as the home page loads them).
export function homeSummary(items: Dated[], today: string = todayString()): string {
  const expired = items.filter((item) => daysUntil(item.expiry_date, today) < 0).length;
  const next = items.find((item) => daysUntil(item.expiry_date, today) >= 0);

  const sentences: string[] = [];
  if (next) sentences.push(`${next.name} ${dueText(daysUntil(next.expiry_date, today))}.`);
  if (expired > 0) sentences.push(`${countItems(expired)} on juba aegunud.`);
  return sentences.join(" ");
}

// Compares this week's thrown-away count with last week's (the project's success criterion).
// Null when there is no last week to compare with.
export function wasteComparison(thisWeek: number, lastWeek: number | null): string | null {
  if (lastWeek === null) return null;
  const difference = thisWeek - lastWeek;
  if (difference < 0) return `${-difference} vähem ära visatud kui eelmisel nädalal (${lastWeek}).`;
  if (difference > 0) return `${difference} rohkem ära visatud kui eelmisel nädalal (${lastWeek}).`;
  return `Sama palju ära visatud kui eelmisel nädalal (${lastWeek}).`;
}
