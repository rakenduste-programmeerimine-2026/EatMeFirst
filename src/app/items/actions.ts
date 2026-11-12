"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/items/action-state";
import { parseNewItem, parseStatusChange, type NewItem, type StatusChange } from "@/lib/items/validation";
import { createClient } from "@/lib/supabase/server";

// Postgres / PostgREST error codes we turn into user-facing messages.
const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";

const GENERIC_ERROR = "Salvestamine ebaõnnestus. Proovi uuesti.";

// Never show raw database errors to the user; log them on the server instead.
function dbErrorMessage(error: { code?: string; message: string }, context: string): string {
  console.error(`[items] ${context} failed`, error.code, error.message);
  if (error.code === INSUFFICIENT_PRIVILEGE) return "Sul pole sellele külmkapile ligipääsu.";
  if (error.code === CHECK_VIOLATION) return "Mõni väli on vigane.";
  return GENERIC_ERROR;
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

// Marks an item as eaten ("used") or thrown away ("wasted").
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

  // RLS hides items from other fridges, so "not yours" and "already marked"
  // both look like zero updated rows.
  if (!data || data.length === 0) return { ok: false, message: "Toodet ei leitud või see on juba märgitud." };

  revalidatePath("/");
  return { ok: true, message: parsed.data.status === "used" ? "Märgitud söödud." : "Märgitud ära visatuks." };
}
