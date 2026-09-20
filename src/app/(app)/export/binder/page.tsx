"use client";

import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useCategories } from "@/lib/hooks/useCategories";
import { useVendors } from "@/lib/hooks/useVendors";
import { useTimeline } from "@/lib/hooks/useTimeline";
import { useKeyContacts } from "@/lib/hooks/useKeyContacts";
import { useDayOfVendorContacts } from "@/lib/hooks/useDayOfVendorContacts";
import { PageHeader } from "@/components/nav/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatDate, formatTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { categoryTotals, weddingTotals } from "@/lib/utils/budget";
import { computeExpenseTotals, PAYMENT_STATUS_LABEL } from "@/lib/utils/paymentStatus";
import { TIMELINE_GROUP_LABEL, TIMELINE_GROUP_OPTIONS } from "@/components/wedding-day/timelineMeta";
import { TASK_CATEGORY_LABEL, TASK_CATEGORY_OPTIONS } from "@/components/tasks/taskMeta";
import { VENDOR_STATUS_LABEL } from "@/components/vendors/VendorStatusBadge";
import { canEdit } from "@/lib/utils/permissions";
import type { TaskCategory, TimelineGroup } from "@/lib/types/database";

function Section({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <section className={first ? "" : "break-before-page pt-8"}>
      <h2 className="mb-3 border-b border-line pb-1 font-display text-xl font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// The full "wedding binder" — every section of planning data in one
// printable document, built the same way as /wedding-day/print: plain
// content plus the browser's own Print / Save PDF, styled with the app's
// existing .no-print convention rather than a separate PDF-rendering
// pipeline. Gated the same as Budget/Settings — it includes financials.
export default function ExportBinderPage() {
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const editable = canEdit(role);

  const { tasks } = useTasks(weddingId);
  const { expenses } = useExpenses(weddingId);
  const { categories } = useCategories(weddingId);
  const { vendors } = useVendors(weddingId);
  const { events } = useTimeline(weddingId);
  const { contacts: keyContacts } = useKeyContacts(weddingId);
  const { contacts: vendorDayOfContacts } = useDayOfVendorContacts(weddingId);

  if (!editable) {
    return (
      <div>
        <PageHeader title="Export" />
        <p className="p-6 text-sm text-muted">Only the couple can export the wedding binder.</p>
      </div>
    );
  }

  if (!wedding) {
    return (
      <div>
        <PageHeader title="Export" />
        <p className="p-6 text-sm text-muted">Loading…</p>
      </div>
    );
  }

  const sortedTimeline = [...events].sort((a, b) => a.sort_order - b.sort_order);
  const groupedTimeline = TIMELINE_GROUP_OPTIONS.map((group) => ({
    group,
    items: sortedTimeline.filter((e) => e.group_name === group),
  })).filter((g) => g.items.length > 0);

  const groupedTasks = TASK_CATEGORY_OPTIONS.map((category) => ({
    category,
    items: tasks.filter((t) => t.category === category),
  })).filter((g) => g.items.length > 0);

  const totals = weddingTotals(wedding.total_budget, expenses, vendors);
  const byCategory = categoryTotals(categories, expenses, vendors);

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-10">
      <div className="no-print mb-6">
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
      </div>

      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold">
          {wedding.partner_1} & {wedding.partner_2}
        </h1>
        <p className="mt-1 text-sm text-muted">Wedding Binder</p>
        {wedding.wedding_date && <p className="mt-3 text-sm text-muted">{formatDate(wedding.wedding_date, "EEEE d MMMM yyyy")}</p>}
        {wedding.venue && (
          <p className="text-sm text-muted">
            {wedding.venue}
            {wedding.location ? `, ${wedding.location}` : ""}
          </p>
        )}
        {wedding.guest_count != null && <p className="text-sm text-muted">{wedding.guest_count} guests</p>}
      </div>

      <Section title="Key contacts" first>
        <div>
          <h3 className="mb-1 text-sm font-semibold">The couple</h3>
          <div className="space-y-1 text-sm">
            {[
              { name: wedding.partner_1, phone: wedding.partner_1_phone, email: wedding.partner_1_email },
              { name: wedding.partner_2, phone: wedding.partner_2_phone, email: wedding.partner_2_email },
            ].map((p) => (
              <p key={p.name}>
                <span className="font-medium">{p.name}</span>
                {[p.phone, p.email].filter(Boolean).length > 0 && ` — ${[p.phone, p.email].filter(Boolean).join(" · ")}`}
              </p>
            ))}
          </div>
        </div>
        {(keyContacts.length > 0 || vendorDayOfContacts.length > 0) && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Key contacts</h3>
            <div className="space-y-1 text-sm">
              {keyContacts.map((c) => (
                <p key={c.id} className="break-inside-avoid">
                  {c.role && <span className="text-muted">{c.role} — </span>}
                  <span className="font-medium">{c.name}</span>
                  {[c.phone, c.email].filter(Boolean).length > 0 && ` — ${[c.phone, c.email].filter(Boolean).join(" · ")}`}
                </p>
              ))}
              {vendorDayOfContacts.map((c) => (
                <p key={c.id} className="break-inside-avoid">
                  {c.role && <span className="text-muted">{c.role} — </span>}
                  <span className="font-medium">{c.name}</span> ({c.vendor_name})
                  {[c.phone, c.email].filter(Boolean).length > 0 && ` — ${[c.phone, c.email].filter(Boolean).join(" · ")}`}
                </p>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Wedding day timeline">
        {groupedTimeline.length === 0 && <p className="text-sm text-muted">No run-sheet items yet.</p>}
        {groupedTimeline.map(({ group, items }) => (
          <div key={group} className="break-inside-avoid">
            <h3 className="mb-1 text-sm font-semibold">{TIMELINE_GROUP_LABEL[group as TimelineGroup]}</h3>
            <div className="space-y-1.5">
              {items.map((event) => (
                <div key={event.id} className="flex gap-4 text-sm">
                  <span className="w-16 shrink-0 font-medium">{formatTime(event.start_time)}</span>
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted">{[event.location, event.responsible_person].filter(Boolean).join(" · ")}</p>
                    {event.shared_notes && <p className="text-xs italic text-muted">{event.shared_notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Tasks">
        {groupedTasks.length === 0 && <p className="text-sm text-muted">No tasks yet.</p>}
        {groupedTasks.map(({ category, items }) => (
          <div key={category} className="break-inside-avoid">
            <h3 className="mb-1 text-sm font-semibold">{TASK_CATEGORY_LABEL[category as TaskCategory]}</h3>
            <div className="space-y-1">
              {items.map((task) => (
                <div key={task.id} className="flex items-baseline gap-2 text-sm">
                  <span>{task.completed ? "☑" : "☐"}</span>
                  <span className={task.completed ? "text-muted line-through" : ""}>{task.title}</span>
                  {task.due_date && <span className="text-xs text-muted">due {formatDate(task.due_date)}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Budget">
        <div className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
          {[
            ["Ideal Budget", totals.totalBudget],
            ["Committed", totals.committed],
            ["Paid", totals.paid],
            ["Outstanding Payments", totals.outstanding],
            ["Ideal Budget Remaining", totals.remaining],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-xs text-muted">{label}</p>
              <p className="font-semibold">{formatCurrency(value as number, wedding.currency)}</p>
            </div>
          ))}
        </div>
        {byCategory.map((cat) => {
          const catExpenses = expenses.filter((e) => e.category_id === cat.categoryId);
          if (catExpenses.length === 0 && cat.targetBudget === 0) return null;
          return (
            <div key={cat.categoryId} className="break-inside-avoid">
              <h3 className="mb-1 text-sm font-semibold">
                {cat.name} — {formatCurrency(cat.committed, wedding.currency)}
                {cat.targetBudget > 0 && ` of ${formatCurrency(cat.targetBudget, wedding.currency)} target`}
              </h3>
              <div className="space-y-1">
                {catExpenses.map((expense) => {
                  const t = computeExpenseTotals(expense.total_amount, expense.deposit_amount, expense.instalments);
                  return (
                    <div key={expense.id} className="flex items-baseline justify-between text-sm">
                      <span>{expense.name}</span>
                      <span className="text-xs text-muted">
                        {formatCurrency(expense.total_amount, wedding.currency)} — {PAYMENT_STATUS_LABEL[t.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="Vendors">
        {vendors.length === 0 && <p className="text-sm text-muted">No vendors yet.</p>}
        {vendors.map((vendor) => (
          <div key={vendor.id} className="break-inside-avoid">
            <h3 className="text-sm font-semibold">
              {vendor.name}
              {vendor.type && <span className="font-normal text-muted"> · {vendor.type}</span>} — {VENDOR_STATUS_LABEL[vendor.status]}
            </h3>
            {vendor.contacts.length > 0 && (
              <div className="space-y-0.5 text-sm">
                {vendor.contacts.map((c) => (
                  <p key={c.id}>
                    {c.role && <span className="text-muted">{c.role} — </span>}
                    {c.name}
                    {[c.phone, c.email].filter(Boolean).length > 0 && ` — ${[c.phone, c.email].filter(Boolean).join(" · ")}`}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>
    </div>
  );
}
