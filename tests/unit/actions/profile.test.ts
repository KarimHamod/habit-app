import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";

import { completeOnboarding, updateProfile } from "@/actions/profile";

function makeFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

function makeSupabase(updateResult: { error: { message: string } | null }) {
  const eq = vi.fn().mockResolvedValue(updateResult);
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update });
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });
  return { from, update, eq, auth: { getUser } };
}

describe("updateProfile", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it("returns a validation error without contacting Supabase when the display name is blank", async () => {
    const formData = makeFormData({
      displayName: "   ",
      timezone: "UTC",
      weekStartsOn: "1",
    });

    const result = await updateProfile({}, formData);

    expect(result).toEqual({ error: "Name is required" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("maps camelCase fields to the profiles columns and returns success", async () => {
    const supabase = makeSupabase({ error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    const formData = makeFormData({
      displayName: "Karim",
      timezone: "America/New_York",
      weekStartsOn: "1",
    });

    const result = await updateProfile({}, formData);

    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(supabase.update).toHaveBeenCalledWith({
      display_name: "Karim",
      timezone: "America/New_York",
      week_starts_on: 1,
    });
    expect(supabase.eq).toHaveBeenCalledWith("id", "user-1");
    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns an error and does not revalidate when the Supabase update fails", async () => {
    const supabase = makeSupabase({ error: { message: "db down" } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    const formData = makeFormData({
      displayName: "Karim",
      timezone: "UTC",
      weekStartsOn: "1",
    });

    const result = await updateProfile({}, formData);

    expect(result).toEqual({ error: "Couldn't save your settings. Try again." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("redirects to /login and never touches the profiles table when unauthenticated", async () => {
    const supabase = makeSupabase({ error: null });
    supabase.auth.getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: null } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    const formData = makeFormData({
      displayName: "Karim",
      timezone: "UTC",
      weekStartsOn: "1",
    });

    await expect(updateProfile({}, formData)).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(supabase.update).not.toHaveBeenCalled();
  });
});

describe("completeOnboarding", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("saves the mapped fields and redirects to /today on success", async () => {
    const supabase = makeSupabase({ error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    const formData = makeFormData({
      displayName: "Karim",
      timezone: "UTC",
      weekStartsOn: "0",
    });

    await expect(completeOnboarding({}, formData)).rejects.toThrow(
      "REDIRECT:/today",
    );
    expect(supabase.update).toHaveBeenCalledWith({
      display_name: "Karim",
      timezone: "UTC",
      week_starts_on: 0,
    });
  });
});
