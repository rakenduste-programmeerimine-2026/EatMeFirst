import { describe, expect, it } from "vitest";
import { isValidDate, parseNewItem, parseStatusChange } from "@/lib/items/validation";

const FRIDGE_ID = "6f1c2b9e-3a4d-4e5f-8a7b-1c2d3e4f5a6b";
const ITEM_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const valid = { fridge_id: FRIDGE_ID, name: "Piim 2,5%", expiry_date: "2026-11-15" };

describe("isValidDate", () => {
  it("accepts real YYYY-MM-DD dates", () => {
    expect(isValidDate("2026-11-15")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
  });

  it("rejects impossible or wrongly formatted dates", () => {
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2027-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("15.11.2026")).toBe(false);
    expect(isValidDate("2026-11-15T00:00:00Z")).toBe(false);
    expect(isValidDate("")).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});

describe("parseNewItem", () => {
  it("accepts the minimal valid item and fills optional fields with null", () => {
    expect(parseNewItem(valid)).toEqual({
      ok: true,
      data: { ...valid, quantity: null, unit: null, category: null },
    });
  });

  it("trims text and parses quantity with a decimal comma", () => {
    const result = parseNewItem({ ...valid, name: "  Juust  ", quantity: "1,5", unit: " kg ", category: " Piimatooted " });
    expect(result).toEqual({
      ok: true,
      data: { ...valid, name: "Juust", quantity: 1.5, unit: "kg", category: "Piimatooted" },
    });
  });

  it("treats empty optional fields as null", () => {
    const result = parseNewItem({ ...valid, quantity: "", unit: "  ", category: "" });
    expect(result.ok && result.data).toMatchObject({ quantity: null, unit: null, category: null });
  });

  it("requires a name of at most 80 characters", () => {
    expect(parseNewItem({ ...valid, name: "   " })).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    expect(parseNewItem({ ...valid, name: "a".repeat(80) }).ok).toBe(true);
    expect(parseNewItem({ ...valid, name: "a".repeat(81) }).ok).toBe(false);
  });

  it("counts characters like Postgres, not UTF-16 units", () => {
    // 80 emoji = 160 UTF-16 units but 80 characters in the database.
    expect(parseNewItem({ ...valid, name: "🥛".repeat(80) }).ok).toBe(true);
  });

  it("rejects a missing or malformed fridge id", () => {
    expect(parseNewItem({ ...valid, fridge_id: undefined })).toMatchObject({ errors: { fridge_id: expect.any(String) } });
    expect(parseNewItem({ ...valid, fridge_id: "1; drop table items" }).ok).toBe(false);
  });

  it("rejects invalid expiry dates", () => {
    expect(parseNewItem({ ...valid, expiry_date: "2026-02-30" })).toMatchObject({
      errors: { expiry_date: expect.any(String) },
    });
  });

  it("rejects zero, negative and non-numeric quantities", () => {
    for (const quantity of ["0", "-1", "abc", "1e3", "Infinity", "1,2,3"]) {
      expect(parseNewItem({ ...valid, quantity }), quantity).toMatchObject({ errors: { quantity: expect.any(String) } });
    }
  });

  it("enforces unit and category length limits", () => {
    expect(parseNewItem({ ...valid, unit: "x".repeat(21) })).toMatchObject({ errors: { unit: expect.any(String) } });
    expect(parseNewItem({ ...valid, category: "x".repeat(41) })).toMatchObject({
      errors: { category: expect.any(String) },
    });
  });

  it("rejects non-string values such as File uploads", () => {
    const file = new Blob(["x"]);
    expect(parseNewItem({ ...valid, name: file }).ok).toBe(false);
    expect(parseNewItem({ ...valid, unit: file }).ok).toBe(false);
  });

  it("only returns known fields, so extra input like added_by is dropped", () => {
    const result = parseNewItem({ ...valid, added_by: ITEM_ID, status: "used" });
    expect(result.ok && Object.keys(result.data).sort()).toEqual(
      ["category", "expiry_date", "fridge_id", "name", "quantity", "unit"],
    );
  });

  it("reports all field errors at once", () => {
    const result = parseNewItem({});
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["expiry_date", "fridge_id", "name"]);
  });
});

describe("parseStatusChange", () => {
  it("accepts used and wasted", () => {
    expect(parseStatusChange({ item_id: ITEM_ID, status: "used" })).toEqual({
      ok: true,
      data: { item_id: ITEM_ID, status: "used" },
    });
    expect(parseStatusChange({ item_id: ITEM_ID, status: "wasted" }).ok).toBe(true);
  });

  it("rejects other statuses, including active", () => {
    for (const status of ["active", "eaten", "", undefined]) {
      expect(parseStatusChange({ item_id: ITEM_ID, status })).toMatchObject({ errors: { status: expect.any(String) } });
    }
  });

  it("rejects a malformed item id", () => {
    expect(parseStatusChange({ item_id: "abc", status: "used" })).toMatchObject({
      errors: { item_id: expect.any(String) },
    });
  });
});
