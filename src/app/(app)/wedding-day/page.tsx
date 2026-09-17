"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useTimeline } from "@/lib/hooks/useTimeline";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { TimelineEventCard } from "@/components/wedding-day/TimelineEventCard";
import { TimelineEventModal } from "@/components/wedding-day/TimelineEventModal";
import { TIMELINE_GROUP_LABEL, TIMELINE_GROUP_OPTIONS } from "@/components/wedding-day/timelineMeta";
import { canEdit } from "@/lib/utils/permissions";
import type { TimelineEvent, TimelineGroup } from "@/lib/types/database";

export default function WeddingDayPage() {
  const { wedding, role } = useWedding();
  const { events, refresh, canSeePrivate } = useTimeline(wedding?.id);
  const supabase = createClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const editable = canEdit(role);

  const sorted = [...events].sort((a, b) => a.sort_order - b.sort_order);
  const grouped = TIMELINE_GROUP_OPTIONS.map((group) => ({
    group,
    items: sorted.filter((e) => e.group_name === group),
  })).filter((g) => g.items.length > 0);

  function openAdd() {
    setEditingEvent(null);
    setModalOpen(true);
  }

  function openEdit(event: TimelineEvent) {
    setEditingEvent(event);
    setModalOpen(true);
  }

  async function moveEvent(groupItems: typeof sorted, index: number, direction: "up" | "down") {
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= groupItems.length) return;

    const a = groupItems[index];
    const b = groupItems[swapWith];

    await Promise.all([
      supabase.from("timeline_events").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("timeline_events").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    refresh();
  }

  const nextSortOrder = sorted.length > 0 ? Math.max(...sorted.map((e) => e.sort_order)) + 1 : 0;

  return (
    <div>
      <PageHeader title="Wedding Day" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {editable && <Button onClick={openAdd}>+ Add event</Button>}
          <Link href="/wedding-day/print" target="_blank">
            <Button variant="secondary">Print / Save PDF</Button>
          </Link>
        </div>

        {grouped.map(({ group, items }) => (
          <section key={group}>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">{TIMELINE_GROUP_LABEL[group as TimelineGroup]}</h2>
            <div className="space-y-2">
              {items.map((event, idx) => (
                <TimelineEventCard
                  key={event.id}
                  event={event}
                  canSeePrivate={canSeePrivate}
                  isFirstInGroup={idx === 0}
                  isLastInGroup={idx === items.length - 1}
                  onEdit={() => openEdit(event as TimelineEvent)}
                  onMove={(direction) => moveEvent(items, idx, direction)}
                  onChanged={refresh}
                />
              ))}
            </div>
          </section>
        ))}

        {grouped.length === 0 && <p className="text-sm text-muted">No run-sheet items yet.</p>}
      </div>

      {editable && (
        <TimelineEventModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          event={editingEvent}
          nextSortOrder={nextSortOrder}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
