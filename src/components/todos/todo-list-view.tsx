"use client";

import { ChevronDown, ChevronUp, ListTodo } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import {
  createTodo,
  deleteTodo,
  parkTodo,
  toggleTodo,
  type TodoActionResult,
} from "@/actions/todos";
// createTodo's success shape is `{ success: true; id: string }`, distinct
// from the other three actions' `TodoActionResult` — handled directly in
// handleAdd below rather than through the generic `submit` helper.
import type { Todo } from "@/lib/todos/types";

import { TodoItem } from "./todo-item";
import { TodoQuickAdd } from "./todo-quick-add";

type TodoAction =
  | { type: "add"; todo: Todo }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "park"; id: string; parked: boolean }
  | { type: "delete"; id: string };

function applyAction(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case "add":
      return [...state, action.todo];
    case "toggle":
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, done: action.done } : todo,
      );
    case "park":
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, parked: action.parked } : todo,
      );
    case "delete":
      return state.filter((todo) => todo.id !== action.id);
  }
}

interface TodoListViewProps {
  initialActive: Todo[];
  initialParked: Todo[];
}

/**
 * Optimistic to-do list, mirroring `today-view.tsx`'s completion-toggle
 * pattern: one `useOptimistic` list, applied immediately, reconciled with
 * the server result, and rolled back (by simply not committing the
 * optimistic change) on `{ error }`.
 */
export function TodoListView({ initialActive, initialParked }: TodoListViewProps) {
  const [todos, setTodos] = useState<Todo[]>([...initialActive, ...initialParked]);
  const [optimisticTodos, applyOptimistic] = useOptimistic(todos, applyAction);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showParked, setShowParked] = useState(false);

  function submit(action: TodoAction, run: () => Promise<TodoActionResult>) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(action);
      const result = await run();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTodos((prev) => applyAction(prev, action));
    });
  }

  function handleAdd(title: string) {
    // A temporary client id lets the optimistic row render immediately;
    // createTodo returns the real server-assigned id, which replaces it in
    // `setTodos` on success — no page reload needed.
    const tempId = `optimistic-${Date.now()}`;
    const optimisticTodo: Todo = { id: tempId, title, done: false, parked: false };
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "add", todo: optimisticTodo });
      const result = await createTodo(title);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTodos((prev) => [...prev, { ...optimisticTodo, id: result.id }]);
    });
  }

  const active = optimisticTodos.filter((todo) => !todo.parked);
  const parked = optimisticTodos.filter((todo) => todo.parked);

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {active.length === 0 && parked.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center gap-3 rounded-3xl border border-dashed p-10 text-center">
          <div
            className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl"
            aria-hidden="true"
          >
            <ListTodo className="size-6" />
          </div>
          <div>
            <p className="font-medium">Nothing on your list yet.</p>
            <p className="text-muted-foreground text-sm">
              Add anything you don&apos;t want to forget — no pressure to check it off today.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              pending={isPending}
              onToggle={() =>
                submit(
                  { type: "toggle", id: todo.id, done: !todo.done },
                  () => toggleTodo(todo.id, !todo.done),
                )
              }
              onPark={() =>
                submit({ type: "park", id: todo.id, parked: true }, () =>
                  parkTodo(todo.id, true),
                )
              }
              onDelete={() =>
                submit({ type: "delete", id: todo.id }, () => deleteTodo(todo.id))
              }
            />
          ))}
        </div>
      )}

      <TodoQuickAdd pending={isPending} onAdd={handleAdd} />

      {parked.length > 0 ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowParked((prev) => !prev)}
            className="text-muted-foreground flex items-center gap-1 text-sm font-medium"
            aria-expanded={showParked}
          >
            {showParked ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
            Later ({parked.length})
          </button>
          {showParked ? (
            <div className="flex flex-col gap-2">
              {parked.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  pending={isPending}
                  onToggle={() =>
                    submit(
                      { type: "toggle", id: todo.id, done: !todo.done },
                      () => toggleTodo(todo.id, !todo.done),
                    )
                  }
                  onPark={() =>
                    submit({ type: "park", id: todo.id, parked: false }, () =>
                      parkTodo(todo.id, false),
                    )
                  }
                  onDelete={() =>
                    submit({ type: "delete", id: todo.id }, () => deleteTodo(todo.id))
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
