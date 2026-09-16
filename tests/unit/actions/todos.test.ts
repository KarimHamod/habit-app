import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";

import {
  createTodo,
  deleteTodo,
  parkTodo,
  setTodoDueDate,
  toggleTodo,
} from "@/actions/todos";

function makeSupabase({
  getUserResult = { data: { user: { id: "user-1" } } } as { data: { user: { id: string } | null } },
  insertError = null as { message: string } | null,
  insertId = "new-todo-1",
  updateError = null as { message: string } | null,
  deleteError = null as { message: string } | null,
} = {}) {
  const single = vi
    .fn()
    .mockResolvedValue(
      insertError
        ? { data: null, error: insertError }
        : { data: { id: insertId }, error: null },
    );
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const updateEq2 = vi.fn().mockResolvedValue({ error: updateError });
  const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 });
  const update = vi.fn().mockReturnValue({ eq: updateEq1 });
  const deleteEq2 = vi.fn().mockResolvedValue({ error: deleteError });
  const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
  const del = vi.fn().mockReturnValue({ eq: deleteEq1 });
  const from = vi.fn().mockReturnValue({ insert, update, delete: del });
  const getUser = vi.fn().mockResolvedValue(getUserResult);
  return {
    from,
    insert,
    select,
    single,
    update,
    updateEq1,
    updateEq2,
    delete: del,
    deleteEq1,
    deleteEq2,
    auth: { getUser },
  };
}

describe("createTodo", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("returns a validation error without contacting Supabase for a blank title", async () => {
    const result = await createTodo("   ");

    expect(result).toEqual({ error: "Title is required" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns a validation error for a title over the max length", async () => {
    const result = await createTodo("x".repeat(201));

    expect(result).toEqual({
      error: "Title must be at most 200 characters",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("trims the title, inserts it for the authenticated user, and returns its id", async () => {
    const supabase = makeSupabase({ insertId: "new-todo-1" });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createTodo("  Buy milk  ");

    expect(supabase.from).toHaveBeenCalledWith("todos");
    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Buy milk",
      due_date: null,
      due_time: null,
    });
    expect(supabase.select).toHaveBeenCalledWith("id");
    expect(result).toEqual({ success: true, id: "new-todo-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/todos");
  });

  it("returns an error and does not revalidate when unauthenticated", async () => {
    const supabase = makeSupabase({ getUserResult: { data: { user: null } } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createTodo("Buy milk");

    expect(result).toEqual({ error: "Not signed in" });
    expect(supabase.insert).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an error when the insert fails", async () => {
    const supabase = makeSupabase({ insertError: { message: "db down" } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createTodo("Buy milk");

    expect(result).toEqual({ error: "Couldn't add that to-do. Try again." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("inserts a due date and time when both are given", async () => {
    const supabase = makeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await createTodo("Buy milk", "2026-09-20", "14:30");

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Buy milk",
      due_date: "2026-09-20",
      due_time: "14:30",
    });
  });

  it("drops a due time given without a due date, without erroring", async () => {
    const supabase = makeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createTodo("Buy milk", null, "14:30");

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Buy milk",
      due_date: null,
      due_time: null,
    });
    expect(result).toEqual({ success: true, id: "new-todo-1" });
  });

  it("rejects a malformed due date without contacting Supabase", async () => {
    const result = await createTodo("Buy milk", "not-a-date");

    expect(result).toEqual({ error: "Invalid due date" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects a malformed due time without contacting Supabase", async () => {
    const result = await createTodo("Buy milk", "2026-09-20", "25:99");

    expect(result).toEqual({ error: "Invalid due time" });
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("toggleTodo", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("sets done_at when marking done", async () => {
    const supabase = makeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await toggleTodo("todo-1", true);

    expect(supabase.from).toHaveBeenCalledWith("todos");
    const [payload] = supabase.update.mock.calls[0] as [
      { done_at: string | null },
    ];
    expect(typeof payload.done_at).toBe("string");
    expect(supabase.updateEq1).toHaveBeenCalledWith("id", "todo-1");
    expect(supabase.updateEq2).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/todos");
  });

  it("clears done_at when marking not done", async () => {
    const supabase = makeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await toggleTodo("todo-1", false);

    expect(supabase.update).toHaveBeenCalledWith({ done_at: null });
  });

  it("returns an error when unauthenticated", async () => {
    const supabase = makeSupabase({ getUserResult: { data: { user: null } } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await toggleTodo("todo-1", true);

    expect(result).toEqual({ error: "Not signed in" });
    expect(supabase.update).not.toHaveBeenCalled();
  });

  it("returns an error when the update fails", async () => {
    const supabase = makeSupabase({ updateError: { message: "db down" } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await toggleTodo("todo-1", true);

    expect(result).toEqual({ error: "Couldn't update that to-do. Try again." });
  });
});

describe("parkTodo", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("updates the parked flag for the authenticated user and revalidates", async () => {
    const supabase = makeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await parkTodo("todo-1", true);

    expect(supabase.update).toHaveBeenCalledWith({ parked: true });
    expect(supabase.updateEq1).toHaveBeenCalledWith("id", "todo-1");
    expect(supabase.updateEq2).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/todos");
  });

  it("returns an error when the update fails", async () => {
    const supabase = makeSupabase({ updateError: { message: "db down" } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await parkTodo("todo-1", false);

    expect(result).toEqual({ error: "Couldn't update that to-do. Try again." });
  });
});

describe("setTodoDueDate", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("updates the due date and time for the authenticated user and revalidates", async () => {
    const supabase = makeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await setTodoDueDate("todo-1", "2026-09-20", "14:30");

    expect(supabase.update).toHaveBeenCalledWith({
      due_date: "2026-09-20",
      due_time: "14:30",
    });
    expect(supabase.updateEq1).toHaveBeenCalledWith("id", "todo-1");
    expect(supabase.updateEq2).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/todos");
  });

  it("clears both fields when passed null", async () => {
    const supabase = makeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await setTodoDueDate("todo-1", null);

    expect(supabase.update).toHaveBeenCalledWith({ due_date: null, due_time: null });
  });

  it("rejects a malformed due date without contacting Supabase", async () => {
    const result = await setTodoDueDate("todo-1", "not-a-date");

    expect(result).toEqual({ error: "Invalid due date" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns an error when the update fails", async () => {
    const supabase = makeSupabase({ updateError: { message: "db down" } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await setTodoDueDate("todo-1", "2026-09-20");

    expect(result).toEqual({ error: "Couldn't update that to-do. Try again." });
  });
});

describe("deleteTodo", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("deletes the row scoped to id and user, then revalidates", async () => {
    const supabase = makeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await deleteTodo("todo-1");

    expect(supabase.from).toHaveBeenCalledWith("todos");
    expect(supabase.deleteEq1).toHaveBeenCalledWith("id", "todo-1");
    expect(supabase.deleteEq2).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/todos");
  });

  it("returns an error when unauthenticated", async () => {
    const supabase = makeSupabase({ getUserResult: { data: { user: null } } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await deleteTodo("todo-1");

    expect(result).toEqual({ error: "Not signed in" });
    expect(supabase.delete).not.toHaveBeenCalled();
  });

  it("returns an error when the delete fails", async () => {
    const supabase = makeSupabase({ deleteError: { message: "db down" } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await deleteTodo("todo-1");

    expect(result).toEqual({ error: "Couldn't remove that to-do. Try again." });
  });
});
