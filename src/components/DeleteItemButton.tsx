"use client";

import { useActionState } from "react";
import { deleteItem } from "@/app/items/actions";
import { initialActionState } from "@/lib/items/action-state";

// Deleting cannot be undone (unlike Söödud / Ära visatud), so it asks first.
export default function DeleteItemButton({
  itemId,
  name,
  className = "btn btn-small btn-danger",
}: {
  itemId: string;
  name: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(deleteItem, initialActionState);

  return (
    <form action={formAction}>
      <input type="hidden" name="item_id" value={itemId} />
      <button
        className={className}
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(`Kustutada „${name}“? Seda ei saa tagasi võtta.`)) event.preventDefault();
        }}
      >
        Kustuta
      </button>
      {!state.ok && state.message && <span className="field-error"> {state.message}</span>}
    </form>
  );
}
