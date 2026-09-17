"use client";

import { useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useMembers } from "@/lib/hooks/useMembers";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity/logActivity";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { ROLE_DESCRIPTION, ROLE_LABEL, canManageMembers } from "@/lib/utils/permissions";
import type { WeddingRole } from "@/lib/types/database";

const INVITABLE_ROLES: WeddingRole[] = ["editor", "viewer", "timeline_viewer"];

export default function SharingPage() {
  const { wedding, user, role } = useWedding();
  const { members, refresh } = useMembers(wedding?.id);
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WeddingRole>("timeline_viewer");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const canManage = canManageMembers(role);

  async function sendInvite() {
    if (!wedding || !user) {
      setError("Still loading your wedding — try again in a moment.");
      return;
    }
    if (!email.trim()) {
      setError("Enter an email address.");
      return;
    }
    setSending(true);
    setError(null);
    setNotice(null);

    let result: { ok?: boolean; emailSent?: boolean; error?: string };
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId: wedding.id, email: email.trim(), role: inviteRole }),
      });
      result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Couldn't send that invite — please try again.");
        setSending(false);
        return;
      }
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
      setSending(false);
      return;
    }

    await logActivity(supabase, {
      weddingId: wedding.id,
      userId: user.id,
      actionType: "member.invited",
      description: `Invited ${email.trim()} as ${ROLE_LABEL[inviteRole]}.`,
      entityType: "wedding_member",
    });
    setNotice(
      result.emailSent
        ? `Invite email sent to ${email.trim()}.`
        : `${email.trim()} already has an account — they now have access, no email needed.`
    );
    setEmail("");
    refresh();
    setSending(false);
  }

  async function updateRole(memberId: string, newRole: WeddingRole) {
    await supabase.from("wedding_members").update({ role: newRole }).eq("id", memberId);
    refresh();
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this person's access?")) return;
    await supabase.from("wedding_members").delete().eq("id", memberId);
    refresh();
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Sharing" />
        <p className="p-6 text-sm text-muted">Only the wedding owner can manage sharing and access.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Sharing" />
      <div className="space-y-6 p-4 sm:p-6">
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold">Invite someone</h3>
          <p className="text-xs text-muted">
            We&apos;ll email them a sign-in link right away. If they already have an account, they get access
            immediately instead — no email needed.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mc@example.com" />
            </Field>
            <Field label="Role">
              <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as WeddingRole)}>
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="text-xs text-muted">{ROLE_DESCRIPTION[inviteRole]}</p>
          {error && <p className="text-sm text-danger">{error}</p>}
          {notice && <p className="text-sm text-good">{notice}</p>}
          <Button onClick={sendInvite} disabled={sending}>
            {sending ? "Inviting…" : "Send invite"}
          </Button>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold">People with access</h3>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3">
                <div>
                  <p className="text-sm font-medium">
                    {m.profile?.full_name ?? m.invited_email ?? "Pending invite"}
                  </p>
                  <p className="text-xs text-muted">{m.profile?.email ?? m.invited_email}</p>
                </div>
                {m.role === "owner" ? (
                  <span className="text-xs font-medium text-muted">{ROLE_LABEL.owner}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={m.role}
                      onChange={(e) => updateRole(m.id, e.target.value as WeddingRole)}
                      className="w-auto"
                    >
                      {INVITABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                    <button onClick={() => removeMember(m.id)} className="text-xs text-danger">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
