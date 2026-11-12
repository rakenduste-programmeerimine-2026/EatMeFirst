"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(readCredentials(formData));

  if (error) {
    redirect("/login?error=" + encodeURIComponent("Vale e-post või parool."));
  }
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const displayName = String(formData.get("display_name") ?? "").trim();

  const { data, error } = await supabase.auth.signUp({
    ...readCredentials(formData),
    options: { data: displayName ? { display_name: displayName } : {} },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }
  // With email confirmation on, Supabase returns no session until the link is clicked.
  if (!data.session) {
    redirect("/login?message=" + encodeURIComponent("Kinnita konto e-postis saadetud lingiga ja logi siis sisse."));
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
