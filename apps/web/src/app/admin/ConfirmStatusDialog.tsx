"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { officeName, type ConfirmableAction, type ResponderAccount } from "./types";

export interface ConfirmState {
  open: boolean;
  action: ConfirmableAction;
  account: ResponderAccount;
}

interface ConfirmStatusDialogProps {
  /** Kept after closing so the content doesn't blank out during the exit animation. */
  state: ConfirmState | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (account: ResponderAccount, action: ConfirmableAction) => void;
}

function copyFor(action: ConfirmableAction, name: string) {
  if (action === "revoke") {
    return {
      title: `Revoke access for ${name}?`,
      description:
        "They'll lose access to the dashboard the next time they open or refresh AGAP. You can approve them again later from the Rejected tab.",
      confirm: "Revoke access",
    };
  }
  return {
    title: `Reject the request from ${name}?`,
    description:
      "They won't be able to sign in to the dashboard. You can still approve them later from the Rejected tab.",
    confirm: "Reject",
  };
}

export default function ConfirmStatusDialog({ state, onOpenChange, onConfirm }: ConfirmStatusDialogProps) {
  const copy = state ? copyFor(state.action, officeName(state.account)) : null;

  return (
    <AlertDialog open={state?.open ?? false} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {copy && state && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{copy.title}</AlertDialogTitle>
              <AlertDialogDescription>{copy.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={() => onConfirm(state.account, state.action)}
              >
                {copy.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
