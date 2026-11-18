import { describe, expect, it } from "vitest";
import { QUANTITY_PATTERN, quantityMessage } from "@/lib/quantity";

// The browser anchors the pattern to the whole value, so the test does the same.
const matches = (value: string) => new RegExp(`^(?:${QUANTITY_PATTERN})$`).test(value);

describe("QUANTITY_PATTERN", () => {
  it("accepts whole numbers and decimals with a comma or a point", () => {
    expect(matches("1")).toBe(true);
    expect(matches("500")).toBe(true);
    expect(matches("0,5")).toBe(true);
    expect(matches("1.25")).toBe(true);
  });

  it("rejects words, units and signs", () => {
    expect(matches("pool")).toBe(false);
    expect(matches("2 tk")).toBe(false);
    expect(matches("-1")).toBe(false);
    expect(matches("0,")).toBe(false);
  });
});

describe("quantityMessage", () => {
  it("explains the expected format in Estonian", () => {
    expect(quantityMessage({ valueMissing: false, patternMismatch: true })).toBe("Kirjuta kogus numbriga, nt 1 või 0,5.");
    expect(quantityMessage({ valueMissing: true, patternMismatch: false })).toBe("Sisesta kogus, nt 1 või 0,5.");
  });

  it("returns an empty message for a valid value", () => {
    expect(quantityMessage({ valueMissing: false, patternMismatch: false })).toBe("");
  });
});
