"use client";

import { useState, useSyncExternalStore } from "react";
import { resolveTheme, themeCookie, toggleTheme, type Theme } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

// The device's light/dark setting, kept up to date if it changes while the page is open.
function subscribe(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;
const serverPrefersDark = () => false;

// Header button that switches between light and dark. `savedTheme` is the cookie value
// the server read (null = follow the device).
export default function ThemeToggle({ savedTheme }: { savedTheme: Theme | null }) {
  const [saved, setSaved] = useState(savedTheme);
  const systemDark = useSyncExternalStore(subscribe, systemPrefersDark, serverPrefersDark);
  const theme = resolveTheme(saved, systemDark);
  const label = theme === "dark" ? "Lülita hele režiim sisse" : "Lülita tume režiim sisse";

  function toggle() {
    const next = toggleTheme(theme);
    setSaved(next);
    document.documentElement.dataset.theme = next;
    document.cookie = themeCookie(next);
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? (
        // Sun: shown in dark mode, switches to light.
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon: shown in light mode, switches to dark.
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
