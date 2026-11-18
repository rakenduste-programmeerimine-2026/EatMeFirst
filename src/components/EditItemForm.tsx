"use client";

import { useActionState } from "react";
import { updateItem } from "@/app/items/actions";
import type { ListItem } from "@/components/ItemList";
import { initialActionState, type ActionState } from "@/lib/items/action-state";
import type { ItemUpdate } from "@/lib/items/validation";

// Shows the quantity the way the add form accepts it ("1,5").
function quantityText(quantity: number | null): string {
  return quantity === null ? "" : String(quantity).replace(".", ",");
}

export default function EditItemForm({ item, onDone }: { item: ListItem; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState<ItemUpdate>, formData: FormData) => {
      const result = await updateItem(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="form item-panel">
      <input type="hidden" name="item_id" value={item.id} />
      {/* The add form has no category field yet; keep the current value instead of clearing it. */}
      <input type="hidden" name="category" value={item.category ?? ""} />

      <label>
        Nimi
        <input name="name" type="text" required maxLength={80} defaultValue={item.name} />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>

      <label>
        Aegub
        <input name="expiry_date" type="date" required defaultValue={item.expiry_date} />
        {errors.expiry_date && <span className="field-error">{errors.expiry_date}</span>}
      </label>

      <div className="row">
        <label>
          Kogus
          <input
            name="quantity"
            type="text"
            inputMode="decimal"
            pattern="\d+([.,]\d+)?"
            defaultValue={quantityText(item.quantity)}
          />
          {errors.quantity && <span className="field-error">{errors.quantity}</span>}
        </label>
        <label>
          Ühik
          <input name="unit" type="text" maxLength={20} defaultValue={item.unit ?? ""} />
          {errors.unit && <span className="field-error">{errors.unit}</span>}
        </label>
      </div>

      <div className="row">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Salvestan…" : "Salvesta"}
        </button>
        <button type="button" className="btn" onClick={onDone}>
          Loobu
        </button>
      </div>

      {!state.ok && state.message && <p className="alert alert-error">{state.message}</p>}
    </form>
  );
}
