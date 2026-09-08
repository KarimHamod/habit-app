"use client";

import { useState } from "react";

import { cancelChallenge } from "@/actions/challenges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface CancelChallengeButtonProps {
  challengeId: string;
  challengeName: string;
}

export function CancelChallengeButton({
  challengeId,
  challengeName,
}: CancelChallengeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm">
            Cancel challenge
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel {challengeName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Your habits and their completion history are unaffected — this
            only ends the challenge early so you can start a new one.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep going</AlertDialogCancel>
          <form action={cancelChallenge.bind(null, challengeId)}>
            <AlertDialogAction type="submit">
              Cancel challenge
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
