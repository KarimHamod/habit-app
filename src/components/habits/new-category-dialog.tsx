"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { createCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface NewCategoryDialogProps {
  onCreated: (category: Category) => void;
}

export function NewCategoryDialog({ onCreated }: NewCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    setError(null);
    setIsSubmitting(true);
    const result = await createCategory({ name });
    setIsSubmitting(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    onCreated(result.category);
    setName("");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setName("");
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="w-fit" />
        }
      >
        <Plus className="size-3.5" aria-hidden="true" />
        New category
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-category-name">Name</Label>
          <Input
            id="new-category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fitness"
            autoFocus
          />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
