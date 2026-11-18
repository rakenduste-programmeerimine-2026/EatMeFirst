// Validation for fridge invite codes typed in by a user.
//
// Generated codes are 16 hex characters, and the database rejects anything
// shorter (fridges_invite_code_min_length). This only checks the shape, so
// obviously wrong input never reaches join_fridge or counts as a failed attempt.

export const INVITE_CODE_MIN = 16;
export const INVITE_CODE_MAX = 64;

export type JoinInput = { invite_code: string };

export type InviteCodeResult = { ok: true; code: string } | { ok: false; error: string };

export function parseInviteCode(value: unknown): InviteCodeResult {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, error: "Sisesta kutsekood." };
  }

  // Codes are case-sensitive in the database, so only surrounding spaces are removed.
  const code = value.trim();
  if (code.length < INVITE_CODE_MIN || code.length > INVITE_CODE_MAX || /\s/.test(code)) {
    return { ok: false, error: `Kutsekood on ${INVITE_CODE_MIN} märki pikk, ilma tühikuteta.` };
  }

  return { ok: true, code };
}
