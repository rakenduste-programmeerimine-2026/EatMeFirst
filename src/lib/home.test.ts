import { describe, expect, it } from "vitest";
import { countItems, groupByExpiry, homeSummary, stampDate, wasteComparison } from "@/lib/home";

const TODAY = "2026-11-18";
const item = (name: string, expiry_date: string) => ({ name, expiry_date });

describe("groupByExpiry", () => {
  it("splits items into expired, soon (up to 3 days) and later, keeping their order", () => {
    const groups = groupByExpiry(
      [
        item("Hapukoor", "2026-11-15"),
        item("Hakkliha", "2026-11-19"),
        item("Piim", "2026-11-21"),
        item("Kurk", "2026-11-25"),
        item("Munad", "2026-12-02"),
      ],
      TODAY,
    );
    expect(groups.expired.map((i) => i.name)).toEqual(["Hapukoor"]);
    expect(groups.soon.map((i) => i.name)).toEqual(["Hakkliha", "Piim"]);
    expect(groups.later.map((i) => i.name)).toEqual(["Kurk", "Munad"]);
  });

  it("counts today as soon, not expired", () => {
    expect(groupByExpiry([item("Jogurt", TODAY)], TODAY).soon).toHaveLength(1);
  });
});

describe("stampDate", () => {
  it("prints day and month", () => {
    expect(stampDate("2026-11-19")).toBe("19.11");
    expect(stampDate("2027-01-02")).toBe("02.01");
  });
});

describe("countItems", () => {
  it("uses the Estonian singular and plural", () => {
    expect(countItems(1)).toBe("1 toode");
    expect(countItems(3)).toBe("3 toodet");
  });
});

describe("homeSummary", () => {
  it("names the item to eat next and counts expired ones", () => {
    expect(homeSummary([item("Hapukoor", "2026-11-15"), item("Hakkliha", "2026-11-19")], TODAY)).toBe(
      "Hakkliha aegub homme. 1 toode on juba aegunud.",
    );
  });

  it("says today and later days too", () => {
    expect(homeSummary([item("Jogurt", TODAY)], TODAY)).toBe("Jogurt aegub täna.");
    expect(homeSummary([item("Kurk", "2026-11-25")], TODAY)).toBe("Kurk aegub 7 päeva pärast.");
  });

  it("only counts expired items when nothing else is left", () => {
    expect(homeSummary([item("A", "2026-11-10"), item("B", "2026-11-17")], TODAY)).toBe("2 toodet on juba aegunud.");
  });

  it("is empty for an empty fridge", () => {
    expect(homeSummary([], TODAY)).toBe("");
  });
});

describe("wasteComparison", () => {
  it("says how much less, more or the same was thrown away", () => {
    expect(wasteComparison(1, 4)).toBe("3 vähem ära visatud kui eelmisel nädalal (4).");
    expect(wasteComparison(5, 2)).toBe("3 rohkem ära visatud kui eelmisel nädalal (2).");
    expect(wasteComparison(2, 2)).toBe("Sama palju ära visatud kui eelmisel nädalal (2).");
  });

  it("has nothing to say without last week's numbers", () => {
    expect(wasteComparison(1, null)).toBeNull();
  });
});
