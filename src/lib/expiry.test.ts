import { describe, expect, it } from "vitest";
import { addDays, daysUntil, expiryLabel, expiryLevel, todayString, weekStart } from "@/lib/expiry";

const TODAY = "2026-11-12";

describe("todayString", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(todayString(new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
  });

  it("uses Estonian time, not the server's UTC date", () => {
    // 23:30 UTC on Jan 4 is already 01:30 on Jan 5 in Tallinn.
    expect(todayString(new Date("2026-01-04T23:30:00Z"))).toBe("2026-01-05");
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

describe("addDays", () => {
  it("moves forward and backward across month and year boundaries", () => {
    expect(addDays("2026-11-12", 3)).toBe("2026-11-15");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 7)).toBe("2027-01-07");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("weekStart", () => {
  it("returns the Monday of the week", () => {
    expect(weekStart("2026-11-16")).toBe("2026-11-16"); // Monday
    expect(weekStart("2026-11-18")).toBe("2026-11-16"); // Wednesday
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // Sunday
  });
});
