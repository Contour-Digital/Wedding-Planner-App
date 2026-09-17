"use client";

import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useActivity } from "@/lib/hooks/useActivity";
import { Card } from "@/components/ui/Card";
import { canEdit } from "@/lib/utils/permissions";
import { format, parseISO } from "date-fns";

export default function ActivityPage() {
  const { wedding, role } = useWedding();
  const { entries } = useActivity(wedding?.id);

  if (!canEdit(role)) {
    return (
      <div>
        <PageHeader title="Activity" />
        <p className="p-6 text-sm text-muted">Activity history is only visible to the couple.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Activity" />
      <div className="space-y-2 p-4 sm:p-6">
        {entries.map((entry) => (
          <Card key={entry.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm">
                <span className="font-medium">{entry.profile?.full_name ?? "Someone"}</span>{" "}
                {entry.description.replace(/^\w/, (c) => c.toLowerCase())}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted">
              {format(parseISO(entry.created_at), "d MMM, h:mm a")}
            </span>
          </Card>
        ))}
        {entries.length === 0 && <p className="text-sm text-muted">No activity recorded yet.</p>}
      </div>
    </div>
  );
}
