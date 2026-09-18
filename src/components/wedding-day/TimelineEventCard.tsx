"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatTime } from "@/lib/utils/date";
import { canEdit } from "@/lib/utils/permissions";
import type { TimelineEvent, TimelineEventShared } from "@/lib/types/database";

export function TimelineEventCard({
  event,
  canSeePrivate,
  isFirstInGroup,
  isLastInGroup,
  onEdit,
  onMove,
  onChanged,
}: {
  event: TimelineEvent | TimelineEventShared;
  canSeePrivate: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onEdit: () => void;
  onMove: (direction: "up" | "down") => void;
  onChanged: () => void;
}) {
  const { wedding, user, role } = useWedding();
  const supabase = createClient();
  const privateNotes = "private_notes" in event ? event.private_notes : null;
  const editable = canEdit(role);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleDelete() {
    setConfirmingDelete(false);
    if (!wedding || !user) return;
    await supabase.from("timeline_events").delete().eq("id", event.id);
    await logActivity(supabase, {
      weddingId: wedding.id,
      userId: user.id,
      actionType: "timeline.deleted",
      description: `Removed run-sheet item "${event.title}".`,
      entityType: "timeline_event",
      entityId: event.id,
    });
    onChanged();
  }

  return (
    <Card className="flex items-start gap-3">
      <div className="w-16 shrink-0 pt-0.5 text-sm font-semibold text-primaryStrong">{formatTime(event.start_time)}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{event.title}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
          {event.duration_minutes && <span>{event.duration_minutes} min</span>}
          {event.location && <span>{event.location}</span>}
          {event.responsible_person && <span>{event.responsible_person}</span>}
        </div>
        {event.shared_notes && <p className="mt-2 text-xs text-ink">{event.shared_notes}</p>}
        {/* A fixed neutral tint rather than bg-secondary — the couple's
            Secondary colour defaults to white and can be set to anything,
            so a callout tinted by it could become invisible. */}
        {canSeePrivate && privateNotes && (
          <p className="mt-2 rounded-lg bg-line p-2 text-xs text-ink">
            <span className="font-medium">Couple only: </span>
            {privateNotes}
          </p>
        )}
      </div>
      {editable && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex gap-1">
            <button
              onClick={() => onMove("up")}
              disabled={isFirstInGroup}
              aria-label="Move up"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={() => onMove("down")}
              disabled={isLastInGroup}
              aria-label="Move down"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"
            >
              ↓
            </button>
          </div>
          <div className="flex gap-3 pt-1 text-xs">
            <button onClick={onEdit} className="font-medium text-primaryStrong">
              Edit
            </button>
            <button onClick={() => setConfirmingDelete(true)} className="font-medium text-danger">
              Remove
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmingDelete}
        title="Remove run-sheet item"
        message={`Remove "${event.title}" from the run sheet?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Card>
  );
}
