"use client";

import { useEffect, useRef, useState } from "react";
import DeleteItemButton from "@/components/DeleteItemButton";
import EditItemForm from "@/components/EditItemForm";
import type { ListItem } from "@/components/ItemList";
import ItemStatusButtons from "@/components/ItemStatusButtons";
import PartialUseForm from "@/components/PartialUseForm";

type Panel = "partial" | "edit" | null;

// One clear action per item ("Viska ära" for expired food, "Söödud" otherwise) and
// the rest in a "⋯" menu. "Kasutasin osa" and "Muuda" open a small form below the item.
export default function ItemActions({ item, expired }: { item: ListItem; expired: boolean }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  const main = expired ? "wasted" : "used";
  const other = expired ? "used" : "wasted";

  // Close the menu on a click outside it, like other menus (Escape: onKeyDown below).
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  function openPanel(next: Exclude<Panel, null>) {
    if (menu.current) menu.current.open = false;
    setPanel(next);
  }

  return (
    <>
      <div className="item-controls">
        <ItemStatusButtons itemId={item.id} status={main} />
        <details
          ref={menu}
          className="item-menu"
          onToggle={(event) => setMenuOpen(event.currentTarget.open)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && event.currentTarget.open) {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary aria-label={`Veel valikuid: ${item.name}`}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </summary>
          <div className="item-menu-list">
            <ItemStatusButtons itemId={item.id} status={other} variant="menu" />
            {item.quantity !== null && (
              <button type="button" className="menu-item" onClick={() => openPanel("partial")}>
                Kasutasin osa
              </button>
            )}
            <button type="button" className="menu-item" onClick={() => openPanel("edit")}>
              Muuda
            </button>
            <DeleteItemButton itemId={item.id} name={item.name} className="menu-item menu-danger" />
          </div>
        </details>
      </div>

      {panel === "partial" && <PartialUseForm item={item} onDone={() => setPanel(null)} />}
      {panel === "edit" && <EditItemForm item={item} onDone={() => setPanel(null)} />}
    </>
  );
}
