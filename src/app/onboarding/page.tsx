"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { CURRENCIES } from "@/lib/constants";

const STEP_LABELS = ["You & your partner", "Wedding date", "Location", "Currency & theme", "Budget"];
const TOTAL_STEPS = STEP_LABELS.length;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Five short steps rather than one long form — each screen asks one thing,
// so it reads fine on a phone and nobody has to scroll a wall of fields
// before they can start planning. Nothing is written to the database until
// the very last step, which calls create_wedding_for_current_user() once,
// atomically (wedding + owner membership + partner invite + default
// categories + the protected Ceremony row all happen together).
export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useWedding();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [partner1Name, setPartner1Name] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? ""
  );
  const [partner2Name, setPartner2Name] = useState("");
  const [partner2Email, setPartner2Email] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [primaryColour, setPrimaryColour] = useState("#9CAF98");
  const [secondaryColour, setSecondaryColour] = useState("#FFFFFF");
  const [totalBudget, setTotalBudget] = useState("");

  const emailValid = partner2Email.trim() === "" || EMAIL_RE.test(partner2Email.trim());

  const canProceed = [
    partner1Name.trim() !== "" && partner2Name.trim() !== "" && emailValid,
    weddingDate !== "",
    true, // location — always skippable
    true, // currency + theme always have valid defaults
    true, // budget — always skippable
  ][step];

  function goNext() {
    setError(null);
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleFinish();
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleFinish() {
    setSubmitting(true);
    setError(null);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setSubmitting(false);
      setError("Your session has expired or your email isn't confirmed yet. Please sign in again.");
      return;
    }

    const { error } = await supabase.rpc("create_wedding_for_current_user", {
      p_partner_1: partner1Name.trim(),
      p_partner_2: partner2Name.trim(),
      p_partner_2_email: partner2Email.trim() || null,
      p_wedding_date: weddingDate,
      p_location: location.trim() || null,
      p_currency: currency,
      p_primary_colour: primaryColour,
      p_secondary_colour: secondaryColour,
      p_total_budget: Number(totalBudget) || 0,
    });

    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF8F5] px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <div className="mb-4 flex gap-1.5">
            {STEP_LABELS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-line"}`}
              />
            ))}
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">You &amp; your partner</h1>
              <p className="mt-1 text-sm text-muted">
                Invite your partner now with full access, or skip the email and add them later from Sharing.
              </p>
            </div>
            <Field label="Your name">
              <Input value={partner1Name} onChange={(e) => setPartner1Name(e.target.value)} placeholder="Nick" />
            </Field>
            <Field label="Partner's name">
              <Input value={partner2Name} onChange={(e) => setPartner2Name(e.target.value)} placeholder="Chloe" />
            </Field>
            <Field label="Partner's email" hint="Optional — invites them with full access as soon as you finish">
              <Input
                type="email"
                value={partner2Email}
                onChange={(e) => setPartner2Email(e.target.value)}
                placeholder="chloe@example.com"
              />
            </Field>
            {!emailValid && <p className="text-sm text-danger">That email doesn&apos;t look right.</p>}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">When&apos;s the big day?</h1>
              <p className="mt-1 text-sm text-muted">
                This powers your countdown and every date-based reminder in the app.
              </p>
            </div>
            <Field label="Wedding date">
              <Input type="date" required value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">Where&apos;s it happening?</h1>
              <p className="mt-1 text-sm text-muted">You can add the venue name separately later in Settings.</p>
            </div>
            <Field label="Location" hint="City or region — optional">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Byron Bay, NSW" />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">Currency &amp; theme</h1>
              <p className="mt-1 text-sm text-muted">Pick colours with the wheel or type a hex code — you can change these any time in Settings.</p>
            </div>
            <Field label="Currency">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <ColorPicker label="Primary colour" value={primaryColour} onChange={setPrimaryColour} />
            <ColorPicker label="Secondary colour" value={secondaryColour} onChange={setSecondaryColour} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">Set a budget</h1>
              <p className="mt-1 text-sm text-muted">
                A rough number is fine — this shows on your Dashboard and Budget page and you can change it whenever.
              </p>
            </div>
            <Field label="Total wedding budget" hint="Optional — skip and add it later">
              <Input
                type="number"
                min="0"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="35000"
              />
            </Field>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={goBack} disabled={submitting}>
              Back
            </Button>
          )}
          <Button fullWidth onClick={goNext} disabled={!canProceed || submitting}>
            {submitting
              ? "Setting up…"
              : step < TOTAL_STEPS - 1
              ? (step === 2 && !location.trim()) || (step === 4 && !totalBudget.trim())
                ? "Skip"
                : "Next"
              : "Start planning"}
          </Button>
        </div>
      </div>
    </div>
  );
}
