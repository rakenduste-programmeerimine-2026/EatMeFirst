// Server-side validation for item input. Limits mirror the CHECK constraints
// in supabase/migrations (see docs/DATABASE.md), so bad input is rejected with
// a readable message before it reaches the database.
//
// This only checks the *shape* of the input. Who may touch which fridge or
// item is decided by RLS in the database, not here.

import type { Enums, TablesInsert } from "@/types/database.types";

export const NAME_MAX = 80;
export const CATEGORY_MAX = 40;
export const UNIT_MAX = 20;

export type NewItem = Pick<
  TablesInsert<"items">,
  "fridge_id" | "name" | "expiry_date" | "quantity" | "unit" | "category"
>;

// Statuses a user can move an active item to.
export const FINAL_STATUSES = ["used", "wasted"] as const satisfies readonly Enums<"item_status">[];
export type FinalStatus = (typeof FINAL_STATUSES)[number];

export type StatusChange = { item_id: string; status: FinalStatus };

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors<T> };

// Raw input, e.g. Object.fromEntries(formData). Values are untrusted.
export type RawInput = Record<string, unknown>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Postgres char_length counts characters, JS .length counts UTF-16 units.
function charLength(value: string): number {
  return [...value].length;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// True for a real calendar date in YYYY-MM-DD form (rejects 2026-02-30).
export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Empty → null. Accepts Estonian decimal comma ("1,5").
function parseQuantity(value: unknown): { ok: true; value: number | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? { ok: true, value } : { ok: false };
  }
  if (typeof value !== "string") return { ok: false };
  const text = value.trim().replace(",", ".");
  if (text === "") return { ok: true, value: null };
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false };
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? { ok: true, value: number } : { ok: false };
}

// Empty → null, otherwise trimmed and at most `max` characters.
function optionalText(value: unknown, max: number): { ok: true; value: string | null } | { ok: false } {
  if (value !== undefined && value !== null && typeof value !== "string") return { ok: false };
  const text = asTrimmedString(value);
  if (text === "") return { ok: true, value: null };
  return charLength(text) <= max ? { ok: true, value: text } : { ok: false };
}

export function parseNewItem(input: RawInput): ValidationResult<NewItem> {
  const errors: FieldErrors<NewItem> = {};

  const fridgeId = input.fridge_id;
  if (!isUuid(fridgeId)) errors.fridge_id = "Külmkapp puudub või on vigane.";

  const name = asTrimmedString(input.name);
  if (name === "") errors.name = "Sisesta toote nimi.";
  else if (charLength(name) > NAME_MAX) errors.name = `Nimi võib olla kuni ${NAME_MAX} märki.`;

  const expiryDate = input.expiry_date;
  if (!isValidDate(expiryDate)) errors.expiry_date = "Sisesta kehtiv kuupäev (AAAA-KK-PP).";

  const quantity = parseQuantity(input.quantity);
  if (!quantity.ok) errors.quantity = "Kogus peab olema positiivne arv.";

  const unit = optionalText(input.unit, UNIT_MAX);
  if (!unit.ok) errors.unit = `Ühik võib olla kuni ${UNIT_MAX} märki.`;

  const category = optionalText(input.category, CATEGORY_MAX);
  if (!category.ok) errors.category = `Kategooria võib olla kuni ${CATEGORY_MAX} märki.`;

  if (Object.keys(errors).length > 0 || !quantity.ok || !unit.ok || !category.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      fridge_id: fridgeId as string,
      name,
      expiry_date: expiryDate as string,
      quantity: quantity.value,
      unit: unit.value,
      category: category.value,
    },
  };
}

export function parseStatusChange(input: RawInput): ValidationResult<StatusChange> {
  const errors: FieldErrors<StatusChange> = {};

  const itemId = input.item_id;
  if (!isUuid(itemId)) errors.item_id = "Toode puudub või on vigane.";

  const status = input.status;
  const isFinal = (FINAL_STATUSES as readonly unknown[]).includes(status);
  if (!isFinal) errors.status = "Vigane staatus.";

  if (!isUuid(itemId) || !isFinal) return { ok: false, errors };

  return { ok: true, data: { item_id: itemId, status: status as FinalStatus } };
}
