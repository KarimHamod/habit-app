import { redirect } from "next/navigation";

import { TodoListView } from "@/components/todos/todo-list-view";
import { listTodos } from "@/lib/todos/data";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export const metadata = { title: "To-Dos" };

export default async function TodosPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const { active, parked } = await listTodos(user.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div>
        <h1 className="font-display text-2xl font-semibold">To-Dos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Anything that isn&apos;t a habit — jot it down, check it off, or park it for later.
        </p>
      </div>

      <TodoListView initialActive={active} initialParked={parked} />
    </div>
  );
}
