// Expiry helpers. Dates come from the database as "YYYY-MM-DD" strings.

export type ExpiryLevel = "expired" | "soon" | "ok";

// How many days count as "expires soon".
export const SOON_DAYS = 3;

// The app's users are in Estonia; pages render on a server that usually runs in UTC.
export const APP_TIME_ZONE = "Europe/Tallinn";

// Today's date as "YYYY-MM-DD" in the app's time zone.
export function todayString(now: Date = new Date(), timeZone: string = APP_TIME_ZONE): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

// Whole days from `today` until `expiryDate` (negative = already expired).
export function daysUntil(expiryDate: string, today: string = todayString()): number {
  const ms = Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function expiryLevel(expiryDate: string, today: string = todayString()): ExpiryLevel {
  const days = daysUntil(expiryDate, today);
  if (days < 0) return "expired";
  if (days <= SOON_DAYS) return "soon";
  return "ok";
}

// Short Estonian label for the UI, e.g. "Täna", "Homme", "3 päeva pärast".
export function expiryLabel(expiryDate: string, today: string = todayString()): string {
  const days = daysUntil(expiryDate, today);
  if (days < -1) return `Aegus ${-days} päeva tagasi`;
  if (days === -1) return "Aegus eile";
  if (days === 0) return "Aegub täna";
  if (days === 1) return "Aegub homme";
  return `${days} päeva pärast`;
}
