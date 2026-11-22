"use client";

import { useRef, useState } from "react";
import AddItemForm from "@/components/AddItemForm";

// "+ Lisa toode" bar that stays at the bottom of the screen and opens the add form as a
// bottom sheet, so adding is always one tap away however long the list is.
export default function AddItemSheet({ fridgeId }: { fridgeId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  // A new key on every close starts the next form empty, without the old message.
  const [formKey, setFormKey] = useState(0);

  function open() {
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
  }

  return (
    <>
      <div className="add-bar">
        <button type="button" className="btn btn-primary btn-block btn-large" onClick={open}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Lisa toode
        </button>
      </div>

      <dialog
        ref={dialog}
        className="sheet"
        aria-labelledby="add-item-title"
        onClose={() => setFormKey((key) => key + 1)}
        onClick={(event) => {
          // A click on the dimmed backdrop (the dialog itself, not its content) closes it.
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <AddItemForm key={formKey} fridgeId={fridgeId} onClose={() => dialog.current?.close()} />
      </dialog>
    </>
  );
}
