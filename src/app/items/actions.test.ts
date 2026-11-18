import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialActionState } from "@/lib/items/action-state";

// --- Mocks: Supabase client and Next.js cache -------------------------------

type DbResult = { data?: unknown; error: { code?: string; message: string } | null };
type Call = { method: string; args: unknown[] };

// Each supabase.from(...) query is recorded separately and, when awaited,
// resolves to the next result in `db.results` (or an empty success).
const db = {
  results: [] as DbResult[],
  queries: [] as Call[][],
};

const CHAIN_METHODS = ["insert", "update", "delete", "select", "eq", "neq", "is", "not", "limit", "single", "maybeSingle"];

function query(table: string) {
  const calls: Call[] = [{ method: "from", args: [table] }];
  db.queries.push(calls);
  const chain: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (value: DbResult) => unknown) => resolve(db.results.shift() ?? { data: null, error: null });
  return chain;
}

const from = vi.fn(query);
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }));

const { addItem, deleteItem, markPartialUse, restoreItem, setItemStatus, updateItem } = await import(
  "@/app/items/actions"
);

// --- Helpers -----------------------------------------------------------------

const FRIDGE_ID = "6f1c2b9e-3a4d-4e5f-8a7b-1c2d3e4f5a6b";
const ITEM_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const OTHER_ID = "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e";

