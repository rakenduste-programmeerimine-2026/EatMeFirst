"use client";

import { useState } from "react";

// Copies a fridge's invite code so it can be pasted into a chat message.
export default function CopyCodeButton({ code }: { code: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch {
      // Clipboard can be blocked by the browser; the code is still selectable in the field.
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <button type="button" className="btn" onClick={copy}>
      {status === "copied" ? "Kopeeritud!" : status === "failed" ? "Kopeeri käsitsi" : "Kopeeri"}
    </button>
  );
}
