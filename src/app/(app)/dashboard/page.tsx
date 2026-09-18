"use client";

import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useTasks } from "@/lib/hooks/useTasks";
import { useVendors } from "@/lib/hooks/useVendors";
import { useTimeline } from "@/lib/hooks/useTimeline";
import { weddingTotals } from "@/lib/utils/budget";
import { formatCurrency } from "@/lib/utils/currency";
import { StatCard, Card } from "@/components/ui/Card";
import { formatDate, formatTime, isDueThisMonth, isOverdue, weddingCountdown } from "@/lib/utils/date";
import { canSeeFinancials, isTimelineOnly } from "@/lib/utils/permissions";
import { TIMELINE_GROUP_LABEL } from "@/components/wedding-day/timelineMeta";

export default function DashboardPage() {
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const { expenses } = useExpenses(weddingId);
  const { tasks } = useTasks(weddingId);
  const { vendors } = useVendors(weddingId);
  const { events } = useTimeline(weddingId);

  const showFinancials = canSeeFinancials(role);
  const timelineOnly = isTimelineOnly(role);
  const totals = weddingTotals(wedding?.total_budget ?? 0, expenses, vendors);

  const openTasks = tasks.filter((t) => !t.completed);
  const tasksDueThisMonth = openTasks.filter((t) => isDueThisMonth(t.due_date));
  const overdueTasks = openTasks.filter((t) => isOverdue(t.due_date, t.completed));

  const allInstalments = expenses.flatMap((e) =>
    e.instalments.map((i) => ({ ...i, expenseName: e.name }))
  );
  const upcomingInstalments = allInstalments
    .filter((i) => !i.paid)
    .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));

  const bookedVendors = vendors.filter((v) => v.status === "booked" || v.status === "completed");
  const countdown = weddingCountdown(wedding?.wedding_date);

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="space-y-6 p-4 sm:p-6">
        {countdown !== null && countdown >= 0 && (
          <Card className="bg-primary text-onPrimary">
            <p className="text-sm opacity-80">Countdown to the big day</p>
            <p className="font-display text-3xl font-semibold">{countdown} days</p>
          </Card>
        )}

        {showFinancials && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Budget</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Wedding Budget" value={formatCurrency(totals.totalBudget, wedding?.currency)} />
              <StatCard label="Committed" value={formatCurrency(totals.committed, wedding?.currency)} />
              <StatCard label="Paid" value={formatCurrency(totals.paid, wedding?.currency)} tone="good" />
              <StatCard
                label="Outstanding"
                value={formatCurrency(totals.outstanding, wedding?.currency)}
                tone={totals.outstanding > 0 ? "warn" : "default"}
              />
            </div>

            <div className="mt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Upcoming payments</h3>
              <div className="space-y-2">
                {upcomingInstalments.slice(0, 2).map((p) => (
                  <Card key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.expenseName}</p>
                      <p className="text-xs text-muted">
                        {isOverdue(p.due_date, p.paid) ? "Was due" : "Due"} {formatDate(p.due_date)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(p.amount, wedding?.currency)}</p>
                  </Card>
                ))}
                {upcomingInstalments.length === 0 && (
                  <p className="text-sm text-muted">No upcoming payments.</p>
                )}
              </div>
              <Link href="/budget/upcoming" className="mt-3 inline-block text-sm font-medium text-primaryStrong">
                View all upcoming payments →
              </Link>
            </div>
          </section>
        )}

        {timelineOnly ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Wedding Day schedule</h2>
            <div className="space-y-2">
              {events.slice(0, 8).map((e) => (
                <Card key={e.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted">{TIMELINE_GROUP_LABEL[e.group_name]}</p>
                  </div>
                  <p className="text-xs font-semibold text-primaryStrong">{formatTime(e.start_time)}</p>
                </Card>
              ))}
              {events.length === 0 && <p className="text-sm text-muted">No run-sheet items yet.</p>}
            </div>
            <Link href="/wedding-day" className="mt-3 inline-block text-sm font-medium text-primaryStrong">
              View full run sheet →
            </Link>
          </section>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Tasks</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Open Tasks" value={String(openTasks.length)} />
                <StatCard label="Due This Month" value={String(tasksDueThisMonth.length)} />
                <StatCard
                  label="Overdue"
                  value={String(overdueTasks.length)}
                  tone={overdueTasks.length > 0 ? "danger" : "default"}
                />
                <StatCard label="Booked Vendors" value={String(bookedVendors.length)} />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Upcoming tasks</h2>
              <div className="space-y-2">
                {openTasks.slice(0, 5).map((t) => (
                  <Card key={t.id} className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted">{formatDate(t.due_date)}</p>
                  </Card>
                ))}
                {openTasks.length === 0 && <p className="text-sm text-muted">No open tasks — nice work.</p>}
              </div>
              <Link href="/tasks" className="mt-3 inline-block text-sm font-medium text-primaryStrong">
                View all tasks →
              </Link>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
