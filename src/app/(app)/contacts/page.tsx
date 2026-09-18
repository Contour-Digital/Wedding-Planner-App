"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useKeyContacts } from "@/lib/hooks/useKeyContacts";
import { useDayOfVendorContacts } from "@/lib/hooks/useDayOfVendorContacts";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { canEdit } from "@/lib/utils/permissions";

function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone}`} className="text-xs text-primaryStrong">
      {phone}
    </a>
  );
}

export default function ContactsPage() {
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const { contacts, refresh } = useKeyContacts(weddingId);
  const { contacts: vendorContacts } = useDayOfVendorContacts(weddingId);
  const supabase = createClient();
  const editable = canEdit(role);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ role: "", name: "", phone: "", email: "" });
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function addContact() {
    if (!wedding || !draft.name.trim()) return;
    await supabase.from("key_contacts").insert({
      wedding_id: wedding.id,
      role: draft.role.trim() || null,
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      email: draft.email.trim() || null,
      sort_order: contacts.length,
    });
    setDraft({ role: "", name: "", phone: "", email: "" });
    setAdding(false);
    refresh();
  }

  async function removeContact(id: string) {
    setRemovingId(null);
    await supabase.from("key_contacts").delete().eq("id", id);
    refresh();
  }

  if (!wedding) {
    return (
      <div>
        <PageHeader title="Contacts" />
        <p className="p-6 text-sm text-muted">Loading…</p>
      </div>
    );
  }

  const removingContact = contacts.find((c) => c.id === removingId) ?? null;

  return (
    <div>
      <PageHeader title="Contacts" />
      <div className="space-y-6 p-4 sm:p-6">
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold">The couple</h3>
          <div className="space-y-2">
            <div className="rounded-xl border border-line p-3">
              <p className="text-sm font-medium">{wedding.partner_1}</p>
              {wedding.partner_1_phone ? (
                <PhoneLink phone={wedding.partner_1_phone} />
              ) : (
                editable && <p className="text-xs text-muted">No phone number yet</p>
              )}
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-sm font-medium">{wedding.partner_2}</p>
              {wedding.partner_2_phone ? (
                <PhoneLink phone={wedding.partner_2_phone} />
              ) : (
                editable && <p className="text-xs text-muted">No phone number yet</p>
              )}
            </div>
          </div>
          {editable && (
            <Link href="/settings" className="inline-block text-xs font-medium text-primaryStrong">
              Add or update phone numbers in Settings →
            </Link>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Key contacts</h3>
            {editable && (
              <Button variant="secondary" onClick={() => setAdding((v) => !v)}>
                {adding ? "Cancel" : "+ Add contact"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted">
            Everyone who needs to be reachable on the day — celebrant, MC, photographer, family. Vendors show up
            here automatically once you tick &quot;Show on Contacts tab&quot; on their contact details.
          </p>

          {adding && editable && (
            <div className="space-y-2 rounded-xl border border-line p-3">
              <Field label="Role" hint="e.g. Celebrant, MC, Maid of Honour">
                <Input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
              </Field>
              <Field label="Name">
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </Field>
              <Button fullWidth onClick={addContact} disabled={!draft.name.trim()}>
                Save contact
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-start justify-between rounded-xl border border-line p-3">
                <div>
                  {c.role && <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.role}</p>}
                  <p className="text-sm font-medium">{c.name}</p>
                  <PhoneLink phone={c.phone} />
                  {c.email && <p className="text-xs text-muted">{c.email}</p>}
                </div>
                {editable && (
                  <button onClick={() => setRemovingId(c.id)} className="text-xs text-danger">
                    Remove
                  </button>
                )}
              </div>
            ))}
            {vendorContacts.map((c) => (
              <div key={c.id} className="flex items-start justify-between rounded-xl border border-line p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.role && <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.role}</p>}
                    <Badge className="bg-line text-muted">{c.vendor_name}</Badge>
                  </div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <PhoneLink phone={c.phone} />
                  {c.email && <p className="text-xs text-muted">{c.email}</p>}
                </div>
                {editable && (
                  <Link href={`/vendors/${c.vendor_id}`} className="text-xs font-medium text-primaryStrong">
                    View vendor
                  </Link>
                )}
              </div>
            ))}
            {contacts.length === 0 && vendorContacts.length === 0 && (
              <p className="text-sm text-muted">No key contacts added yet.</p>
            )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={removingContact !== null}
        title="Remove contact"
        message={removingContact ? `Remove "${removingContact.name}" from key contacts?` : ""}
        onConfirm={() => removingContact && removeContact(removingContact.id)}
        onCancel={() => setRemovingId(null)}
      />
    </div>
  );
}
