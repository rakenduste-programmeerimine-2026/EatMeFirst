import { describe, expect, it } from "vitest";
import { daysUntil, expiryLabel, expiryLevel, todayString } from "@/lib/expiry";

const TODAY = "2026-11-12";

describe("todayString", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(todayString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("daysUntil", () => {
  it("counts days forward and backward", () => {
    expect(daysUntil("2026-11-12", TODAY)).toBe(0);
    expect(daysUntil("2026-11-15", TODAY)).toBe(3);
    expect(daysUntil("2026-11-10", TODAY)).toBe(-2);
  });

  it("works across month and year boundaries", () => {
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
  });
});

describe("expiryLevel", () => {
  it("marks past dates as expired", () => {
    expect(expiryLevel("2026-11-11", TODAY)).toBe("expired");
  });

  it("marks today up to 3 days ahead as soon", () => {
    expect(expiryLevel("2026-11-12", TODAY)).toBe("soon");
    expect(expiryLevel("2026-11-15", TODAY)).toBe("soon");
  });

  it("marks later dates as ok", () => {
    expect(expiryLevel("2026-11-16", TODAY)).toBe("ok");
  });
});

describe("expiryLabel", () => {
  it("gives readable Estonian labels", () => {
    expect(expiryLabel("2026-11-09", TODAY)).toBe("Aegus 3 päeva tagasi");
    expect(expiryLabel("2026-11-11", TODAY)).toBe("Aegus eile");
    expect(expiryLabel("2026-11-12", TODAY)).toBe("Aegub täna");
    expect(expiryLabel("2026-11-13", TODAY)).toBe("Aegub homme");
    expect(expiryLabel("2026-11-17", TODAY)).toBe("5 päeva pärast");
  });
});
