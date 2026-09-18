"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// Every member's own account details — separate from WeddingSettingsForm's
// couple-wide fields (partner names, venue, budget, …), which stay
// owner/editor only. This is the one part of Settings every role can use,
// which is why Settings itself is now in every role's nav.
export function PersonalProfileForm() {
  const { user, refresh } = useWedding();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailPending, setEmailPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "");
        setPhone(data?.phone ?? "");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user || loading) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    setEmailPending(false);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null, phone: phone.trim() || null })
      .eq("id", user.id);
    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && trimmedEmail.toLowerCase() !== (user.email ?? "").toLowerCase()) {
      const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (emailError) {
        setError(emailError.message);
        setSaving(false);
        return;
      }
      setEmailPending(true);
    }

    await refresh();
    setSaved(true);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="space-y-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Your profile</h3>
          <p className="text-xs text-muted">Your own account details — only visible to you and the couple.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Your name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Your phone">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Your email" hint="Changing this sends a confirmation link to the new address">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {emailPending && (
          <p className="text-sm text-good">
            Check your inbox at the new address to confirm the change — your login email stays the same until
            then.
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
          {saved && !emailPending && <span className="text-sm text-good">Saved</span>}
        </div>
      </Card>
    </form>
  );
}
