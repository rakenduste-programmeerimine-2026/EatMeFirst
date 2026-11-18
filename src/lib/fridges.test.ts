import { describe, expect, it } from "vitest";
import { fridgeLabel, pickFridge, type MyFridge } from "@/lib/fridges";

const shared: MyFridge = { id: "a", name: "Minu külmkapp", role: "member" };
const own: MyFridge = { id: "b", name: "Minu külmkapp", role: "owner" };

describe("pickFridge", () => {
  it("returns the requested fridge when the user belongs to it", () => {
    expect(pickFridge([shared, own], "b")).toBe(own);
  });

  it("falls back to the first fridge for unknown or missing ids", () => {
    expect(pickFridge([shared, own], "someone-elses-fridge")).toBe(shared);
    expect(pickFridge([shared, own])).toBe(shared);
  });

  it("returns undefined when the user has no fridges", () => {
    expect(pickFridge([], "a")).toBeUndefined();
  });
});

describe("fridgeLabel", () => {
  it("marks fridges the user joined as shared", () => {
    expect(fridgeLabel(shared)).toBe("Minu külmkapp (jagatud)");
    expect(fridgeLabel(own)).toBe("Minu külmkapp");
  });
});
