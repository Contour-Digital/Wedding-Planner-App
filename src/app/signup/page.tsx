"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // If Supabase has "Confirm email" turned on (the default), signUp()
    // succeeds but returns no session until the confirmation code is
    // entered — sending them to onboarding now would fail, since the
    // database needs an authenticated user to create the wedding. Show a
    // code-entry screen instead of redirecting blind.
    if (!data.session) {
      setConfirmationSent(true);
      return;
    }

    router.replace("/onboarding");
    router.refresh();
  }

  // Verifies the same 6-digit code embedded in the confirmation email's
  // {{ .Token }} — not the {{ .ConfirmationURL }} link, which depends on
  // Supabase's configured Site URL and can end up somewhere unexpected
  // (e.g. a Vercel preview domain behind Deployment Protection) rather than
  // this app. Entering the code here never leaves the app at all.
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setVerifyError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
    setVerifying(false);
    if (error) {
      setVerifyError(
        error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("invalid")
          ? "That code isn't right or has expired — check for typos, or resend a new one."
          : error.message
      );
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  }

  async function handleResend() {
    setResending(true);
    setVerifyError(null);
    setResent(false);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      setVerifyError(error.message);
      return;
    }
    setResent(true);
  }

  if (confirmationSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Check your inbox</h1>
          <p className="text-sm text-muted">
            We&apos;ve sent a 6-digit code to <span className="font-medium text-ink">{email}</span>. Enter it
            below to confirm your account.
          </p>
          <form onSubmit={handleVerify} className="space-y-3 text-left">
            <Field label="Confirmation code">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the code from your email"
              />
            </Field>
            {verifyError && <p className="text-sm text-danger">{verifyError}</p>}
            {resent && <p className="text-sm text-good">New code sent.</p>}
            <Button type="submit" fullWidth disabled={verifying || !code.trim()}>
              {verifying ? "Confirming…" : "Confirm and continue"}
            </Button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full text-center text-sm font-medium text-primaryStrong disabled:opacity-60"
            >
              {resending ? "Resending…" : "Resend code"}
            </button>
          </form>
          <Link href="/login" className="inline-block pt-2 text-sm font-medium text-primaryStrong">
            Go to sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Plan your wedding together</h1>
          <p className="mt-1 text-sm text-muted">Create an account to get started.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Your name">
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" hint="At least 6 characters">
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted">
          Already planning?{" "}
          <Link href="/login" className="font-medium text-primaryStrong">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
