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
  alreadyClaimed?: boolean;
  role?: WeddingRole;
  invitedName?: string | null;
  invitedEmail?: string;
  weddingLabel?: string;
  hasExistingAccount?: boolean;
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
  const { user, refresh } = useWedding();
  const supabase = createClient();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invite-link/${params.id}`)
      .then((res) => res.json())
      .then(setInfo)
      .catch(() => setInfo({ valid: false }));
  }, [params.id]);

  async function claim() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite-link/${params.id}`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Couldn't accept that invite.");
        setSubmitting(false);
        return;
      }
      await refresh();
      // Hard navigation, not router.replace — the session cookie was just
      // set by the server, and a full page load is what reliably picks
      // that up rather than racing the client SDK's own state.
      window.location.href = "/dashboard";
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
      setSubmitting(false);
    }
  }

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
      window.location.href = "/dashboard";
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
      setSubmitting(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!info?.invitedEmail) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: info.invitedEmail,
      password: signInPassword,
    });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }
    await claim();
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

  if (info.alreadyClaimed) {
    const isMe = user?.email?.toLowerCase() === info.invitedEmail?.toLowerCase();
    return (
      <Shell>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Invite already accepted</h1>
          <p className="mt-2 text-sm text-muted">
            {isMe
              ? "You've already accepted this invite."
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

  // Already signed in as the right account — just needs one click.
  if (user) {
    return (
      <Shell>
        {heading}
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <Button fullWidth onClick={claim} disabled={submitting}>
          {submitting ? "Joining…" : "Accept invite"}
        </Button>
      </Shell>
    );
  }

  if (info.hasExistingAccount) {
    return (
      <Shell>
        {heading}
        <form onSubmit={handleSignIn} className="space-y-4">
          <Field label="Email">
            <Input type="email" value={info.invitedEmail} disabled />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
            />
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
