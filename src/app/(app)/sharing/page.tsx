"use client";

import { useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useMembers } from "@/lib/hooks/useMembers";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity/logActivity";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ROLE_DESCRIPTION, ROLE_LABEL, canManageMembers } from "@/lib/utils/permissions";
import type { WeddingRole } from "@/lib/types/database";

const INVITABLE_ROLES: WeddingRole[] = ["editor", "viewer", "timeline_viewer"];

export default function SharingPage() {
  const { wedding, user, role } = useWedding();
  const { members, refresh } = useMembers(wedding?.id);
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WeddingRole>("timeline_viewer");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [resendingMemberId, setResendingMemberId] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ memberId: string; message: string; isError: boolean } | null>(
    null
  );

  const canManage = canManageMembers(role);
  const removingMember = members.find((m) => m.id === removingMemberId) ?? null;

  // Shared by the "Invite someone" form and each pending row's "Resend
  // invite" button — same request, same success/error messages either way.
  async function requestInvite(targetEmail: string, targetRole: WeddingRole, targetName?: string) {
    if (!wedding || !user) {
      return { ok: false, isError: true, message: "Still loading your wedding — try again in a moment." };
    }
    let result: { ok?: boolean; emailSent?: boolean; error?: string };
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId: wedding.id, email: targetEmail, role: targetRole, name: targetName }),
      });
      result = await res.json();
      if (!res.ok) {
        return { ok: false, isError: true, message: result.error ?? "Couldn't send that invite — please try again." };
      }
    } catch {
      return { ok: false, isError: true, message: "Couldn't reach the server — check your connection and try again." };
    }

    await logActivity(supabase, {
      weddingId: wedding.id,
      userId: user.id,
      actionType: "member.invited",
      description: `Invited ${targetEmail} as ${ROLE_LABEL[targetRole]}.`,
      entityType: "wedding_member",
    });
    return {
      ok: true,
      isError: false,
      message: result.emailSent
        ? `Invite email sent to ${targetEmail}.`
        : `${targetEmail} already has an account — they now have access, no email needed.`,
    };
  }

  async function sendInvite() {
    if (!email.trim()) {
      setError("Enter an email address.");
      return;
    }
    setSending(true);
    setError(null);
    setNotice(null);

    const result = await requestInvite(email.trim(), inviteRole, name.trim() || undefined);
    if (result.isError) {
      setError(result.message);
    } else {
      setNotice(result.message);
      setName("");
      setEmail("");
      refresh();
    }
    setSending(false);
  }

  async function resendInvite(memberId: string, targetEmail: string, targetRole: WeddingRole) {
    setResendingMemberId(memberId);
    setResendStatus(null);
    const result = await requestInvite(targetEmail, targetRole);
    setResendStatus({ memberId, message: result.message, isError: result.isError });
    if (result.ok) refresh();
    setResendingMemberId(null);
  }

  async function updateRole(memberId: string, newRole: WeddingRole) {
    await supabase.from("wedding_members").update({ role: newRole }).eq("id", memberId);
    refresh();
  }

  async function removeMember(memberId: string) {
    setRemovingMemberId(null);
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
            <Field label="Name" hint="Optional — shown here before they accept">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chloe" />
            </Field>
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
            {members.map((m) => {
              const displayName = m.profile?.full_name ?? m.invited_name ?? m.invited_email ?? "Pending invite";
              const displayEmail = m.profile?.email ?? m.invited_email;
              // The email to resend to: invited_email is only ever set
              // before someone's account exists — the moment /api/invite
              // creates it, the trigger clears invited_email and sets
              // user_id, well before they've actually confirmed — so once
              // that's happened, fall back to their (still unconfirmed)
              // account's own email via the profile join.
              const resendTargetEmail = m.invited_email ?? m.profile?.email ?? null;
              const isOwner = m.role === "owner";
              return (
                <div key={m.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">{displayName}</p>
                        {!isOwner && (
                          <Badge className={m.confirmed ? "bg-good/15 text-good" : "bg-warn/15 text-warn"}>
                            {m.confirmed ? "Active" : "Invited"}
                          </Badge>
                        )}
                      </div>
                      {displayEmail && <p className="text-xs text-muted">{displayEmail}</p>}
                    </div>
                    {isOwner ? (
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
                        {!m.confirmed && resendTargetEmail && (
                          <button
                            onClick={() => resendInvite(m.id, resendTargetEmail, m.role)}
                            disabled={resendingMemberId === m.id}
                            className="whitespace-nowrap text-xs font-medium text-primaryStrong disabled:opacity-50"
                          >
                            {resendingMemberId === m.id ? "Resending…" : "Resend invite"}
                          </button>
                        )}
                        <button onClick={() => setRemovingMemberId(m.id)} className="text-xs text-danger">
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  {resendStatus?.memberId === m.id && (
                    <p className={`mt-2 text-xs ${resendStatus.isError ? "text-danger" : "text-good"}`}>
                      {resendStatus.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={removingMember !== null}
        title="Remove access"
        message={
          removingMember
            ? `Remove ${removingMember.profile?.full_name ?? removingMember.invited_name ?? removingMember.invited_email ?? "this person"}'s access?`
            : ""
        }
        onConfirm={() => removingMember && removeMember(removingMember.id)}
        onCancel={() => setRemovingMemberId(null)}
      />
    </div>
  );
}
