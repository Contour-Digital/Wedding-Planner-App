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

    // Requires "Confirm email" turned off in Supabase (Authentication ->
    // Providers -> Email) — with it off, signUp() always returns a session
    // immediately, no confirmation step. This is a fallback for the
    // unexpected case where it's still on, rather than a full confirmation
    // flow of its own.
    if (!data.session) {
      setError("Your account was created, but couldn't sign you in automatically — try signing in instead.");
      return;
    }

    router.replace("/onboarding");
    router.refresh();
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
