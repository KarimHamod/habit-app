"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50, "Name is too long"),
  color: z.string().optional(),
});

export type CategoryActionResult =
  | {
      success: true;
      category: { id: string; name: string; color: string | null };
    }
  | { error: string };

export async function createCategory(
  input: z.infer<typeof categorySchema>,
): Promise<CategoryActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
    })
    .select("id, name, color")
    .single();

  if (error || !data) {
    return {
      error:
        error?.code === "23505"
          ? "You already have a category with that name"
          : "Couldn't create category",
    };
  }

  return { success: true, category: data };
}
