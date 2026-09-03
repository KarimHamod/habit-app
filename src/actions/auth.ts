"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

export type AuthActionState = {
  error?: string;
  message?: string;
};

/**
 * Public deployments are reachable by anyone, so sign-up is gated to an
 * explicit allow-list. Unset (local dev, by default) leaves sign-up open;
 * set ALLOWED_SIGNUP_EMAILS in the hosting env to lock it down.
 */
function isEmailAllowedToSignUp(email: string): boolean {
  const allowList = process.env.ALLOWED_SIGNUP_EMAILS;
  if (!allowList) return true;

  const normalized = email.trim().toLowerCase();
  return allowList
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password" };
  }

  redirect("/today");
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!isEmailAllowedToSignUp(parsed.data.email)) {
    return { error: "Sign-ups are currently invite-only." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return {
      error:
        error.message === "User already registered"
          ? error.message
          : "Couldn't create your account",
    };
  }

  if (!data.session) {
    return {
      message: "Check your email to confirm your account before signing in.",
    };
  }

  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
