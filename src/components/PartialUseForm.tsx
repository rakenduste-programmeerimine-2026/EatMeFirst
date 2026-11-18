"use client";

import { useActionState } from "react";
import { markPartialUse } from "@/app/items/actions";
import type { ListItem } from "@/components/ItemList";
import { initialActionState, type ActionState } from "@/lib/items/action-state";
import type { PartialUse } from "@/lib/items/validation";

// "I ate 3 of the 10 eggs": the rest stays in the list, the used part goes to the stats.
export default function PartialUseForm({ item, onDone }: { item: ListItem; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState<PartialUse>, formData: FormData) => {
      const result = await markPartialUse(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="form item-panel">
      <input type="hidden" name="item_id" value={item.id} />
      <label>
        Kui palju kasutasid?{" "}
        {item.quantity !== null && (
          <span className="muted">
            (praegu {item.quantity.toLocaleString("et-EE")} {item.unit})
          </span>
        )}
        <input
          name="amount"
          type="text"
          inputMode="decimal"
          pattern="\d+([.,]\d+)?"
          required
          autoFocus
          placeholder="nt 3"
        />
        {errors.amount && <span className="field-error">{errors.amount}</span>}
      </label>

      <div className="row">
        <button name="status" value="used" className="btn btn-primary" disabled={pending}>
          Söödud
        </button>
        <button name="status" value="wasted" className="btn" disabled={pending}>
          Ära visatud
        </button>
        <button type="button" className="btn" onClick={onDone}>
          Loobu
        </button>
      </div>

      {!state.ok && state.message && <p className="alert alert-error">{state.message}</p>}
    </form>
  );
}
