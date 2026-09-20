"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { TIMELINE_GROUP_LABEL, TIMELINE_GROUP_OPTIONS } from "./timelineMeta";
import type { TimelineEvent, TimelineGroup } from "@/lib/types/database";

export function TimelineEventModal({
  open,
  onClose,
  event,
  nextSortOrder,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  event?: TimelineEvent | null;
  nextSortOrder: number;
  onSaved: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();

  const [group, setGroup] = useState<TimelineGroup>(event?.group_name ?? "other");
  const [title, setTitle] = useState(event?.title ?? "");
  const [startTime, setStartTime] = useState(event?.start_time ?? "");
  const [duration, setDuration] = useState(event?.duration_minutes ? String(event.duration_minutes) : "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [responsible, setResponsible] = useState(event?.responsible_person ?? "");
  const [sharedNotes, setSharedNotes] = useState(event?.shared_notes ?? "");
  const [privateNotes, setPrivateNotes] = useState(event?.private_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);

  async function handleSave() {
    if (!wedding || !user) return;
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setSaving(true);

    const payload: Record<string, unknown> = {
      wedding_id: wedding.id,
      group_name: group,
      title: title.trim(),
      start_time: startTime || null,
      duration_minutes: duration ? Number(duration) : null,
      location: location.trim() || null,
      responsible_person: responsible.trim() || null,
      shared_notes: sharedNotes.trim() || null,
      private_notes: privateNotes.trim() || null,
    };

    if (event) {
      await supabase.from("timeline_events").update(payload).eq("id", event.id);
    } else {
      await supabase.from("timeline_events").insert({ ...payload, sort_order: nextSortOrder });
    }

    await logActivity(supabase, {
      weddingId: wedding.id,
      userId: user.id,
      actionType: event ? "timeline.updated" : "timeline.created",
      description: event ? `Updated run-sheet item "${title.trim()}".` : `Added run-sheet item "${title.trim()}".`,
      entityType: "timeline_event",
      entityId: event?.id,
    });

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={event ? "Edit run-sheet item" : "Add run-sheet item"}>
      <div className="space-y-4">
        <Field label="Event name" error={titleError}>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(false);
            }}
          />
        </Field>
        <Field label="Group">
          <Select value={group} onChange={(e) => setGroup(e.target.value as TimelineGroup)}>
            {TIMELINE_GROUP_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {TIMELINE_GROUP_LABEL[g]}
              </option>
            ))}
          </Select>
        </Field>
        {/* min-w-0 on each grid item — without it, a native type="time"
            input's own intrinsic width can push its column wider than the
            other, so the two fields stop lining up as the equal 1fr/1fr
            split grid-cols-2 is supposed to give them. */}
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <Field label="Start time">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Duration (minutes)">
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
        </div>
        <Field label="Location">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Responsible person">
          <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} />
        </Field>
        <Field label="Shared notes" hint="Visible to Timeline Only collaborators (MC, photographer, etc)">
          <Textarea value={sharedNotes} onChange={(e) => setSharedNotes(e.target.value)} />
        </Field>
        <Field label="Couple-only notes" hint="Only visible to Full Access users">
          <Textarea value={privateNotes} onChange={(e) => setPrivateNotes(e.target.value)} />
        </Field>
        <Button fullWidth onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save item"}
        </Button>
      </div>
    </Modal>
  );
}
