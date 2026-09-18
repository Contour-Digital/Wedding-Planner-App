"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { CURRENCIES } from "@/lib/constants";
import { DEFAULT_EXPENSE_CATEGORIES, estimateCategoryBudget } from "@/lib/utils/categoryEstimates";
import { formatCurrency } from "@/lib/utils/currency";
import { copyToClipboard } from "@/lib/utils/clipboard";

const STEP_LABELS = [
  "You & your partner",
  "Wedding date",
  "Location",
  "Guest count",
  "Currency",
  "Categories",
  "Budget targets",
];
const TOTAL_STEPS = STEP_LABELS.length;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONBOARDING_DRAFT_KEY = "wedding-planner:onboarding-draft";

interface OnboardingDraft {
  step: number;
  partner1Name: string;
  partner2Name: string;
  partner2Email: string;
  jointEmail: string;
  weddingDate: string;
  location: string;
  guestCount: string;
  currency: string;
  selectedCategories: string[];
  categoryTargets: Record<string, string>;
}

// Short steps rather than one long form — each screen asks one thing, so it
// reads fine on a phone and nobody has to scroll a wall of fields before
// they can start planning. Nothing is written to the database until the
// very last step, which calls create_wedding_for_current_user() once,
// atomically (wedding + owner membership + partner invite + only the
// expense categories the couple picked, each seeded with its own target
// budget, + the protected Ceremony row — all happen together).
export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useWedding();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [partnerInviteLink, setPartnerInviteLink] = useState<string | null>(null);

  const [partner1Name, setPartner1Name] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? ""
  );
  const [partner2Name, setPartner2Name] = useState("");
  const [partner2Email, setPartner2Email] = useState("");
  const [jointEmail, setJointEmail] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [location, setLocation] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...DEFAULT_EXPENSE_CATEGORIES]);
  const [categoryTargets, setCategoryTargets] = useState<Record<string, string>>({});

  // Restore a draft left behind by an accidentally-closed tab, once on
  // mount. Wrapped in try/catch per this app's existing convention for
  // storage access (see InstallPrompt.tsx) — private browsing / blocked
  // storage / a corrupted draft should never break the wizard, just leave
  // it starting fresh.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<OnboardingDraft>;
      if (typeof draft.step === "number") setStep(draft.step);
      if (typeof draft.partner1Name === "string") setPartner1Name(draft.partner1Name);
      if (typeof draft.partner2Name === "string") setPartner2Name(draft.partner2Name);
      if (typeof draft.partner2Email === "string") setPartner2Email(draft.partner2Email);
      if (typeof draft.jointEmail === "string") setJointEmail(draft.jointEmail);
      if (typeof draft.weddingDate === "string") setWeddingDate(draft.weddingDate);
      if (typeof draft.location === "string") setLocation(draft.location);
      if (typeof draft.guestCount === "string") setGuestCount(draft.guestCount);
      if (typeof draft.currency === "string") setCurrency(draft.currency);
      if (Array.isArray(draft.selectedCategories)) setSelectedCategories(draft.selectedCategories);
      if (draft.categoryTargets && typeof draft.categoryTargets === "object") {
        setCategoryTargets(draft.categoryTargets);
      }
    } catch {
      // Ignore — proceed as if there was no draft.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every change, so closing the tab mid-wizard only costs
  // whatever wasn't typed yet.
  useEffect(() => {
    try {
      const draft: OnboardingDraft = {
        step,
        partner1Name,
        partner2Name,
        partner2Email,
        jointEmail,
        weddingDate,
        location,
        guestCount,
        currency,
        selectedCategories,
        categoryTargets,
      };
      window.localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Ignore — worst case, progress isn't saved this time.
    }
  }, [
    step,
    partner1Name,
    partner2Name,
    partner2Email,
    jointEmail,
    weddingDate,
    location,
    guestCount,
    currency,
    selectedCategories,
    categoryTargets,
  ]);

  const emailValid = partner2Email.trim() === "" || EMAIL_RE.test(partner2Email.trim());
  const jointEmailValid = jointEmail.trim() === "" || EMAIL_RE.test(jointEmail.trim());
  const guestCountNumber = Number(guestCount) || 0;

  function toggleCategory(name: string) {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  function setCategoryTarget(name: string, value: string) {
    setCategoryTargets((prev) => ({ ...prev, [name]: value }));
  }

  function autoFillTargets() {
    const next: Record<string, string> = { ...categoryTargets };
    for (const name of selectedCategories) {
      next[name] = String(estimateCategoryBudget(name, guestCountNumber));
    }
    setCategoryTargets(next);
  }

  const totalTarget = selectedCategories.reduce((sum, name) => sum + (Number(categoryTargets[name]) || 0), 0);

  const canProceed = [
    partner1Name.trim() !== "" && partner2Name.trim() !== "" && emailValid && jointEmailValid,
    weddingDate !== "",
    true, // location — always skippable
    true, // guest count — always skippable
    true, // currency always has a valid default
    selectedCategories.length > 0,
    true, // budget targets — always skippable, default to $0 per category
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
      p_guest_count: guestCount ? Number(guestCount) : null,
      p_currency: currency,
      p_total_budget: totalTarget,
      p_categories: selectedCategories.map((name) => ({
        name,
        target_budget: Number(categoryTargets[name]) || 0,
      })),
      p_joint_email: jointEmail.trim() || null,
    });

    if (error) {
      setSubmitting(false);
      setError(error.message);
      return;
    }
    try {
      window.localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch {
      // Ignore — non-critical cleanup.
    }

    // create_wedding_for_current_user() creates a pending wedding_members
    // row for the partner's email (same shape as an invite from Sharing —
    // invited_email set, user_id null) but has no way to hand back a link
    // itself, so it's looked up here the same way Sharing's "Copy invite
    // link" does: the row's own id is the link. Skipped entirely if no
    // partner email was given.
    if (partner2Email.trim()) {
      const { data: ownerRow } = await supabase
        .from("wedding_members")
        .select("wedding_id")
        .eq("user_id", currentUser.id)
        .eq("role", "owner")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: partnerRow } = ownerRow
        ? await supabase
            .from("wedding_members")
            .select("id")
            .eq("wedding_id", ownerRow.wedding_id)
            .ilike("invited_email", partner2Email.trim())
            .maybeSingle()
        : { data: null };

      if (partnerRow) {
        setSubmitting(false);
        const link = `${window.location.origin}/invite/${partnerRow.id}`;
        setPartnerInviteLink(link);
        await copyToClipboard(link);
        return;
      }
    }

    setSubmitting(false);
    router.replace("/dashboard");
    router.refresh();
  }

  if (partnerInviteLink) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">You&apos;re all set! 🎉</h1>
            <p className="mt-1 text-sm text-muted">
              Share this link with {partner2Name.trim() || "your partner"} to give them full access — it&apos;s
              already copied to your clipboard.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={partnerInviteLink} onFocus={(e) => e.target.select()} />
            <Button variant="secondary" onClick={() => copyToClipboard(partnerInviteLink)}>
              Copy
            </Button>
          </div>
          <Button
            fullWidth
            onClick={() => {
              router.replace("/dashboard");
              router.refresh();
            }}
          >
            Continue to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
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
                Invite your partner now with full access, or skip this and add them later from Sharing.
              </p>
            </div>
            <Field label="Your name">
              <Input value={partner1Name} onChange={(e) => setPartner1Name(e.target.value)} placeholder="Nick" />
            </Field>
            <Field label="Partner's name">
              <Input value={partner2Name} onChange={(e) => setPartner2Name(e.target.value)} placeholder="Chloe" />
            </Field>
            <Field
              label="Partner's email"
              hint="Optional — gives you a link to share with them, with full access, as soon as you finish"
            >
              <Input
                type="email"
                value={partner2Email}
                onChange={(e) => setPartner2Email(e.target.value)}
                placeholder="chloe@example.com"
              />
            </Field>
            {!emailValid && <p className="text-sm text-danger">That email doesn&apos;t look right.</p>}
            <Field
              label="Joint email"
              hint="Optional — replies to invite emails you send from Sharing go here instead of to you personally"
            >
              <Input
                type="email"
                value={jointEmail}
                onChange={(e) => setJointEmail(e.target.value)}
                placeholder="thenickandchloe@example.com"
              />
            </Field>
            {!jointEmailValid && <p className="text-sm text-danger">That email doesn&apos;t look right.</p>}
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
              <h1 className="font-display text-2xl font-semibold text-ink">How many guests?</h1>
              <p className="mt-1 text-sm text-muted">
                A rough number is fine — it&apos;s used to suggest starting budgets for each category next.
              </p>
            </div>
            <Field label="Guest count" hint="Optional — skip and add it later">
              <Input
                type="number"
                min="0"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="80"
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">Currency</h1>
              <p className="mt-1 text-sm text-muted">You can change this any time in Settings.</p>
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
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">What do you want to track?</h1>
              <p className="mt-1 text-sm text-muted">
                Pick the expense categories you want a budget for — you can add, rename or remove these any time.
              </p>
            </div>
            <div className="space-y-2">
              {DEFAULT_EXPENSE_CATEGORIES.map((name) => (
                <label
                  key={name}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-medium ${
                    selectedCategories.includes(name) ? "border-primaryStrong bg-primary/10" : "border-line"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(name)}
                    onChange={() => toggleCategory(name)}
                  />
                  {name}
                </label>
              ))}
            </div>
            {selectedCategories.length === 0 && (
              <p className="text-sm text-danger">Pick at least one category to continue.</p>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">Set a target for each category</h1>
              <p className="mt-1 text-sm text-muted">
                Type your own numbers, or auto-fill starting figures based on a rough Australian per-guest average
                and your guest count{guestCountNumber === 0 && " (enter a guest count on the previous step first)"}.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={autoFillTargets} disabled={guestCountNumber === 0}>
              Auto-fill from Australian averages
            </Button>
            <div className="space-y-3">
              {selectedCategories.map((name) => (
                <Field key={name} label={name}>
                  <Input
                    type="number"
                    min="0"
                    value={categoryTargets[name] ?? ""}
                    onChange={(e) => setCategoryTarget(name, e.target.value)}
                    placeholder="0"
                  />
                </Field>
              ))}
            </div>
            <p className="text-sm font-medium text-ink">
              Total target budget: {formatCurrency(totalTarget, currency)}
            </p>
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
              ? (step === 2 && !location.trim()) || (step === 3 && !guestCount.trim())
                ? "Skip"
                : "Next"
              : "Start planning"}
          </Button>
        </div>
      </div>
    </div>
  );
}
