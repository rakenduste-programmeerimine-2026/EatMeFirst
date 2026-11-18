import { describe, expect, it } from "vitest";
import { parseInviteCode } from "@/lib/invite-code";

const CODE = "c81c1557fe3b4830";

describe("parseInviteCode", () => {
  it("accepts a 16-character code", () => {
    expect(parseInviteCode(CODE)).toEqual({ ok: true, code: CODE });
  });

  it("trims surrounding spaces, e.g. from copy-paste", () => {
    expect(parseInviteCode(`  ${CODE}\n`)).toEqual({ ok: true, code: CODE });
  });

  it("keeps the case as typed, because codes are case-sensitive", () => {
    expect(parseInviteCode("C81C1557FE3B4830")).toEqual({ ok: true, code: "C81C1557FE3B4830" });
  });

  it("asks for a code when it is missing or empty", () => {
    for (const value of [undefined, null, "", "   "]) {
      expect(parseInviteCode(value)).toEqual({ ok: false, error: "Sisesta kutsekood." });
    }
  });

  it("rejects codes that are too short, too long or contain spaces", () => {
    for (const value of ["ab12cd34", CODE.slice(0, 15), "x".repeat(65), "c81c1557 fe3b4830"]) {
      expect(parseInviteCode(value).ok, value).toBe(false);
    }
  });

  it("rejects non-string values such as File uploads", () => {
    expect(parseInviteCode(new Blob([CODE])).ok).toBe(false);
  });
});
