"use client";

import { useActionState } from "react";
import { setItemStatus } from "@/app/items/actions";
import { initialActionState } from "@/lib/items/action-state";

const LABELS = { used: "Söödud", wasted: "Viska ära" };

// One status button: the row's main action, or an entry in the "⋯" menu.
export default function ItemStatusButtons({
  itemId,
  status,
  variant = "row",
}: {
  itemId: string;
  status: "used" | "wasted";
  variant?: "row" | "menu";
}) {
  const [state, formAction, pending] = useActionState(setItemStatus, initialActionState);
  const className =
    variant === "menu"
      ? `menu-item${status === "wasted" ? " menu-danger" : ""}`
      : `btn btn-row${status === "wasted" ? " btn-row-danger" : ""}`;

  return (
    <form action={formAction} className="item-actions">
      <input type="hidden" name="item_id" value={itemId} />
      <button name="status" value={status} className={className} disabled={pending}>
        {status === "used" && variant === "row" && (
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
        {LABELS[status]}
      </button>
      {!state.ok && state.message && <span className="field-error">{state.message}</span>}
    </form>
  );
}
