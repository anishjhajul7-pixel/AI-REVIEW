"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { submitFeedback, generateDraft } from "@/app/feedback/[code]/actions";

/**
 * Final CX simplification — emoji-only reaction, no questionnaire, no
 * editable draft screen. See BD_Clarity_CHANGELOG.md for the full
 * OLD -> NEW flow rationale. The `questions` prop is kept for type
 * compatibility with the (unchanged) server page and the owner's
 * still-fully-functional question-management system — it is simply never
 * rendered here anymore.
 */
/**
 * Regression fix: the intermediate "What stood out?" signal-selection
 * step (added in an earlier milestone) has been removed from the
 * active customer journey per explicit instruction. Positive ratings
 * now go straight from the emoji tap to generation — "signals" is no
 * longer a reachable step.
 */
type Step = "emoji" | "generating" | "ready" | "recoveryDetail" | "recoveryThanks";

interface EmojiOption {
  rating: number;
  emoji: string;
  label: string;
}

const EMOJI_OPTIONS: EmojiOption[] = [
  { rating: 1, emoji: "😡", label: "Not great" },
  { rating: 2, emoji: "😕", label: "Could be better" },
  { rating: 3, emoji: "😐", label: "It was okay" },
  { rating: 4, emoji: "🙂", label: "Pretty good" },
  { rating: 5, emoji: "🤩", label: "Absolutely loved it!" },
];

export interface FeedbackContextQuestion {
  id: string;
  questionText: string;
  options: string[];
}

interface FeedbackFlowProps {
  code: string;
  businessName: string;
  category: string | null;
  city: string | null;
  logoUrl: string | null;
  tags: string[];
  /** No longer rendered — kept for type compatibility with the unchanged server page and the owner's still-functional question system. */
  questions?: FeedbackContextQuestion[];
}

