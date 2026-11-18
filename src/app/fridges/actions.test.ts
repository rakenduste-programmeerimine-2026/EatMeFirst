import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialActionState } from "@/lib/items/action-state";

// --- Mocks: Supabase client and Next.js cache / navigation -------------------

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

let rpcResult: RpcResult = { data: null, error: null };
const rpc = vi.fn(async () => rpcResult);
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

// Like the real redirect(), stop the action by throwing.
class Redirect extends Error {}
const redirect = vi.fn((url: string) => {
  throw new Redirect(url);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

const { joinFridge } = await import("@/app/fridges/actions");

// --- Helpers -----------------------------------------------------------------

const CODE = "c81c1557fe3b4830";
const FRIDGE_ID = "6f1c2b9e-3a4d-4e5f-8a7b-1c2d3e4f5a6b";

function form(code?: string): FormData {
  const data = new FormData();
  if (code !== undefined) data.append("invite_code", code);
  return data;
}

beforeEach(() => {
  rpcResult = { data: null, error: null };
  rpc.mockClear();
  revalidatePath.mockClear();
  redirect.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// --- joinFridge --------------------------------------------------------------

describe("joinFridge", () => {
  it("joins with a trimmed code and opens the joined fridge", async () => {
    rpcResult = { data: FRIDGE_ID, error: null };

    await expect(joinFridge(initialActionState, form(`  ${CODE} `))).rejects.toThrow(Redirect);
    expect(rpc).toHaveBeenCalledWith("join_fridge", { p_invite_code: CODE });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith(`/?fridge=${FRIDGE_ID}`);
  });

  it("shows 'Vale kutsekood' when the database returns null for a wrong code", async () => {
    rpcResult = { data: null, error: null };
    const state = await joinFridge(initialActionState, form(CODE));

    expect(state).toEqual({ ok: false, fieldErrors: { invite_code: "Vale kutsekood." } });
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not call the database for an obviously invalid code", async () => {
    for (const code of [undefined, "", "ab12cd34"]) {
      const state = await joinFridge(initialActionState, form(code));
      expect(state.ok).toBe(false);
      expect(state.fieldErrors).toHaveProperty("invite_code");
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains the rate limit after too many wrong codes", async () => {
    rpcResult = { data: null, error: { code: "P0001", message: "too many invalid invite codes, try again later" } };
    const state = await joinFridge(initialActionState, form(CODE));

    expect(state).toEqual({ ok: false, message: "Liiga palju valesid katseid. Proovi 10 minuti pärast uuesti." });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("asks to log in again when the session has expired", async () => {
    rpcResult = { data: null, error: { code: "P0001", message: "not authenticated" } };
    const state = await joinFridge(initialActionState, form(CODE));

    expect(state.message).toBe("Logi uuesti sisse ja proovi siis uuesti.");
  });

  it("logs unexpected errors on the server and does not leak them", async () => {
    rpcResult = { data: null, error: { code: "XX000", message: "internal details" } };
    const state = await joinFridge(initialActionState, form(CODE));

    expect(state).toEqual({ ok: false, message: "Liitumine ebaõnnestus. Proovi uuesti." });
    expect(console.error).toHaveBeenCalled();
  });
});
