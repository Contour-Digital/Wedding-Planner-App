"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { CURRENCIES } from "@/lib/constants";

export function WeddingSettingsForm() {
  const { wedding, user, refresh } = useWedding();
  const supabase = createClient();
  const [form, setForm] = useState({
    partner_1: wedding?.partner_1 ?? "",
    partner_2: wedding?.partner_2 ?? "",
    partner_1_phone: wedding?.partner_1_phone ?? "",
    partner_2_phone: wedding?.partner_2_phone ?? "",
    partner_1_email: wedding?.partner_1_email ?? "",
    partner_2_email: wedding?.partner_2_email ?? "",
    wedding_date: wedding?.wedding_date ?? "",
    ceremony_time: wedding?.ceremony_time ?? "",
    venue: wedding?.venue ?? "",
    location: wedding?.location ?? "",
    guest_count: wedding?.guest_count != null ? String(wedding.guest_count) : "",
    joint_email: wedding?.joint_email ?? "",
    currency: wedding?.currency ?? "USD",
    total_budget: wedding ? String(wedding.total_budget) : "0",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!wedding) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const ceremonyChanged = form.ceremony_time !== wedding!.ceremony_time;

    const payload = {
      ...form,
      guest_count: form.guest_count ? Number(form.guest_count) : null,
      total_budget: Number(form.total_budget) || 0,
    };

    const { error: updateError } = await supabase.from("weddings").update(payload).eq("id", wedding!.id);

    if (updateError) {
      setError(updateError.message);
    }

    if (!updateError && user) {
      if (ceremonyChanged) {
        await logActivity(supabase, {
          weddingId: wedding!.id,
          userId: user.id,
          actionType: "settings.ceremony_time_changed",
          description: `Ceremony time changed to ${form.ceremony_time || "unset"}.`,
          entityType: "wedding",
          entityId: wedding!.id,
        });
      } else {
        await logActivity(supabase, {
          weddingId: wedding!.id,
          userId: user.id,
          actionType: "settings.updated",
          description: "Updated wedding settings.",
          entityType: "wedding",
          entityId: wedding!.id,
        });
      }
      await refresh();
      setSaved(true);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit}>
    <Card className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold">The couple</h3>
        <p className="text-xs text-muted">These names appear everywhere in the app.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Partner 1">
            <Input
              value={form.partner_1}
              onChange={(e) => setForm({ ...form, partner_1: e.target.value })}
              required
            />
          </Field>
          <Field label="Partner 2">
            <Input
              value={form.partner_2}
              onChange={(e) => setForm({ ...form, partner_2: e.target.value })}
              required
            />
          </Field>
          <Field label="Partner 1 email" hint="Shown on the Contacts tab">
            <Input
              type="email"
              value={form.partner_1_email}
              onChange={(e) => setForm({ ...form, partner_1_email: e.target.value })}
            />
          </Field>
          <Field label="Partner 2 email" hint="Shown on the Contacts tab">
            <Input
              type="email"
              value={form.partner_2_email}
              onChange={(e) => setForm({ ...form, partner_2_email: e.target.value })}
            />
          </Field>
          <Field label="Partner 1 phone" hint="Shown on the Contacts and Sharing tabs">
            <Input
              type="tel"
              value={form.partner_1_phone}
              onChange={(e) => setForm({ ...form, partner_1_phone: e.target.value })}
            />
          </Field>
          <Field label="Partner 2 phone" hint="Shown on the Contacts and Sharing tabs">
            <Input
              type="tel"
              value={form.partner_2_phone}
              onChange={(e) => setForm({ ...form, partner_2_phone: e.target.value })}
            />
          </Field>
          <Field label="Joint email" hint="Optional — a shared inbox for the two of you, if you have one">
            <Input
              type="email"
              value={form.joint_email}
              onChange={(e) => setForm({ ...form, joint_email: e.target.value })}
              placeholder="thenickandchloe@example.com"
            />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold">Date & venue</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Wedding date">
            <Input
              type="date"
              value={form.wedding_date ?? ""}
              onChange={(e) => setForm({ ...form, wedding_date: e.target.value })}
            />
          </Field>
          <Field label="Ceremony time" hint="For your own reference — set the Wedding Day run sheet's Ceremony time separately, on that tab">
            <Input
              type="time"
              value={form.ceremony_time ?? ""}
              onChange={(e) => setForm({ ...form, ceremony_time: e.target.value })}
            />
          </Field>
          <Field label="Venue">
            <Input value={form.venue ?? ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </Field>
          <Field label="Location">
            <Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Guest count" hint="Used to suggest category budgets">
            <Input
              type="number"
              min="0"
              value={form.guest_count}
              onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold">Currency</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Currency">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold">Overall budget</h3>
        <div className="mt-3">
          <Field label="Total wedding budget" hint="Shown on the Dashboard and Budget pages">
            <Input
              type="number"
              min="0"
              value={form.total_budget}
              onChange={(e) => setForm({ ...form, total_budget: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger">
          Couldn&apos;t save: {error}
          {error.toLowerCase().includes("total_budget") && (
            <>
              {" "}
              — this usually means the <code>total_budget</code> database migration hasn&apos;t been run yet.
            </>
          )}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && <span className="text-sm text-good">Saved</span>}
      </div>
    </Card>
    </form>
  );
}
