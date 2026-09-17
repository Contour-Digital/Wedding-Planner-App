"use client";

import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useTimeline } from "@/lib/hooks/useTimeline";
import { Button } from "@/components/ui/Button";
import { formatDate, formatTime } from "@/lib/utils/date";
import { TIMELINE_GROUP_LABEL, TIMELINE_GROUP_OPTIONS } from "@/components/wedding-day/timelineMeta";
import type { TimelineGroup } from "@/lib/types/database";

// Printable run sheet. Deliberately reads only shared fields — no private
// notes, no budget or vendor pricing ever renders here, whether the viewer
// is the couple or an invited collaborator.
export default function WeddingDayPrintPage() {
  const { wedding } = useWedding();
  const { events } = useTimeline(wedding?.id);

  const sorted = [...events].sort((a, b) => a.sort_order - b.sort_order);
  const grouped = TIMELINE_GROUP_OPTIONS.map((group) => ({
    group,
    items: sorted.filter((e) => e.group_name === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-10">
      <div className="no-print mb-6">
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
      </div>

      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-semibold">
          {wedding?.partner_1} & {wedding?.partner_2}
        </h1>
        <p className="text-sm text-muted">{formatDate(wedding?.wedding_date)}</p>
        {wedding?.venue && (
          <p className="text-sm text-muted">
            {wedding.venue}
            {wedding.location ? `, ${wedding.location}` : ""}
          </p>
        )}
      </div>

      <div className="space-y-6">
        {grouped.map(({ group, items }) => (
          <section key={group}>
            <h2 className="mb-2 border-b border-line pb-1 font-display text-lg font-semibold">
              {TIMELINE_GROUP_LABEL[group as TimelineGroup]}
            </h2>
            <div className="space-y-2">
              {items.map((event) => (
                <div key={event.id} className="flex gap-4 text-sm">
                  <span className="w-16 shrink-0 font-medium">{formatTime(event.start_time)}</span>
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted">
                      {[event.location, event.responsible_person].filter(Boolean).join(" · ")}
                    </p>
                    {event.shared_notes && <p className="text-xs italic text-muted">{event.shared_notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
