import { describe, expect, it } from "vitest";

import { formatDueBadge, isOverdue, sortByDueDate } from "@/lib/todos/due-date";
import type { Todo } from "@/lib/todos/types";

function makeTodo(overrides: Partial<Todo> & { id: string }): Todo {
  return {
    title: "Untitled",
    done: false,
    parked: false,
    dueDate: null,
    dueTime: null,
    ...overrides,
  };
}

describe("sortByDueDate", () => {
  it("sorts dated todos soonest-first", () => {
    const later = makeTodo({ id: "later", dueDate: "2026-09-20" });
    const sooner = makeTodo({ id: "sooner", dueDate: "2026-09-18" });

    expect(sortByDueDate([later, sooner]).map((t) => t.id)).toEqual([
      "sooner",
      "later",
    ]);
  });

  it("breaks a same-day tie by due time", () => {
    const pm = makeTodo({ id: "pm", dueDate: "2026-09-20", dueTime: "14:00" });
    const am = makeTodo({ id: "am", dueDate: "2026-09-20", dueTime: "09:00" });

    expect(sortByDueDate([pm, am]).map((t) => t.id)).toEqual(["am", "pm"]);
  });

  it("sorts undated todos after every dated todo, preserving their relative order", () => {
    const first = makeTodo({ id: "first" });
    const second = makeTodo({ id: "second" });
    const dated = makeTodo({ id: "dated", dueDate: "2026-09-20" });

    expect(sortByDueDate([first, dated, second]).map((t) => t.id)).toEqual([
      "dated",
      "first",
      "second",
    ]);
  });
});

describe("isOverdue", () => {
  const today = "2026-09-20";
  const nowTime = "12:00";

  it("is false for a todo with no due date", () => {
    expect(isOverdue(makeTodo({ id: "1" }), today, nowTime)).toBe(false);
  });

  it("is false for a done todo, even with a past due date", () => {
    const todo = makeTodo({ id: "1", done: true, dueDate: "2026-09-01" });
    expect(isOverdue(todo, today, nowTime)).toBe(false);
  });

  it("is true when the due date is before today", () => {
    const todo = makeTodo({ id: "1", dueDate: "2026-09-19" });
    expect(isOverdue(todo, today, nowTime)).toBe(true);
  });

  it("is false when the due date is after today", () => {
    const todo = makeTodo({ id: "1", dueDate: "2026-09-21" });
    expect(isOverdue(todo, today, nowTime)).toBe(false);
  });

  it("is true when due today at a time earlier than now", () => {
    const todo = makeTodo({ id: "1", dueDate: today, dueTime: "09:00" });
    expect(isOverdue(todo, today, nowTime)).toBe(true);
  });

  it("is false when due today at a time later than now", () => {
    const todo = makeTodo({ id: "1", dueDate: today, dueTime: "18:00" });
    expect(isOverdue(todo, today, nowTime)).toBe(false);
  });

  it("is false when due today with no time set (an all-day due date isn't overdue until tomorrow)", () => {
    const todo = makeTodo({ id: "1", dueDate: today });
    expect(isOverdue(todo, today, nowTime)).toBe(false);
  });
});

describe("formatDueBadge", () => {
  const today = "2026-09-20";

  it("returns null when there is no due date", () => {
    expect(formatDueBadge(makeTodo({ id: "1" }), today)).toBeNull();
  });

  it("labels today's due date as 'Today'", () => {
    expect(formatDueBadge(makeTodo({ id: "1", dueDate: today }), today)).toBe(
      "Today",
    );
  });

  it("labels the next calendar day as 'Tomorrow'", () => {
    expect(
      formatDueBadge(makeTodo({ id: "1", dueDate: "2026-09-21" }), today),
    ).toBe("Tomorrow");
  });

  it("formats a further-out date compactly", () => {
    expect(
      formatDueBadge(makeTodo({ id: "1", dueDate: "2026-12-25" }), today),
    ).toBe("Dec 25");
  });

  it("appends a formatted time when one is set", () => {
    expect(
      formatDueBadge(
        makeTodo({ id: "1", dueDate: today, dueTime: "14:30" }),
        today,
      ),
    ).toBe("Today, 2:30 PM");
  });
});
