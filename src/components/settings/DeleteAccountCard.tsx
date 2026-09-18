"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";

const CONFIRM_WORD = "DELETE";

// Owner-only — the Settings page only renders this component for role ===
// "owner". Deleting wipes the whole wedding for every member, not just this
// account, so it needs more friction than the app's other destructive
// actions (which use ConfirmDialog's plain Yes/No) — a typed confirmation
// word rather than a single click.
export function DeleteAccountCard() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeModal() {
    if (deleting) return;
    setOpen(false);
    setConfirmText("");
    setError(null);
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Couldn't delete your account — please try again.");
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
      setDeleting(false);
    }
  }

  return (
    <Card className="space-y-3 border-danger/30">
      <div>
        <h3 className="font-display text-lg font-semibold text-danger">Danger zone</h3>
        <p className="mt-1 text-xs text-muted">
          Deleting your account deletes this whole wedding — tasks, budget, vendors, timeline, contacts,
          everything — for every person with access, not just you. This can&apos;t be undone.
        </p>
      </div>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>

      <Modal open={open} onClose={closeModal} title="Delete your account">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            This permanently deletes the wedding and everything in it, for every person with access.
            Type <span className="font-semibold text-ink">{CONFIRM_WORD}</span> to confirm.
          </p>
          <Field label="Confirm">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              disabled={confirmText !== CONFIRM_WORD}
            >
              Delete forever
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
