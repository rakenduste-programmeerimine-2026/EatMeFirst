"use client";

import { useActionState } from "react";
import { restoreItem } from "@/app/items/actions";
import { initialActionState } from "@/lib/items/action-state";

export default function RestoreItemButton({ itemId }: { itemId: string }) {
  const [state, formAction, pending] = useActionState(restoreItem, initialActionState);

  return (
    <form action={formAction}>
      <input type="hidden" name="item_id" value={itemId} />
      <button className="btn btn-small" disabled={pending}>
        {pending ? "Võtan tagasi…" : "Võta tagasi"}
      </button>
      {!state.ok && state.message && <span className="field-error"> {state.message}</span>}
    </form>
  );
}
