// Light / dark theme choice. With no saved choice the app follows the device setting
// (prefers-color-scheme); a choice made with the header toggle is kept in a cookie so the
// server can render the right theme straight away, without a flash of the wrong one.

export type Theme = "light" | "dark";

export const THEME_COOKIE = "theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

// The saved choice, or null when nothing (valid) is saved.
export function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

// The theme actually shown: the saved choice, otherwise the device setting.
export function resolveTheme(saved: Theme | null, systemDark: boolean): Theme {
  return saved ?? (systemDark ? "dark" : "light");
}

export function toggleTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

// Value for document.cookie that remembers the choice for a year.
export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
}
