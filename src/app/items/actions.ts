"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/items/action-state";
import {
  parseItemRef,
  parseItemUpdate,
  parseNewItem,
  parsePartialUse,
  parseStatusChange,
  type FinalStatus,
  type ItemRef,
  type ItemUpdate,
  type NewItem,
  type PartialUse,
  type StatusChange,
} from "@/lib/items/validation";
import { createClient } from "@/lib/supabase/server";

// Postgres / PostgREST error codes we turn into user-facing messages.
const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";

const GENERIC_ERROR = "Salvestamine ebaõnnestus. Proovi uuesti.";
// RLS hides items from other fridges, so "not yours" and "not in that state"
// both look like zero matching rows.
const NOT_ACTIVE = "Toodet ei leitud või see on juba märgitud.";
const CHANGED_MEANWHILE = "Toodet muudeti vahepeal. Värskenda lehte ja proovi uuesti.";

// Never show raw database errors to the user; log them on the server instead.
function dbErrorMessage(error: { code?: string; message: string }, context: string): string {
  console.error(`[items] ${context} failed`, error.code, error.message);
  if (error.code === INSUFFICIENT_PRIVILEGE) return "Sul pole sellele külmkapile ligipääsu.";
  if (error.code === CHECK_VIOLATION) return "Mõni väli on vigane.";
  return GENERIC_ERROR;
}

function statusMessage(status: FinalStatus): string {
  return status === "used" ? "Märgitud söödud." : "Märgitud ära visatuks.";
}

// Avoids float noise such as 1.5 - 0.1 = 1.4000000000000001.
function roundQuantity(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function formatAmount(amount: number, unit: string | null): string {
  const number = String(amount).replace(".", ",");
  return unit ? `${number} ${unit}` : number;
}

// Adds an item to a fridge. `added_by` is filled in by the database and
// RLS rejects fridges the user is not a member of.
// Form fields: fridge_id, name, expiry_date, quantity?, unit?, category?
export async function addItem(_prev: ActionState<NewItem>, formData: FormData): Promise<ActionState<NewItem>> {
  const parsed = parseNewItem(Object.fromEntries(formData));
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors };

  const supabase = await createClient();
  const { error } = await supabase.from("items").insert(parsed.data);
  if (error) return { ok: false, message: dbErrorMessage(error, "insert") };

  revalidatePath("/");
  return { ok: true, message: "Toode lisatud." };
}

// Edits an active item. All fields are replaced, so an empty quantity/unit/category clears it.
// Form fields: item_id, name, expiry_date, quantity?, unit?, category?
export async function updateItem(_prev: ActionState<ItemUpdate>, formData: FormData): Promise<ActionState<ItemUpdate>> {
  const parsed = parseItemUpdate(Object.fromEntries(formData));
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors };

  const { item_id: itemId, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .update(fields)
    .eq("id", itemId)
    .eq("status", "active")
    .select("id");
  if (error) return { ok: false, message: dbErrorMessage(error, "update") };
  if (!data || data.length === 0) return { ok: false, message: NOT_ACTIVE };

  revalidatePath("/");
  return { ok: true, message: "Muudatused salvestatud.", itemId };
}

// Deletes an item, e.g. one added by mistake. It also disappears from the stats.
// Form fields: item_id
export async function deleteItem(_prev: ActionState<ItemRef>, formData: FormData): Promise<ActionState<ItemRef>> {
  const parsed = parseItemRef(Object.fromEntries(formData));
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("items").delete().eq("id", parsed.data.item_id).select("id");
  if (error) return { ok: false, message: dbErrorMessage(error, "delete") };
  if (!data || data.length === 0) return { ok: false, message: "Toodet ei leitud." };

  revalidatePath("/");
  return { ok: true, message: "Toode kustutatud." };
}

// Marks a whole item as eaten ("used") or thrown away ("wasted").
// Form fields: item_id, status
export async function setItemStatus(
  _prev: ActionState<StatusChange>,
  formData: FormData,
): Promise<ActionState<StatusChange>> {
  const parsed = parseStatusChange(Object.fromEntries(formData));
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.item_id)
    .eq("status", "active")
    .select("id");
  if (error) return { ok: false, message: dbErrorMessage(error, "status update") };
  if (!data || data.length === 0) return { ok: false, message: NOT_ACTIVE };

  revalidatePath("/");
  return { ok: true, message: statusMessage(parsed.data.status), itemId: parsed.data.item_id };
}