export function FeedbackFlow({ code, businessName, category, city, logoUrl, tags }: FeedbackFlowProps) {
  const [step, setStep] = useState<Step>("emoji");
  const [rating, setRating] = useState(0);
  const [pressedRating, setPressedRating] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedWithNoGoogleUrl, setSavedWithNoGoogleUrl] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Regeneration counter — only increments on the customer's own
  // explicit "Regenerate" tap, never automatically. See the matching
  // comment in reviewDraft.ts's DraftInput.
  const [attempt, setAttempt] = useState(0);

  function selectEmoji(selected: EmojiOption) {
    setPressedRating(selected.rating);
    setRating(selected.rating);
    // Brief pause so the tap/highlight is actually visible — not an
    // artificial loading delay, just long enough to register as feedback
    // before the screen changes, per "subtle scale/bounce... selected
    // emoji becomes clearly highlighted... immediately continue."
    //
    // selected.rating is passed explicitly into goGenerate rather than
    // relying on the `rating` state var: this setTimeout callback was
    // created during THIS render, before setRating's update has been
    // applied, so a goGenerate that read `rating` from closure here
    // would read the PREVIOUS value, not the one just tapped. Passing
    // it as an argument sidesteps that stale-closure class of bug
    // entirely, for both this call site and the "generation failed,
    // retry" path below.
    setTimeout(() => {
      if (selected.rating >= 4) {
        goGenerate(selected.rating, 0);
      } else {
        setStep("recoveryDetail");
      }
    }, 420);
  }

  function goGenerate(ratingValue: number, nextAttempt: number) {
    setStep("generating");
    setError(null);
    startTransition(async () => {
      const result = await generateDraft({
        code,
        rating: ratingValue,
        // No signal-selection step exists anymore for positive ratings
        // — this matches the product's own prior simplified design
        // (before signal selection was added), not an oversight.
        tags: [],
        message: "",
        attempt: nextAttempt,
      });
      if ("error" in result) {
        setError(result.error);
        if (nextAttempt === 0) {
          // First-attempt failure: back to the emoji step so the
          // customer can retry — and reset pressedRating, since the
          // emoji buttons are disabled once one is pressed; without
          // this they'd be stuck unable to tap anything.
          setPressedRating(null);
          setStep("emoji");
        } else {
          // A regenerate-attempt failure keeps the customer on the
          // existing, still-valid draft rather than losing it.
          setStep("ready");
        }
        return;
      }
      setDraft(result.draft);
      setAttempt(nextAttempt);

      // Copy immediately, as soon as the review exists — per "Review is
      // copied to clipboard -> Google opens," never deferred to the
      // button click. Graceful, non-blocking fallback on failure: the
      // "ready" screen below renders a manual Copy affordance instead of
      // a false "✓ Copied" claim. Re-attempted on every regeneration too
      // — the newest draft is always the one that gets copied.
      try {
        await navigator.clipboard?.writeText(result.draft);
        setCopied(true);
      } catch {
        setCopied(false);
      }
      setStep("ready");
    });
  }

  async function manualCopy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      // Still graceful — the text is already visible on screen to select by hand.
    }
  }

  function continueToGoogle() {
    setError(null);
    startTransition(async () => {
      const result = await submitFeedback({
        code,
        rating,
        tags: [],
        message: "",
        aiDraft: draft,
        finalDraft: draft,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (result.googleReviewUrl) {
        window.location.href = result.googleReviewUrl;
        return;
      }
      setSavedWithNoGoogleUrl(true);
    });
  }

  function submitRecovery(reason: string | null) {
    setError(null);
    setRecoveryReason(reason);
    startTransition(async () => {
      const result = await submitFeedback({
        code,
        rating,
        tags: reason ? [reason] : [],
        message: "",
        aiDraft: "",
        finalDraft: "",
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStep("recoveryThanks");
    });
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Business identity — always visible */}
      <div className="flex flex-col items-center gap-2.5 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover shadow-md ring-4 ring-paper-raised"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-semibold text-white shadow-md ring-4 ring-paper-raised"
            style={{ background: "var(--gradient-brand)" }}
            aria-hidden="true"
          >
            {businessName.charAt(0)}
          </div>
        )}
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink">{businessName}</h1>
        {(category || city) && (
          <p className="text-xs text-slate">{[category, city].filter(Boolean).join(" · ")}</p>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {step === "emoji" && (
        <div className="rounded-[var(--radius-lg)] border border-border-strong bg-paper-raised p-5 sm:p-6 shadow-lg text-center">
          <p className="font-display text-xl font-semibold tracking-tight text-ink">
            How was your experience?
          </p>
          <p className="mt-1 text-sm text-slate">Your feedback helps us serve you better.</p>
          {/* Star rating, matching the approved reference image — same
              underlying 1-5 scale, same >=4 positive threshold, same
              420ms tap-then-advance interaction as before; only the
              visual control changed from emoji to stars. */}
          <div className="mt-7 flex justify-center gap-1.5 sm:gap-2">
            {EMOJI_OPTIONS.map((opt) => {
              const filled = pressedRating !== null && opt.rating <= pressedRating;
              return (
                <button
                  key={opt.rating}
                  type="button"
                  aria-label={opt.label}
                  onClick={() => selectEmoji(opt)}
                  disabled={pressedRating !== null}
                  className={`p-1 text-[2.5rem] leading-none transition-all duration-300 sm:text-5xl ${
                    filled ? "scale-110 text-gold" : "text-ink/15 hover:scale-105 hover:text-gold/50 active:scale-95"
                  }`}
                >
                  {filled ? "★" : "☆"}
                </button>
              );
            })}
          </div>
          <p className="mt-4 h-5 text-sm font-medium text-ink-soft">
            {pressedRating !== null
              ? `${pressedRating}/5 — ${EMOJI_OPTIONS.find((o) => o.rating === pressedRating)?.label}`
              : "\u00A0"}
          </p>
        </div>
      )}

      {step === "generating" && (
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-verified/20 bg-paper-raised p-4 sm:p-6 text-center shadow-lg">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{ background: "var(--gradient-brand)" }}
            aria-hidden="true"
          />
          <div className="relative flex justify-center">
            <span
              className="h-9 w-9 animate-spin rounded-full border-2 border-verified border-t-transparent"
              aria-hidden="true"
            />
          </div>
          <p className="relative mt-4 font-display text-lg font-semibold text-ink">
            Understanding your experience…
          </p>
          <p className="relative mt-1 text-sm text-verified-dark">
            BD Clarity is reading between the lines ✨
          </p>
        </div>
      )}

      {step === "ready" && !savedWithNoGoogleUrl && (
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-verified/20 bg-paper-raised p-4 sm:p-6 shadow-lg">
          {/* A restrained top accent, not a full gradient card — "AI result
              highlight" per the gradient rule, applied once, not everywhere. */}
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: "var(--gradient-brand)" }}
            aria-hidden="true"
          />

          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-verified-dark">
            <span aria-hidden="true">✨</span>
            Your review draft
          </div>
          <p className="mt-1 text-center text-sm text-slate">Here&rsquo;s what we&rsquo;ve drafted for you.</p>

          <div className="mt-4 rounded-[var(--radius-md)] border border-verified/15 bg-verified-tint/40 p-4 text-sm leading-relaxed text-ink">
            {draft}
          </div>
          <p className="mt-1.5 text-right text-[11px] text-slate">{draft.length} characters</p>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => goGenerate(rating, attempt + 1)}
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-border-strong bg-paper-raised px-3 py-2.5 text-sm font-medium text-ink-soft shadow-xs transition-colors hover:border-verified/40 disabled:opacity-50"
            >
              <span aria-hidden="true">🔄</span> Regenerate
            </button>
            <button
              type="button"
              onClick={manualCopy}
              className="flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-border-strong bg-paper-raised px-3 py-2.5 text-sm font-medium text-ink-soft shadow-xs transition-colors hover:border-verified/40"
            >
              <span aria-hidden="true">{copied ? "✓" : "📋"}</span> {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <Button
            onClick={continueToGoogle}
            loading={isPending}
            className="mt-5 w-full shadow-premium"
            size="lg"
            style={{ background: "var(--gradient-brand)" }}
          >
            Continue to Google →
          </Button>
          <p className="mt-2 text-center text-xs text-slate">You&rsquo;ll be taken to Google to post your review.</p>
        </div>
      )}

      {step === "ready" && savedWithNoGoogleUrl && (
        <div className="rounded-[var(--radius-lg)] border border-success/25 bg-success-tint p-4 sm:p-6 text-center shadow-lg">
          <p className="font-display text-lg font-semibold text-success-dark">
            Your voice has been heard — thank you!
          </p>
          <p className="mt-1.5 text-sm text-success-dark">
            Your feedback was sent directly to {businessName}.
          </p>
        </div>
      )}

      {step === "recoveryDetail" && (
        <div className="rounded-[var(--radius-lg)] border border-border-strong bg-paper-raised p-4 sm:p-6 shadow-lg text-center">
          <p className="font-display text-lg font-semibold text-ink">We&rsquo;d love to make this better. 💛</p>
          <p className="mt-1 text-sm text-ink-soft">What went wrong? (optional)</p>

          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {tags.slice(0, 6).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => submitRecovery(tag)}
                  disabled={isPending}
                  className="rounded-full border-2 border-border-strong bg-paper-raised px-4 py-2 text-sm font-medium text-ink-soft transition-all duration-150 hover:border-ink/40 hover:bg-ink/[0.03] active:scale-95 disabled:opacity-50"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => submitRecovery(null)}
            disabled={isPending}
            className="mt-5 text-sm text-slate underline disabled:opacity-50"
          >
            {isPending && recoveryReason === null ? "Sending…" : "Skip this"}
          </button>
        </div>
      )}

      {step === "recoveryThanks" && (
        <div className="rounded-[var(--radius-lg)] border border-success/25 bg-success-tint p-4 sm:p-6 text-center shadow-lg">
          <p className="font-display text-lg font-semibold text-success-dark">Thank you for telling us.</p>
          <p className="mt-1.5 text-sm text-success-dark">
            Your feedback has been shared with the team at {businessName}.
          </p>
        </div>
      )}
    </div>
  );
}
