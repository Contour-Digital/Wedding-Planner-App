"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ROLE_LABEL } from "@/lib/utils/permissions";
import type { WeddingRole } from "@/lib/types/database";

interface InviteInfo {
  valid: boolean;
  everSignedIn?: boolean;
  accountReady?: boolean;
  role?: WeddingRole;
  invitedName?: string | null;
  invitedEmail?: string;
  weddingLabel?: string;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">{children}</div>
    </div>
  );
}

export default function InviteLinkPage() {
  const params = useParams<{ id: string }>();
  const { user } = useWedding();
  const supabase = createClient();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invite-link/${params.id}`)
      .then((res) => res.json())
      .then(setInfo)
      .catch(() => setInfo({ valid: false }));
  }, [params.id]);

  // Hard navigation, not router.replace — a full page load is what
  // reliably picks up the session cookie/state a sign-in just set, rather
  // than racing the client SDK's own state.
  function goToDashboard() {
    window.location.href = "/dashboard";
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!info?.invitedEmail) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: info.invitedEmail,
      password,
    });
    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "That password isn't right — check for typos, or ask whoever sent this invite for a fresh one."
          : signInError.message
      );
      setSubmitting(false);
      return;
    }
    goToDashboard();
  }

  // Legacy fallback: a pending row created before invites generated their
  // own password (accountReady: false) still needs to set one here.
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite-link/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Couldn't create your account.");
        setSubmitting(false);
        return;
      }
      goToDashboard();
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (!info) {
    return (
      <Shell>
        <p className="text-center text-sm text-muted">Loading invite…</p>
      </Shell>
    );
  }

  if (!info.valid) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Invite not found</h1>
          <p className="mt-2 text-sm text-muted">
            This link isn&apos;t valid — it may have been removed. Ask whoever sent it for a fresh one.
          </p>
        </div>
      </Shell>
    );
  }

  const roleLabel = info.role ? ROLE_LABEL[info.role] : "";

  if (info.everSignedIn) {
    const isMe = user?.email?.toLowerCase() === info.invitedEmail?.toLowerCase();
    return (
      <Shell>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Invite already accepted</h1>
          <p className="mt-2 text-sm text-muted">
            {isMe
              ? "You've already signed in with this invite before."
              : "This invite has already been accepted by whoever it was sent to."}
          </p>
          <Link
            href={isMe ? "/dashboard" : "/login"}
            className="mt-4 inline-block text-sm font-medium text-primaryStrong"
          >
            {isMe ? "Go to your dashboard →" : "Sign in →"}
          </Link>
        </div>
      </Shell>
    );
  }

  // Signed in as someone else entirely — the invite can only be claimed by
  // the address it was sent to.
  if (user && user.email?.toLowerCase() !== info.invitedEmail?.toLowerCase()) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Wrong account</h1>
          <p className="mt-2 text-sm text-muted">
            This invite was sent to <span className="font-medium text-ink">{info.invitedEmail}</span>, but
            you&apos;re signed in as <span className="font-medium text-ink">{user.email}</span>.
          </p>
          <Button className="mt-4" onClick={handleSignOut}>
            Sign out and try again
          </Button>
        </div>
      </Shell>
    );
  }

  // Already signed in as the right account (e.g. reopened this link after
  // accepting) — nothing left to do.
  if (user) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">You&apos;re in! 🎉</h1>
          <p className="mt-2 text-sm text-muted">You already have access.</p>
          <Button className="mt-4" onClick={goToDashboard}>
            Go to your dashboard
          </Button>
        </div>
      </Shell>
    );
  }

  const heading = (
    <div className="text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">You&apos;re invited! 💍</h1>
      <p className="mt-2 text-sm text-muted">
        {info.invitedName ? `${info.invitedName}, y` : "Y"}ou&apos;ve been invited to help plan{" "}
        <span className="font-medium text-ink">{info.weddingLabel}</span>&apos;s wedding as{" "}
        <span className="font-medium text-ink">{roleLabel}</span>.
      </p>
    </div>
  );

  if (info.accountReady) {
    return (
      <Shell>
        {heading}
        <form onSubmit={handleSignIn} className="space-y-4">
          <Field label="Email">
            <Input type="email" value={info.invitedEmail} disabled />
          </Field>
          <Field label="Password" hint="The one you were sent along with this link">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in and accept"}
          </Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      {heading}
      <form onSubmit={handleCreateAccount} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={info.invitedEmail} disabled />
        </Field>
        <Field label="Set a password" hint="At least 6 characters">
          <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Creating account…" : "Create account and accept"}
        </Button>
      </form>
    </Shell>
  );
}
