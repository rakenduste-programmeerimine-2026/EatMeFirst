// Shared rules for quantity fields in forms (number with an optional decimal comma or point).
// The server checks the same thing again in lib/items/validation.ts.

export const QUANTITY_PATTERN = "\\d+([.,]\\d+)?";
export const QUANTITY_HINT = "Number, nt 1 või 0,5";

// Estonian message for the browser's built-in check, which would otherwise show its own
// English text such as "Please match the requested format." An empty string means valid.
export function quantityMessage(validity: { valueMissing: boolean; patternMismatch: boolean }): string {
  if (validity.valueMissing) return "Sisesta kogus, nt 1 või 0,5.";
  if (validity.patternMismatch) return "Kirjuta kogus numbriga, nt 1 või 0,5.";
  return "";
}
