import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mock: Supabase client ---------------------------------------------------

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

let rpcResult: RpcResult = { data: [], error: null };
const rpc = vi.fn(async () => rpcResult);

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

const { DEFAULT_LIMIT, MAX_LIMIT, getRecipeSuggestions, parseLimit } = await import("@/lib/recipes/suggestions");

const FRIDGE_ID = "6f1c2b9e-3a4d-4e5f-8a7b-1c2d3e4f5a6b";

const omlett = {
  recipe_id: 1,
  title: "Omlett",
  instructions: "Klopi munad piimaga, lisa juust ja prae pannil.",
  minutes: 10,
  matched_items: ["Munad", "Piim 2,5%"],
  match_count: 2,
  soonest_expiry: "2026-11-16",
};

beforeEach(() => {
  rpcResult = { data: [], error: null };
  rpc.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// --- parseLimit --------------------------------------------------------------

describe("parseLimit", () => {
  it("defaults to 5 when missing or not a number", () => {
    for (const value of [undefined, null, "", "  ", "abc", NaN, Infinity, {}]) {
      expect(parseLimit(value), String(value)).toBe(DEFAULT_LIMIT);
    }
  });

  it("accepts numbers and numeric strings", () => {
    expect(parseLimit(3)).toBe(3);
    expect(parseLimit("8")).toBe(8);
  });

  it("clamps to 1..20 and rounds down", () => {
    expect(parseLimit(0)).toBe(1);
    expect(parseLimit(-4)).toBe(1);
    expect(parseLimit(500)).toBe(MAX_LIMIT);
    expect(parseLimit("2.9")).toBe(2);
  });
});

// --- getRecipeSuggestions ----------------------------------------------------

describe("getRecipeSuggestions", () => {
  it("calls suggest_recipes with the fridge and limit", async () => {
    rpcResult = { data: [omlett], error: null };
    const result = await getRecipeSuggestions(FRIDGE_ID, 3);

    expect(rpc).toHaveBeenCalledWith("suggest_recipes", { p_fridge_id: FRIDGE_ID, p_limit: 3 });
    expect(result).toEqual({ ok: true, recipes: [{ ...omlett, missing_ingredients: [] }] });
  });

  it("passes on the missing ingredients from the database (#34)", async () => {
    rpcResult = { data: [{ ...omlett, missing_ingredients: ["juust"] }], error: null };
    const result = await getRecipeSuggestions(FRIDGE_ID);

    expect(result.ok && result.recipes[0].missing_ingredients).toEqual(["juust"]);
  });

  it("uses an empty list until the database returns missing ingredients", async () => {
    // Old function without the column, a null value, or something unexpected.
    for (const missing of [undefined, null, "juust", [1, "juust", null]]) {
      rpcResult = { data: [{ ...omlett, missing_ingredients: missing }], error: null };
      const result = await getRecipeSuggestions(FRIDGE_ID);
      const expected = Array.isArray(missing) ? ["juust"] : [];
      expect(result.ok && result.recipes[0].missing_ingredients, String(missing)).toEqual(expected);
    }
  });

  it("uses the default limit and clamps large values", async () => {
    await getRecipeSuggestions(FRIDGE_ID);
    await getRecipeSuggestions(FRIDGE_ID, 1000);

    expect(rpc.mock.calls.map((call) => (call as unknown[])[1])).toEqual([
      { p_fridge_id: FRIDGE_ID, p_limit: DEFAULT_LIMIT },
      { p_fridge_id: FRIDGE_ID, p_limit: MAX_LIMIT },
    ]);
  });

  it("returns an empty list, not an error, when nothing matches", async () => {
    rpcResult = { data: [], error: null };
    expect(await getRecipeSuggestions(FRIDGE_ID)).toEqual({ ok: true, recipes: [] });

    rpcResult = { data: null, error: null };
    expect(await getRecipeSuggestions(FRIDGE_ID)).toEqual({ ok: true, recipes: [] });
  });

  it("keeps recipes without cooking time as minutes: null", async () => {
    rpcResult = { data: [{ ...omlett, minutes: null }], error: null };
    const result = await getRecipeSuggestions(FRIDGE_ID);

    expect(result.ok && result.recipes[0].minutes).toBeNull();
  });

  it("rejects an invalid fridge id without calling the database", async () => {
    for (const fridgeId of [undefined, "", "abc", "1; drop table items", 42]) {
      const result = await getRecipeSuggestions(fridgeId);
      expect(result.ok, String(fridgeId)).toBe(false);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("logs database errors on the server and does not leak them", async () => {
    rpcResult = { data: null, error: { code: "XX000", message: "internal details" } };
    const result = await getRecipeSuggestions(FRIDGE_ID);

    expect(result).toEqual({ ok: false, message: "Retseptiideid ei õnnestunud laadida." });
    expect(console.error).toHaveBeenCalled();
  });
});