// "3 of 10 eggs eaten": the active item keeps 7 and a separate used/wasted row
// with 3 is added, so the weekly stats count it and the rest can be marked later.
// Using the whole amount (or more) marks the whole item instead.
// Form fields: item_id, amount, status
export async function markPartialUse(_prev: ActionState<PartialUse>, formData: FormData): Promise<ActionState<PartialUse>> {
  const parsed = parsePartialUse(Object.fromEntries(formData));
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors };

  const { item_id: itemId, amount, status } = parsed.data;
  const supabase = await createClient();

  const { data: item, error: readError } = await supabase
    .from("items")
    .select("fridge_id, name, category, unit, expiry_date, quantity")
    .eq("id", itemId)
    .eq("status", "active")
    .maybeSingle();
  if (readError) return { ok: false, message: dbErrorMessage(readError, "partial use read") };
  if (!item) return { ok: false, message: NOT_ACTIVE };
  if (item.quantity === null) {
    return { ok: false, fieldErrors: { amount: "Sellel tootel pole kogust. Märgi kogu toode söödud või ära visatuks." } };
  }

  if (amount >= item.quantity) {
    const { data, error } = await supabase
      .from("items")
      .update({ status })
      .eq("id", itemId)
      .eq("status", "active")
      .select("id");
    if (error) return { ok: false, message: dbErrorMessage(error, "partial use status") };
    if (!data || data.length === 0) return { ok: false, message: CHANGED_MEANWHILE };

    revalidatePath("/");
    return { ok: true, message: statusMessage(status), itemId };
  }

  // Step 1: take the amount off. Matching the old quantity means this only
  // succeeds if nobody changed the item in between.
  const remaining = roundQuantity(item.quantity - amount);
  const { data: reduced, error: reduceError } = await supabase
    .from("items")
    .update({ quantity: remaining })
    .eq("id", itemId)
    .eq("status", "active")
    .eq("quantity", item.quantity)
    .select("id");
  if (reduceError) return { ok: false, message: dbErrorMessage(reduceError, "partial use reduce") };
  if (!reduced || reduced.length === 0) return { ok: false, message: CHANGED_MEANWHILE };

  // Step 2: record the used part. The database sets added_by and status_changed_at.
  const { data: usedRow, error: insertError } = await supabase
    .from("items")
    .insert({
      fridge_id: item.fridge_id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      expiry_date: item.expiry_date,
      quantity: amount,
      status,
    })
    .select("id")
    .single();

  if (insertError || !usedRow) {
    // Put the amount back so nothing is lost.
    const { error: rollbackError } = await supabase
      .from("items")
      .update({ quantity: item.quantity })
      .eq("id", itemId)
      .eq("quantity", remaining);
    if (rollbackError) console.error("[items] partial use rollback failed", rollbackError.code, rollbackError.message);
    return { ok: false, message: insertError ? dbErrorMessage(insertError, "partial use insert") : GENERIC_ERROR };
  }

  revalidatePath("/");
  const verb = status === "used" ? "söödud" : "ära visatud";
  return {
    ok: true,
    message: `${formatAmount(amount, item.unit)} ${verb}, alles ${formatAmount(remaining, item.unit)}.`,
    itemId: usedRow.id,
  };
}

// Undoes "Söödud" / "Ära visatud": the item becomes active again and drops out
// of the stats (the database clears status_changed_at). If a matching active
// item exists (the rest after a partial use), the amount is added back to it
// instead of leaving two rows with the same product.
// Form fields: item_id
export async function restoreItem(_prev: ActionState<ItemRef>, formData: FormData): Promise<ActionState<ItemRef>> {
  const parsed = parseItemRef(Object.fromEntries(formData));
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors };

  const itemId = parsed.data.item_id;
  const supabase = await createClient();

  const { data: item, error: readError } = await supabase
    .from("items")
    .select("fridge_id, name, category, unit, expiry_date, quantity, status")
    .eq("id", itemId)
    .neq("status", "active")
    .maybeSingle();
  if (readError) return { ok: false, message: dbErrorMessage(readError, "restore read") };
  if (!item) return { ok: false, message: "Toodet ei leitud või see on juba aktiivne." };

  if (item.quantity !== null) {
    let query = supabase
      .from("items")
      .select("id, quantity")
      .eq("fridge_id", item.fridge_id)
      .eq("status", "active")
      .eq("name", item.name)
      .eq("expiry_date", item.expiry_date)
      .not("quantity", "is", null);
    query = item.unit === null ? query.is("unit", null) : query.eq("unit", item.unit);
    query = item.category === null ? query.is("category", null) : query.eq("category", item.category);

    const { data: matches, error: matchError } = await query.limit(1);
    if (matchError) return { ok: false, message: dbErrorMessage(matchError, "restore match") };

    const match = matches?.[0];
    if (match && match.quantity !== null) {
      const merged = roundQuantity(match.quantity + item.quantity);
      const { data: grown, error: growError } = await supabase
        .from("items")
        .update({ quantity: merged })
        .eq("id", match.id)
        .eq("status", "active")
        .eq("quantity", match.quantity)
        .select("id");
      if (growError) return { ok: false, message: dbErrorMessage(growError, "restore merge") };

      if (grown && grown.length > 0) {
        const { data: removed, error: deleteError } = await supabase
          .from("items")
          .delete()
          .eq("id", itemId)
          .eq("status", item.status)
          .select("id");

        if (deleteError || !removed || removed.length === 0) {
          // Undo the merge so the amount is not counted twice.
          const { error: rollbackError } = await supabase
            .from("items")
            .update({ quantity: match.quantity })
            .eq("id", match.id)
            .eq("quantity", merged);
          if (rollbackError) console.error("[items] restore rollback failed", rollbackError.code, rollbackError.message);
          return { ok: false, message: deleteError ? dbErrorMessage(deleteError, "restore delete") : CHANGED_MEANWHILE };
        }

        revalidatePath("/");
        return { ok: true, message: "Tagasi võetud.", itemId: match.id };
      }
      // The matching item changed in between: restore this row on its own below.
    }
  }

  const { data, error } = await supabase
    .from("items")
    .update({ status: "active" })
    .eq("id", itemId)
    .eq("status", item.status)
    .select("id");
  if (error) return { ok: false, message: dbErrorMessage(error, "restore") };
  if (!data || data.length === 0) return { ok: false, message: CHANGED_MEANWHILE };

  revalidatePath("/");
  return { ok: true, message: "Tagasi võetud.", itemId };
}
