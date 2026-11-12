import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialActionState } from "@/lib/items/action-state";

// --- Mocks: Supabase client and Next.js cache -------------------------------

type DbResult = { data?: unknown; error: { code?: string; message: string } | null };

const db = {
  result: { data: null, error: null } as DbResult,
  calls: [] as { method: string; args: unknown[] }[],
};

// Chainable stand-in for supabase.from(...): records every call and resolves
// to `db.result` when awaited.
function query() {
  const chain: Record<string, unknown> = {};
  for (const method of ["insert", "update", "eq", "select"]) {
    chain[method] = (...args: unknown[]) => {
      db.calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (value: DbResult) => unknown) => resolve(db.result);
  return chain;
}

const from = vi.fn((table: string) => {
  db.calls.push({ method: "from", args: [table] });
  return query();
});

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }));

const { addItem, setItemStatus } = await import("@/app/items/actions");

// --- Helpers -----------------------------------------------------------------

const FRIDGE_ID = "6f1c2b9e-3a4d-4e5f-8a7b-1c2d3e4f5a6b";
const ITEM_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

function call(method: string) {
  return db.calls.find((c) => c.method === method);
}

beforeEach(() => {
  db.result = { data: null, error: null };
  db.calls = [];
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
    expect(call("from")?.args).toEqual(["items"]);
    expect(call("insert")?.args[0]).toEqual({
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

    const inserted = call("insert")?.args[0] as Record<string, unknown>;
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
    db.result = { error: { code: "42501", message: "new row violates row-level security policy" } };
    const state = await addItem(initialActionState, validForm());

    expect(state).toEqual({ ok: false, message: "Sul pole sellele külmkapile ligipääsu." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not leak raw database errors", async () => {
    db.result = { error: { code: "XX000", message: "internal details" } };
    const state = await addItem(initialActionState, validForm());

    expect(state.ok).toBe(false);
    expect(state.message).not.toContain("internal details");
  });
});

// --- setItemStatus -----------------------------------------------------------

describe("setItemStatus", () => {
  it("updates only an active item and refreshes the list", async () => {
    db.result = { data: [{ id: ITEM_ID }], error: null };
    const state = await setItemStatus(initialActionState, form({ item_id: ITEM_ID, status: "used" }));

    expect(state).toEqual({ ok: true, message: "Märgitud söödud." });
    expect(call("update")?.args[0]).toEqual({ status: "used" });
    expect(db.calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["id", ITEM_ID],
      ["status", "active"],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("reports when no row was updated (other fridge or already marked)", async () => {
    db.result = { data: [], error: null };
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