const eggs = {
  fridge_id: FRIDGE_ID,
  name: "Munad",
  category: null,
  unit: "tk",
  expiry_date: "2026-11-25",
  quantity: 10,
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

// Arguments of `method` in the n-th query (0-based).
function args(queryIndex: number, method: string): unknown[][] {
  return (db.queries[queryIndex] ?? []).filter((c) => c.method === method).map((c) => c.args);
}

function arg(queryIndex: number, method: string): unknown {
  return args(queryIndex, method)[0]?.[0];
}

beforeEach(() => {
  db.results = [];
  db.queries = [];
  from.mockClear();
  revalidatePath.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// --- addItem -----------------------------------------------------------------

describe("addItem", () => {
  const validForm = () => form({ fridge_id: FRIDGE_ID, name: "Piim", expiry_date: "2026-11-15", quantity: "1" });

  it("inserts the validated item and refreshes the list", async () => {
    const state = await addItem(initialActionState, validForm());

    expect(state).toEqual({ ok: true, message: "Toode lisatud." });
    expect(from).toHaveBeenCalledWith("items");
    expect(arg(0, "insert")).toEqual({
      fridge_id: FRIDGE_ID,
      name: "Piim",
      expiry_date: "2026-11-15",
      quantity: 1,
      unit: null,
      category: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("never sends added_by or status from the client", async () => {
    const data = validForm();
    data.append("added_by", ITEM_ID);
    data.append("status", "used");
    await addItem(initialActionState, data);

    const inserted = arg(0, "insert") as Record<string, unknown>;
    expect(inserted).not.toHaveProperty("added_by");
    expect(inserted).not.toHaveProperty("status");
  });

  it("returns field errors and does not touch the database for invalid input", async () => {
    const state = await addItem(initialActionState, form({ fridge_id: FRIDGE_ID, name: "", expiry_date: "x" }));

    expect(state.ok).toBe(false);
    expect(Object.keys(state.fieldErrors ?? {}).sort()).toEqual(["expiry_date", "name"]);
    expect(from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("shows a friendly message when RLS rejects the fridge", async () => {
    db.results = [{ error: { code: "42501", message: "new row violates row-level security policy" } }];
    const state = await addItem(initialActionState, validForm());

    expect(state).toEqual({ ok: false, message: "Sul pole sellele külmkapile ligipääsu." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not leak raw database errors", async () => {
    db.results = [{ error: { code: "XX000", message: "internal details" } }];
    const state = await addItem(initialActionState, validForm());

    expect(state.ok).toBe(false);
    expect(state.message).not.toContain("internal details");
  });
});

// --- updateItem --------------------------------------------------------------

describe("updateItem", () => {
  const editForm = (extra: Record<string, string> = {}) =>
    form({ item_id: ITEM_ID, name: " Munad ", expiry_date: "2026-11-26", quantity: "8", unit: "tk", ...extra });

  it("replaces the editable fields of an active item", async () => {
    db.results = [{ data: [{ id: ITEM_ID }], error: null }];
    const state = await updateItem(initialActionState, editForm({ category: "" }));

    expect(state).toEqual({ ok: true, message: "Muudatused salvestatud.", itemId: ITEM_ID });
    expect(arg(0, "update")).toEqual({
      name: "Munad",
      expiry_date: "2026-11-26",
      quantity: 8,
      unit: "tk",
      category: null,
    });
    expect(args(0, "eq")).toEqual([
      ["id", ITEM_ID],
      ["status", "active"],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("never lets the client change fridge, status or added_by", async () => {
    db.results = [{ data: [{ id: ITEM_ID }], error: null }];
    await updateItem(initialActionState, editForm({ fridge_id: OTHER_ID, status: "used", added_by: OTHER_ID }));

    expect(Object.keys(arg(0, "update") as object).sort()).toEqual(["category", "expiry_date", "name", "quantity", "unit"]);
  });

  it("uses the same validation as adding", async () => {
    const state = await updateItem(initialActionState, editForm({ name: "", quantity: "-1" }));

    expect(Object.keys(state.fieldErrors ?? {}).sort()).toEqual(["name", "quantity"]);
    expect(from).not.toHaveBeenCalled();
  });

  it("reports when the item is not active or not visible", async () => {
    db.results = [{ data: [], error: null }];
    const state = await updateItem(initialActionState, editForm());

    expect(state).toEqual({ ok: false, message: "Toodet ei leitud või see on juba märgitud." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// --- deleteItem --------------------------------------------------------------

describe("deleteItem", () => {
  it("deletes the item and refreshes the list", async () => {
    db.results = [{ data: [{ id: ITEM_ID }], error: null }];
    const state = await deleteItem(initialActionState, form({ item_id: ITEM_ID }));

    expect(state).toEqual({ ok: true, message: "Toode kustutatud." });
    expect(args(0, "delete")).toHaveLength(1);
    expect(args(0, "eq")).toEqual([["id", ITEM_ID]]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("reports when nothing was deleted (other fridge or already gone)", async () => {
    db.results = [{ data: [], error: null }];
    const state = await deleteItem(initialActionState, form({ item_id: ITEM_ID }));

    expect(state).toEqual({ ok: false, message: "Toodet ei leitud." });
  });

  it("rejects a malformed id without calling the database", async () => {
    const state = await deleteItem(initialActionState, form({ item_id: "abc" }));

    expect(state.fieldErrors).toHaveProperty("item_id");
    expect(from).not.toHaveBeenCalled();
  });
});

// --- setItemStatus -----------------------------------------------------------

describe("setItemStatus", () => {
  it("updates only an active item and returns its id for undo", async () => {
    db.results = [{ data: [{ id: ITEM_ID }], error: null }];
    const state = await setItemStatus(initialActionState, form({ item_id: ITEM_ID, status: "used" }));

    expect(state).toEqual({ ok: true, message: "Märgitud söödud.", itemId: ITEM_ID });
    expect(arg(0, "update")).toEqual({ status: "used" });
    expect(args(0, "eq")).toEqual([
      ["id", ITEM_ID],
      ["status", "active"],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("reports when no row was updated (other fridge or already marked)", async () => {
    db.results = [{ data: [], error: null }];
    const state = await setItemStatus(initialActionState, form({ item_id: ITEM_ID, status: "wasted" }));

    expect(state.ok).toBe(false);
    expect(state.message).toBe("Toodet ei leitud või see on juba märgitud.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects invalid status without calling the database", async () => {
    const state = await setItemStatus(initialActionState, form({ item_id: ITEM_ID, status: "active" }));

    expect(state.ok).toBe(false);
    expect(state.fieldErrors).toHaveProperty("status");
    expect(from).not.toHaveBeenCalled();
  });
});

// --- markPartialUse ----------------------------------------------------------

describe("markPartialUse", () => {
  const partial = (amount: string, status = "used") => form({ item_id: ITEM_ID, amount, status });

  it("keeps the rest active and records the used part as its own row", async () => {
    db.results = [
      { data: eggs, error: null }, // read
      { data: [{ id: ITEM_ID }], error: null }, // reduce 10 → 7
      { data: { id: OTHER_ID }, error: null }, // insert used row
    ];
    const state = await markPartialUse(initialActionState, partial("3"));

    expect(state).toEqual({ ok: true, message: "3 tk söödud, alles 7 tk.", itemId: OTHER_ID });

    // Reduce only if nobody changed the quantity in between.
    expect(arg(1, "update")).toEqual({ quantity: 7 });
    expect(args(1, "eq")).toEqual([
      ["id", ITEM_ID],
      ["status", "active"],
      ["quantity", 10],
    ]);

    // The used part copies the product and keeps its expiry date.
    expect(arg(2, "insert")).toEqual({ ...eggs, quantity: 3, status: "used" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("handles decimals with a comma without float noise", async () => {
    db.results = [
      { data: { ...eggs, name: "Piim", unit: "l", quantity: 1.5 }, error: null },
      { data: [{ id: ITEM_ID }], error: null },
      { data: { id: OTHER_ID }, error: null },
    ];
    const state = await markPartialUse(initialActionState, partial("0,1", "wasted"));

    expect(arg(1, "update")).toEqual({ quantity: 1.4 });
    expect(state.message).toBe("0,1 l ära visatud, alles 1,4 l.");
  });

  it("marks the whole item when the amount is all of it", async () => {
    db.results = [
      { data: eggs, error: null },
      { data: [{ id: ITEM_ID }], error: null },
    ];
    const state = await markPartialUse(initialActionState, partial("10"));

    expect(state).toEqual({ ok: true, message: "Märgitud söödud.", itemId: ITEM_ID });
    expect(arg(1, "update")).toEqual({ status: "used" });
    expect(db.queries).toHaveLength(2);
  });

  it("asks to mark the whole item when it has no quantity", async () => {
    db.results = [{ data: { ...eggs, quantity: null }, error: null }];
    const state = await markPartialUse(initialActionState, partial("1"));

    expect(state.ok).toBe(false);
    expect(state.fieldErrors).toHaveProperty("amount");
    expect(db.queries).toHaveLength(1);
  });

  it("stops if the quantity changed in between", async () => {
    db.results = [
      { data: eggs, error: null },
      { data: [], error: null }, // reduce matched no row
    ];
    const state = await markPartialUse(initialActionState, partial("3"));

    expect(state.message).toBe("Toodet muudeti vahepeal. Värskenda lehte ja proovi uuesti.");
    expect(db.queries).toHaveLength(2);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("puts the amount back if recording the used part fails", async () => {
    db.results = [
      { data: eggs, error: null },
      { data: [{ id: ITEM_ID }], error: null },
      { data: null, error: { code: "XX000", message: "insert failed" } },
      { data: null, error: null }, // rollback
    ];
    const state = await markPartialUse(initialActionState, partial("3"));

    expect(state.ok).toBe(false);
    expect(arg(3, "update")).toEqual({ quantity: 10 });
    expect(args(3, "eq")).toEqual([
      ["id", ITEM_ID],
      ["quantity", 7],
    ]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a missing or already marked item", async () => {
    db.results = [{ data: null, error: null }];
    const state = await markPartialUse(initialActionState, partial("3"));

    expect(state.message).toBe("Toodet ei leitud või see on juba märgitud.");
  });

  it("validates amount and status before calling the database", async () => {
    for (const amount of ["", "0", "-2", "abc"]) {
      const state = await markPartialUse(initialActionState, partial(amount));
      expect(state.fieldErrors, amount).toHaveProperty("amount");
    }
    const state = await markPartialUse(initialActionState, partial("1", "active"));
    expect(state.fieldErrors).toHaveProperty("status");
    expect(from).not.toHaveBeenCalled();
  });
});

// --- restoreItem -------------------------------------------------------------

describe("restoreItem", () => {
  const usedPart = { ...eggs, quantity: 3, status: "used" };
  const restore = () => restoreItem(initialActionState, form({ item_id: ITEM_ID }));

  it("adds a partial use back to the matching active item", async () => {
    db.results = [
      { data: usedPart, error: null }, // read the used row
      { data: [{ id: OTHER_ID, quantity: 7 }], error: null }, // matching active item
      { data: [{ id: OTHER_ID }], error: null }, // 7 → 10
      { data: [{ id: ITEM_ID }], error: null }, // delete the used row
    ];
    const state = await restore();

    expect(state).toEqual({ ok: true, message: "Tagasi võetud.", itemId: OTHER_ID });

    // Only finished rows can be restored.
    expect(args(0, "neq")).toEqual([["status", "active"]]);

    // The match must be the same product in the same fridge.
    expect(args(1, "eq")).toEqual([
      ["fridge_id", FRIDGE_ID],
      ["status", "active"],
      ["name", "Munad"],
      ["expiry_date", "2026-11-25"],
      ["unit", "tk"],
    ]);
    expect(args(1, "is")).toEqual([["category", null]]);

    expect(arg(2, "update")).toEqual({ quantity: 10 });
    expect(args(2, "eq")).toContainEqual(["quantity", 7]);
    expect(args(3, "delete")).toHaveLength(1);
    expect(args(3, "eq")).toEqual([
      ["id", ITEM_ID],
      ["status", "used"],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("makes the item active again when there is nothing to merge with", async () => {
    db.results = [
      { data: { ...eggs, status: "wasted" }, error: null },
      { data: [], error: null }, // no matching active item
      { data: [{ id: ITEM_ID }], error: null }, // status → active
    ];
    const state = await restore();

    expect(state).toEqual({ ok: true, message: "Tagasi võetud.", itemId: ITEM_ID });
    expect(arg(2, "update")).toEqual({ status: "active" });
    expect(args(2, "eq")).toEqual([
      ["id", ITEM_ID],
      ["status", "wasted"],
    ]);
  });

  it("skips merging for items without a quantity", async () => {
    db.results = [
      { data: { ...eggs, quantity: null, status: "used" }, error: null },
      { data: [{ id: ITEM_ID }], error: null },
    ];
    const state = await restore();

    expect(state.ok).toBe(true);
    expect(db.queries).toHaveLength(2);
    expect(arg(1, "update")).toEqual({ status: "active" });
  });

  it("undoes the merge if the used row cannot be deleted", async () => {
    db.results = [
      { data: usedPart, error: null },
      { data: [{ id: OTHER_ID, quantity: 7 }], error: null },
      { data: [{ id: OTHER_ID }], error: null },
      { data: [], error: null }, // delete matched nothing
      { data: null, error: null }, // rollback 10 → 7
    ];
    const state = await restore();

    expect(state.ok).toBe(false);
    expect(arg(4, "update")).toEqual({ quantity: 7 });
    expect(args(4, "eq")).toEqual([
      ["id", OTHER_ID],
      ["quantity", 10],
    ]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("restores the row on its own if the matching item changed in between", async () => {
    db.results = [
      { data: usedPart, error: null },
      { data: [{ id: OTHER_ID, quantity: 7 }], error: null },
      { data: [], error: null }, // merge matched nothing
      { data: [{ id: ITEM_ID }], error: null }, // status → active
    ];
    const state = await restore();

    expect(state).toEqual({ ok: true, message: "Tagasi võetud.", itemId: ITEM_ID });
    expect(arg(3, "update")).toEqual({ status: "active" });
  });

  it("reports an item that is already active or not visible", async () => {
    db.results = [{ data: null, error: null }];
    const state = await restore();

    expect(state).toEqual({ ok: false, message: "Toodet ei leitud või see on juba aktiivne." });
  });
});
