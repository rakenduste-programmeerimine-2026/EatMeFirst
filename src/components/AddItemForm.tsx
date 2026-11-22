"use client";

import { useActionState, useRef } from "react";
import { addItem } from "@/app/items/actions";
import QuantityInput from "@/components/QuantityInput";
import { addDays, todayString } from "@/lib/expiry";
import { initialActionState } from "@/lib/items/action-state";
import { QUANTITY_HINT } from "@/lib/quantity";

// Quick picks for food without a printed date (vegetables, leftovers).
const QUICK_DATES = [
  { label: "Täna", days: 0 },
  { label: "Homme", days: 1 },
  { label: "+3 päeva", days: 3 },
  { label: "+1 nädal", days: 7 },
];
const UNITS = ["tk", "g", "kg", "l"];

type AddState = Parameters<typeof addItem>[0];

// The add-item form inside the bottom sheet (AddItemSheet). "Lisa külmkappi" closes the
// sheet after saving; "Lisa ja lisa järgmine" keeps it open for the next item.
export default function AddItemForm({ fridgeId, onClose }: { fridgeId: string; onClose: () => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: AddState, formData: FormData) => {
    const result = await addItem(prev, formData);
    if (result.ok && formData.get("then") === "close") onClose();
    if (result.ok && formData.get("then") === "next") {
      form.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
    }
    return result;
  }, initialActionState);
  const errors = state.fieldErrors ?? {};

  function setField(name: string, value: string) {
    const input = form.current?.querySelector<HTMLInputElement>(`input[name=${name}]`);
    if (input) input.value = value;
  }

  return (
    <form ref={form} action={formAction} className="form sheet-form">
      <div className="sheet-head">
        <h2 id="add-item-title">Lisa toode</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Sulge">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <input type="hidden" name="fridge_id" value={fridgeId} />

      <label>
        Nimi
        <input name="name" type="text" required maxLength={80} placeholder="nt Piim" />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>

      <fieldset className="field-group">
        <legend>Aegub</legend>
        <div className="quick-dates">
          {QUICK_DATES.map((pick) => (
            <button
              key={pick.days}
              type="button"
              className="chip"
              onClick={() => setField("expiry_date", addDays(todayString(), pick.days))}
            >
              {pick.label}
            </button>
          ))}
        </div>
        <input name="expiry_date" type="date" required defaultValue={todayString()} aria-label="Aegumiskuupäev" />
        {errors.expiry_date && <span className="field-error">{errors.expiry_date}</span>}
      </fieldset>

      <div className="row">
        <label className="quantity-field">
          Kogus
          <QuantityInput />
          {errors.quantity ? (
            <span className="field-error">{errors.quantity}</span>
          ) : (
            <span className="field-hint">{QUANTITY_HINT}</span>
          )}
        </label>
        <fieldset className="field-group">
          <legend>Ühik</legend>
          <input name="unit" type="text" maxLength={20} placeholder="tk, g, l" aria-label="Ühik" />
          <div className="quick-dates">
            {UNITS.map((unit) => (
              <button key={unit} type="button" className="chip" onClick={() => setField("unit", unit)}>
                {unit}
              </button>
            ))}
          </div>
          {errors.unit && <span className="field-error">{errors.unit}</span>}
        </fieldset>
      </div>

      {errors.fridge_id && <p className="alert alert-error">{errors.fridge_id}</p>}
      {state.message && (
        <p className={state.ok ? "alert" : "alert alert-error"} role="status">
          {state.message}
        </p>
      )}

      <div className="sheet-actions">
        <button name="then" value="close" className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Lisan…" : "Lisa külmkappi"}
        </button>
        <button name="then" value="next" className="btn btn-block" disabled={pending}>
          Lisa ja lisa järgmine
        </button>
      </div>
    </form>
  );
}
