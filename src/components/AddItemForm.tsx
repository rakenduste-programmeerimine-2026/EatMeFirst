"use client";

import { useActionState } from "react";
import { addItem } from "@/app/items/actions";
import { todayString } from "@/lib/expiry";
import { initialActionState } from "@/lib/items/action-state";

export default function AddItemForm({ fridgeId }: { fridgeId: string }) {
  const [state, formAction, pending] = useActionState(addItem, initialActionState);
  const errors = state.fieldErrors ?? {};

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
        <input name="expiry_date" type="date" required defaultValue={todayString()} />
        {errors.expiry_date && <span className="field-error">{errors.expiry_date}</span>}
      </label>

      <div className="row">
        <label>
          Kogus
          <input name="quantity" type="text" inputMode="decimal" pattern="\d+([.,]\d+)?" placeholder="1" />
          {errors.quantity && <span className="field-error">{errors.quantity}</span>}
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
