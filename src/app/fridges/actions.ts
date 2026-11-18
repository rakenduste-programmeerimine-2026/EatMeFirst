"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseInviteCode, type JoinInput } from "@/lib/invite-code";
import type { ActionState } from "@/lib/items/action-state";
import { createClient } from "@/lib/supabase/server";

// Messages raised by join_fridge (supabase/migrations/*_rate_limit_join_fridge.sql).
const RATE_LIMITED = "too many invalid invite codes";
const NOT_AUTHENTICATED = "not authenticated";

// Joins a flatmate's fridge with its invite code and opens that fridge.
// The database adds the membership and limits wrong guesses (5 per 10 minutes).
// Form field: invite_code
export async function joinFridge(_prev: ActionState<JoinInput>, formData: FormData): Promise<ActionState<JoinInput>> {
  const parsed = parseInviteCode(formData.get("invite_code"));
  if (!parsed.ok) return { ok: false, fieldErrors: { invite_code: parsed.error } };

  const supabase = await createClient();
  const { data: fridgeId, error } = await supabase.rpc("join_fridge", { p_invite_code: parsed.code });

  if (error) {
    if (error.message.includes(RATE_LIMITED)) {
      return { ok: false, message: "Liiga palju valesid katseid. Proovi 10 minuti pärast uuesti." };
    }
    if (error.message.includes(NOT_AUTHENTICATED)) {
      return { ok: false, message: "Logi uuesti sisse ja proovi siis uuesti." };
    }
    console.error("[fridges] join_fridge failed", error.code, error.message);
    return { ok: false, message: "Liitumine ebaõnnestus. Proovi uuesti." };
  }

  // A wrong code returns null instead of an error (the generated type says string).
  if (!fridgeId) return { ok: false, fieldErrors: { invite_code: "Vale kutsekood." } };

  // The new fridge shows up on the fridges page and in the home page switcher.
  revalidatePath("/", "layout");
  redirect(`/?fridge=${encodeURIComponent(fridgeId)}`);
}
