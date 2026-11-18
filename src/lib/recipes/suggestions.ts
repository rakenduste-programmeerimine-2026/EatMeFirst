// Recipe ideas from the items in a fridge that expire soonest.
//
// Call this from Server Components (e.g. the home page). It is deliberately
// not a "use server" action, so it is not exposed as a public endpoint.
// Which fridges a user may read is decided by RLS: for a fridge the user is
// not a member of, suggest_recipes simply returns no rows.

import { isUuid } from "@/lib/items/validation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 20;

type RpcRow = Database["public"]["Functions"]["suggest_recipes"]["Returns"][number];

// #34: suggest_recipes also returns the recipe's ingredients that are not in
// the fridge. Optional here until that migration is in and the types are
// regenerated, so the app keeps working against the old function.
type RpcRowWithMissing = RpcRow & { missing_ingredients?: unknown };

// `minutes` is nullable in the recipes table, but generated RPC types
// cannot express that, so it is widened here.
export type RecipeSuggestion = Omit<RpcRow, "minutes"> & {
  minutes: number | null;
  // Ingredient keywords the fridge is missing, e.g. ["tomat"]. Empty when nothing is missing.
  missing_ingredients: string[];
};

// Keeps only real strings, so a missing or malformed column becomes [].
function missingIngredients(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export type RecipeSuggestionsResult =
  | { ok: true; recipes: RecipeSuggestion[] }
  | { ok: false; message: string };

// Missing or non-numeric → DEFAULT_LIMIT; numbers are rounded down and
// clamped to 1..MAX_LIMIT. Accepts strings so it can take a search param.
export function parseLimit(value: unknown): number {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isFinite(number)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(number)));
}

export async function getRecipeSuggestions(
  fridgeId: unknown,
  limit: unknown = DEFAULT_LIMIT,
): Promise<RecipeSuggestionsResult> {
  if (!isUuid(fridgeId)) return { ok: false, message: "Külmkapp puudub või on vigane." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("suggest_recipes", {
    p_fridge_id: fridgeId,
    p_limit: parseLimit(limit),
  });

  if (error) {
    console.error("[recipes] suggest_recipes failed", error.code, error.message);
    return { ok: false, message: "Retseptiideid ei õnnestunud laadida." };
  }

  // No matching items is a normal result, not an error.
  return {
    ok: true,
    recipes: (data ?? []).map((row: RpcRowWithMissing) => ({
      ...row,
      minutes: row.minutes ?? null,
      missing_ingredients: missingIngredients(row.missing_ingredients),
    })),
  };
}
