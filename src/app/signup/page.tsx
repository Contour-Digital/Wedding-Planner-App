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
    // succeeds but returns no session until the confirmation link is
    // clicked — sending them to onboarding now would fail, since the
    // database needs an authenticated user to create the wedding. Show a
    // "check your inbox" screen instead of redirecting blind.
    if (!data.session) {
      setConfirmationSent(true);
      return;
    }

    router.replace("/onboarding");
    router.refresh();
  }

  if (confirmationSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF8F5] px-4">
        <div className="w-full max-w-sm space-y-3 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Check your inbox</h1>
          <p className="text-sm text-muted">
            We&apos;ve sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Click it,
            then come back and sign in to start setting up your wedding.
          </p>
          <Link href="/login" className="inline-block pt-2 text-sm font-medium text-primaryStrong">
            Go to sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF8F5] px-4">
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
