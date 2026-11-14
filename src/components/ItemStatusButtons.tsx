"use client";

import { useActionState } from "react";
import { setItemStatus } from "@/app/items/actions";
import { initialActionState } from "@/lib/items/action-state";

export default function ItemStatusButtons({ itemId }: { itemId: string }) {
  const [state, formAction, pending] = useActionState(setItemStatus, initialActionState);

  return (
    <form action={formAction} className="item-actions">
      <input type="hidden" name="item_id" value={itemId} />
      <button name="status" value="used" className="btn btn-primary" disabled={pending}>
        Söödud
      </button>
      <button name="status" value="wasted" className="btn" disabled={pending}>
        Ära visatud
      </button>
      {!state.ok && state.message && <span className="field-error">{state.message}</span>}
    </form>
  );
}
