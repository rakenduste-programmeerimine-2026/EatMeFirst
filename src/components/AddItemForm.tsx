"use client";

import { useActionState, useRef } from "react";
import { addItem } from "@/app/items/actions";
import QuantityInput from "@/components/QuantityInput";
import { addDays, todayString } from "@/lib/expiry";
import { initialActionState } from "@/lib/items/action-state";
import { QUANTITY_HINT } from "@/lib/quantity";

// Quick picks for food without a printed date (vegetables, leftovers).
const QUICK_DATES = [
  { label: "Homme", days: 1 },
  { label: "+3 päeva", days: 3 },
  { label: "+1 nädal", days: 7 },
];

export default function AddItemForm({ fridgeId }: { fridgeId: string }) {
  const [state, formAction, pending] = useActionState(addItem, initialActionState);
  const errors = state.fieldErrors ?? {};
  const dateInput = useRef<HTMLInputElement>(null);

  function setExpiry(days: number) {
    if (dateInput.current) dateInput.current.value = addDays(todayString(), days);
  }

  return (
    <form action={formAction} className="card form">
      <h2>Lisa toode</h2>
      <input type="hidden" name="fridge_id" value={fridgeId} />

      <label>
        Nimi
        <input name="name" type="text" required maxLength={80} placeholder="nt Piim" />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>

      <label>
        Aegub
        <input ref={dateInput} name="expiry_date" type="date" required defaultValue={todayString()} />
        {errors.expiry_date && <span className="field-error">{errors.expiry_date}</span>}
      </label>
      <div className="quick-dates">
        {QUICK_DATES.map((pick) => (
          <button key={pick.days} type="button" className="chip" onClick={() => setExpiry(pick.days)}>
            {pick.label}
          </button>
        ))}
      </div>

      <div className="row">
        <label>
          Kogus
          <QuantityInput />
          {errors.quantity ? (
            <span className="field-error">{errors.quantity}</span>
          ) : (
            <span className="field-hint">{QUANTITY_HINT}</span>
          )}
        </label>
        <label>
          Ühik
          <input name="unit" type="text" maxLength={20} placeholder="tk, g, l" />
          {errors.unit && <span className="field-error">{errors.unit}</span>}
        </label>
      </div>

      {errors.fridge_id && <p className="alert alert-error">{errors.fridge_id}</p>}
      {state.message && <p className={state.ok ? "alert" : "alert alert-error"}>{state.message}</p>}

      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Lisan…" : "Lisa"}
      </button>
    </form>
  );
}
