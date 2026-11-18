"use client";

import { useState } from "react";
import DeleteItemButton from "@/components/DeleteItemButton";
import EditItemForm from "@/components/EditItemForm";
import type { ListItem } from "@/components/ItemList";
import ItemStatusButtons from "@/components/ItemStatusButtons";
import PartialUseForm from "@/components/PartialUseForm";

type Panel = "partial" | "edit" | null;

// Buttons on one item card. "Osaliselt" and "Muuda" open a small form below the item.
export default function ItemActions({ item }: { item: ListItem }) {
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);
  const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));

  return (
    <>
      <div className="item-controls">
        <ItemStatusButtons itemId={item.id} />
        {item.quantity !== null && (
          <button
            type="button"
            className="btn btn-small"
            aria-expanded={panel === "partial"}
            onClick={() => toggle("partial")}
          >
            Osaliselt
          </button>
        )}
        <button type="button" className="btn btn-small" aria-expanded={panel === "edit"} onClick={() => toggle("edit")}>
          Muuda
        </button>
        <DeleteItemButton itemId={item.id} name={item.name} />
      </div>

      {panel === "partial" && <PartialUseForm item={item} onDone={close} />}
      {panel === "edit" && <EditItemForm item={item} onDone={close} />}
    </>
  );
}
