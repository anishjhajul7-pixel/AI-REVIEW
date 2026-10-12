import Link from "next/link";
import type { FeedbackAnalytics } from "@/lib/analytics/computeFeedbackAnalytics";
import type { ExperienceScoreResult } from "@/lib/insights/experienceScore";
import type { RecommendedAction } from "@/lib/insights/types";
import { sentimentSplit, TrendSparkline, SentimentBar, TopThemes, StarRating } from "@/components/dashboard/DashboardVisualizations";

/**
 * Visual redesign pass — the prior version (Phase 5) correctly
 * established the Listen -> Understand -> Act information architecture
 * but presented every number as plain text (emoji + percentage,
 * a literal trend sentence like "Up from 3 to 5 this week"). This pass
 * adds real, hand-built SVG visualizations — a sentiment bar, a trend
 * sparkline, a top-themes breakdown, a recent-reviews strip — using
 * data that was already being computed and passed down
 * (analytics.tagBreakdown, analytics.weeklyTrend) but never actually
 * displayed. No new npm dependency: the sparkline/bars are plain SVG,
 * the same technique already used for the Experience Score ring. No
 * new query, no invented numbers — every value here traces to the
 * same analytics object already computed in dashboard/page.tsx.
 */

interface RecentMessage {
  message: string;
  rating: number;
  createdAt: string;
}

type Tone = "verified" | "success" | "voice" | "gold" | "danger" | "slate";

const TONE_CLASSES: Record<Tone, { border: string; bg: string; text: string; dot: string }> = {
  verified: { border: "border-verified/20", bg: "bg-verified-tint", text: "text-verified-dark", dot: "bg-verified" },
  success: { border: "border-success/20", bg: "bg-success-tint", text: "text-success-dark", dot: "bg-success" },
  voice: { border: "border-voice/20", bg: "bg-voice-tint", text: "text-voice-dark", dot: "bg-voice" },
  gold: { border: "border-gold/25", bg: "bg-gold-tint", text: "text-gold", dot: "bg-gold" },
  danger: { border: "border-danger/20", bg: "bg-danger-tint", text: "text-danger", dot: "bg-danger" },
  slate: { border: "border-border-strong", bg: "bg-paper-raised", text: "text-ink-soft", dot: "bg-slate" },
};

/** Static lookup, never a dynamically-built class string — see the
 * project's own established caution: Tailwind's JIT can't see through
 * `stroke-${tone}`-style interpolation, so it would silently compile
 * with no color. */
const SCORE_RING_CLASS: Record<"success" | "gold" | "danger", string> = {
  success: "stroke-success",
  gold: "stroke-gold",
  danger: "stroke-danger",
};
const SCORE_TEXT_CLASS: Record<"success" | "gold" | "danger", string> = {
  success: "text-success-dark",
  gold: "text-gold",
  danger: "text-danger",
};

function scoreTone(score: number): { tone: "success" | "gold" | "danger"; label: string; context: string } {
  if (score >= 70)
    return { tone: "success", label: "Excellent", context: "Customer experience is trending positively." };
  if (score >= 40)
    return { tone: "gold", label: "Needs attention", context: "A mixed picture — real room to improve." };
  return { tone: "danger", label: "At risk", context: "Recent feedback points to real issues." };
}

