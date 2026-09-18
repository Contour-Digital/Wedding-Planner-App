"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { VendorContact } from "@/lib/types/database";

export function ContactManager({
  vendorId,
  contacts,
  editable,
  onChanged,
}: {
  vendorId: string;
  contacts: VendorContact[];
  editable: boolean;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ role: "", name: "", phone: "", email: "" });

  async function addContact() {
    if (!draft.name.trim()) return;
    await supabase.from("vendor_contacts").insert({
      vendor_id: vendorId,
      role: draft.role.trim() || null,
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      email: draft.email.trim() || null,
    });
    setDraft({ role: "", name: "", phone: "", email: "" });
    setAdding(false);
    onChanged();
  }

  async function removeContact(id: string) {
    await supabase.from("vendor_contacts").delete().eq("id", id);
    onChanged();
  }

  async function toggleShowInContacts(id: string, showInContacts: boolean) {
    await supabase.from("vendor_contacts").update({ show_in_contacts: showInContacts }).eq("id", id);
    onChanged();
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Contacts</h3>
        {editable && (
          <Button variant="secondary" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "+ Add contact"}
          </Button>
        )}
      </div>

      {adding && editable && (
        <div className="space-y-2 rounded-xl border border-line p-3">
          <Input placeholder="Role (e.g. Coordinator)" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <Input placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <Button fullWidth onClick={addContact}>
            Save contact
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="rounded-xl border border-line p-3">
            <div className="flex items-start justify-between">
              <div>
                {c.role && <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.role}</p>}
                <p className="text-sm font-medium">{c.name}</p>
                {c.phone && <p className="text-xs text-muted">{c.phone}</p>}
                {c.email && <p className="text-xs text-muted">{c.email}</p>}
              </div>
              {editable && (
                <button onClick={() => removeContact(c.id)} className="text-xs text-danger">
                  Remove
                </button>
              )}
            </div>
            {editable ? (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={c.show_in_contacts}
                  onChange={(e) => toggleShowInContacts(c.id, e.target.checked)}
                />
                Show on Contacts tab (day-of key contacts)
              </label>
            ) : (
              c.show_in_contacts && <p className="mt-2 text-xs text-muted">On Contacts tab</p>
            )}
          </div>
        ))}
        {contacts.length === 0 && !adding && <p className="text-sm text-muted">No contacts yet.</p>}
      </div>
    </Card>
  );
}
