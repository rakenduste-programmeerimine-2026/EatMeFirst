"use client";

import { useActionState, useState } from "react";
import { joinFridge } from "@/app/fridges/actions";
import { INVITE_CODE_MAX } from "@/lib/invite-code";
import { initialActionState } from "@/lib/items/action-state";

// Join a flatmate's or family member's fridge with the code they sent you.
// On success joinFridge opens that fridge on the home page. Empty and too short codes
// are left to joinFridge on purpose: it answers in Estonian and does not count them as
// failed attempts, while the browser's own required/minLength messages would be English.
export default function JoinFridgeForm() {
  const [state, formAction, pending] = useActionState(joinFridge, initialActionState);
  const error = state.fieldErrors?.invite_code;
  // Kept in state so a mistyped code stays in the field to fix instead of being cleared.
  const [code, setCode] = useState("");

  return (
    <form action={formAction} className="card form">
      <h2>Liitu külmkapiga</h2>
      <p className="muted">Kas keegi saatis sulle kutsekoodi? Sisesta see siia, et näha ja täita sama külmkappi.</p>
      <label>
        Kutsekood
        <input
          name="invite_code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          maxLength={INVITE_CODE_MAX}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nt c81c1557fe3b4830"
        />
        {error && <span className="field-error">{error}</span>}
      </label>
      {state.message && <p className="alert alert-error">{state.message}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Liitun…" : "Liitu"}
      </button>
    </form>
  );
}
