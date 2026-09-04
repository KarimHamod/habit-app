"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

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
import { buildQuickAddPresets, parseAmountInput } from "@/lib/habits/completion";

interface AmountEntryDialogProps {
  habitId: string;
  habitName: string;
  value: number | null;
  target: number | null;
  unit: string | null;
  pending: boolean;
  onSave: (value: number) => void;
}

export function AmountEntryDialog({
  habitId,
  habitName,
  value,
  target,
  unit,
  pending,
  onSave,
}: AmountEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = `amount-entry-${habitId}`;
  const presets = buildQuickAddPresets(target);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setInput(String(value ?? 0));
      setError(null);
    }
  }

  function addPreset(preset: number) {
    const current = parseAmountInput(input) ?? 0;
    setInput(String(current + preset));
    setError(null);
  }

  function handleSave() {
    const parsed = parseAmountInput(input);
    if (parsed === null) {
      setError("Enter a valid amount");
      return;
    }
    onSave(parsed);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8 rounded-full"
            disabled={pending}
            aria-label={`Enter amount for ${habitName}`}
          />
        }
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{habitName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>
            Amount{unit ? ` (${unit})` : ""}
            {target ? ` — target ${target}${unit ? ` ${unit}` : ""}` : ""}
          </Label>
          <Input
            id={inputId}
            type="number"
            inputMode="decimal"
            min={0}
            autoFocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
          />
          {presets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick add">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPreset(preset)}
                >
                  +{preset}
                </Button>
              ))}
            </div>
          ) : null}
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
            onClick={handleSave}
            disabled={pending || parseAmountInput(input) === null}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