function SectionLabel({ eyebrow, title, tone }: { eyebrow: string; title: string; tone: Tone }) {
  return (
    <p className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-slate">
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_CLASSES[tone].dot}`} aria-hidden="true" />
      {eyebrow}
      <span className="mx-0.5 text-slate/40">·</span>
      <span className="font-display text-[13px] normal-case tracking-normal text-ink">{title}</span>
    </p>
  );
}

function RecentReviewsStrip({ messages }: { messages: RecentMessage[] }) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-slate">Recent Reviews</p>
        <Link href="/dashboard/feedback" className="text-xs font-medium text-verified">
          View all →
        </Link>
      </div>
      {messages.length === 0 ? (
        <p className="mt-2 text-sm text-slate">Customer reviews will show up here once they start coming in.</p>
      ) : (
        <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
          {messages.slice(0, 3).map((m, i) => (
            <div key={i} className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-3.5 shadow-xs">
              <StarRating rating={m.rating} />
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-soft">&ldquo;{m.message}&rdquo;</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardHeroCards({
  score,
  analytics,
  topAction,
  recentMessages,
}: {
  score: ExperienceScoreResult;
  analytics: FeedbackAnalytics;
  topAction: RecommendedAction | null;
  recentMessages: RecentMessage[];
}) {
  const sentiment = analytics.total > 0 ? sentimentSplit(analytics) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* INSIGHT — Experience Score, the dominant hero element */}
      <Link
        href="/dashboard/intelligence"
        className="relative block overflow-hidden rounded-[var(--radius-lg)] border border-border-strong bg-paper-raised p-6 shadow-sm transition-transform hover:-translate-y-0.5"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ background: "var(--gradient-brand)" }}
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-center gap-6">
          {/* The score ring and the sentiment/themes sections below it are
              now independent of each other — each shows its own honest
              empty state based on its own data sufficiency, rather than
              sentiment/themes being hidden entirely whenever the score
              itself isn't ready yet (score needs 5+ submissions;
              sentiment only needs 1+, so this was hiding real, available
              sentiment data for any business with 1-4 submissions). */}
          {score.score !== null ? (
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 80 80" className="h-28 w-28 -rotate-90">
                <circle cx="40" cy="40" r="34" strokeWidth="7" className="stroke-ink/[0.07]" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  strokeWidth="7"
                  fill="none"
                  strokeLinecap="round"
                  className={SCORE_RING_CLASS[scoreTone(score.score).tone]}
                  strokeDasharray={`${(score.score / 100) * 213.6} 213.6`}
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-semibold text-ink">{score.score}</span>
                <span className="text-[9px] text-slate">/ 100</span>
              </span>
            </div>
          ) : (
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink/10">
              <span className="text-center text-[11px] leading-tight text-slate">Not enough
                <br />
                data yet
              </span>
            </div>
          )}

          <div className="min-w-[180px] flex-1">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate">Experience Score</p>
            {score.score !== null ? (
              <>
                <p className={`mt-1 text-base font-semibold ${SCORE_TEXT_CLASS[scoreTone(score.score).tone]}`}>
                  ● {scoreTone(score.score).label}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{scoreTone(score.score).context}</p>
              </>
            ) : (
              <>
                <p className="mt-1 font-display text-lg font-semibold text-ink">Not enough data yet</p>
                <p className="mt-1 text-sm text-slate">Collect more customer feedback to establish your baseline.</p>
              </>
            )}
            {sentiment ? (
              <div className="mt-3">
                <SentimentBar sentiment={sentiment} showCounts />
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate">Customer sentiment will appear as feedback arrives.</p>
            )}
          </div>

          <div className="w-full border-t border-border pt-4 sm:w-56 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate">Top Themes</p>
            <div className="mt-2">
              {analytics.tagBreakdown.length > 0 ? (
                <TopThemes tagBreakdown={analytics.tagBreakdown} />
              ) : (
                <p className="text-xs text-slate">Common themes from customer feedback will show up here.</p>
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LISTEN — Customer Voice, now with a real sparkline */}
        <Link
          href="/dashboard/feedback"
          className={`block rounded-[var(--radius-lg)] border ${TONE_CLASSES.voice.border} ${TONE_CLASSES.voice.bg} p-5 transition-transform hover:-translate-y-0.5`}
        >
          <SectionLabel eyebrow="Listen" title="Customer Voice" tone="voice" />
          <p className="mt-3 text-2xl font-semibold text-ink">{analytics.total}</p>
          <p className="text-xs text-slate">submissions in the last 30 days</p>
          <div className="mt-2">
            <TrendSparkline weeklyTrend={analytics.weeklyTrend} />
          </div>
        </Link>

        {/* UNDERSTAND — AI Intelligence, now with the same sentiment bar */}
        <Link
          href="/dashboard/intelligence"
          className={`block rounded-[var(--radius-lg)] border ${TONE_CLASSES.verified.border} ${TONE_CLASSES.verified.bg} p-5 transition-transform hover:-translate-y-0.5`}
        >
          <SectionLabel eyebrow="Understand" title="AI Customer Intelligence" tone="verified" />
          {sentiment ? (
            <div className="mt-3">
              <SentimentBar sentiment={sentiment} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate">Customer sentiment will appear as feedback arrives.</p>
          )}
        </Link>

        {/* ACT — Needs Attention + AI Recommendation, ONE object, shown once */}
        <Link
          href="/dashboard/actions"
          className={`block rounded-[var(--radius-lg)] border ${
            topAction ? TONE_CLASSES.gold.border : TONE_CLASSES.success.border
          } ${topAction ? TONE_CLASSES.gold.bg : TONE_CLASSES.success.bg} p-5 transition-transform hover:-translate-y-0.5`}
        >
          <SectionLabel eyebrow="Act" title={topAction ? "Needs Attention" : "All Clear"} tone={topAction ? "gold" : "success"} />
          {topAction ? (
            <>
              <p className="mt-3 text-sm font-semibold text-ink">⚠️ {topAction.title}</p>
              {topAction.recommendation && (
                <p className="mt-2 text-xs text-verified-dark">✨ {topAction.recommendation}</p>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-ink">✨ Nothing urgent right now.</p>
          )}
        </Link>
      </div>

      <RecentReviewsStrip messages={recentMessages} />
    </div>
  );
}
