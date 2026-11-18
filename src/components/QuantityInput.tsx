"use client";

import { QUANTITY_PATTERN, quantityMessage } from "@/lib/quantity";

// Quantity field that explains a wrong value in Estonian instead of the browser's
// English "Please match the requested format." Can be reused in other item forms.
export default function QuantityInput({ defaultValue, required }: { defaultValue?: string; required?: boolean }) {
  return (
    <input
      name="quantity"
      type="text"
      inputMode="decimal"
      pattern={QUANTITY_PATTERN}
      placeholder="1"
      defaultValue={defaultValue}
      required={required}
      onInvalid={(event) => event.currentTarget.setCustomValidity(quantityMessage(event.currentTarget.validity))}
      onInput={(event) => event.currentTarget.setCustomValidity("")}
    />
  );
}
