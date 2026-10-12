import type { FeedbackAnalytics } from "@/lib/analytics/computeFeedbackAnalytics";

/**
 * Shared, hand-built SVG visualizations used by both the desktop
 * (DashboardHeroCards) and mobile (MobileHome) Owner Dashboard —
 * extracted here specifically so Batch 2 (mobile) reuses the exact
 * same implementation built for Batch 1 (desktop), rather than a
 * second, drifting copy. No charting library — this project has never
 * had one (confirmed via package.json) — plain SVG, the same technique
 * already used for the Experience Score ring.
 *
 * Every function here is pure presentation over data the caller
 * already has; nothing here fetches, computes business logic, or
 * fabricates a number. A genuine period-over-period score comparison
 * (shown in the reference image as "↑ 8 points from Apr 6 – May 5") is
 * deliberately NOT implemented anywhere in this app: confirmed by
 * reading ExperienceScoreResult's actual fields ({score, factors,
 * totalFeedback}) that no prior-period value is computed or stored
 * anywhere to compare against. Omitted rather than invented.
 */

export function sentimentSplit(analytics: FeedbackAnalytics): {
  positive: number;
  neutral: number;
  negative: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
} {
  const byRating = new Map(analytics.distribution.map((d) => [d.rating, d]));
  const get = (r: number) => byRating.get(r) ?? { count: 0, pct: 0 };
  return {
    positive: get(4).pct + get(5).pct,
    neutral: get(3).pct,
    negative: get(1).pct + get(2).pct,
    positiveCount: get(4).count + get(5).count,
    neutralCount: get(3).count,
    negativeCount: get(1).count + get(2).count,
  };
}

/** A real sparkline built from analytics.weeklyTrend — plain SVG polyline + area fill. */
export function TrendSparkline({
  weeklyTrend,
  className = "h-10 w-full max-w-[140px]",
}: {
  weeklyTrend: FeedbackAnalytics["weeklyTrend"];
  className?: string;
}) {
  // computeFeedbackAnalytics() always returns a full set of weekly
  // buckets (8 by default), even with zero real submissions — every
  // bucket just has count: 0. So `weeklyTrend.length < 2` could never
  // actually happen; the real "no data" signal is every bucket being
  // empty, which would otherwise draw a flat, real-but-uninformative
  // zero line rather than fabricating anything, but isn't a clear or
  // helpful empty state either.
  const hasAnyData = weeklyTrend.some((b) => b.count > 0);
  if (weeklyTrend.length < 2 || !hasAnyData) {
    return <p className="text-xs text-ink-soft">No feedback yet — your trend will build up here.</p>;
  }
  const w = 200;
  const h = 40;
  const max = Math.max(...weeklyTrend.map((b) => b.count), 1);
  const stepX = w / (weeklyTrend.length - 1);
  const points = weeklyTrend.map((b, i) => {
    const x = i * stepX;
    const y = h - (b.count / max) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const last = weeklyTrend[weeklyTrend.length - 1];
  const prev = weeklyTrend[weeklyTrend.length - 2];
  const direction = last.count > prev.count ? "up" : last.count < prev.count ? "down" : "flat";
  const directionLabel =
    direction === "up"
      ? `↑ ${prev.count} → ${last.count}`
      : direction === "down"
        ? `↓ ${prev.count} → ${last.count}`
        : `→ steady at ${last.count}`;
  const directionColor = direction === "up" ? "text-success-dark" : direction === "down" ? "text-danger" : "text-slate";

  return (
    <div className="flex items-center gap-3">
      <svg viewBox={`0 0 ${w} ${h}`} className={`${className} overflow-visible`}>
        <polyline
          points={`0,${h} ${points.join(" ")} ${w},${h}`}
          fill="var(--color-voice-tint)"
          stroke="none"
          opacity={0.5}
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="var(--color-voice)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={w} cy={h - (last.count / max) * (h - 6) - 3} r={3} fill="var(--color-voice)" />
      </svg>
      <span className={`shrink-0 text-xs font-medium ${directionColor}`}>{directionLabel}</span>
    </div>
  );
}

/** A real color-coded stacked sentiment bar, with real counts alongside the percentages. */
export function SentimentBar({
  sentiment,
  showCounts = false,
}: {
  sentiment: ReturnType<typeof sentimentSplit>;
  showCounts?: boolean;
}) {
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
        {sentiment.positive > 0 && <div className="bg-success" style={{ width: `${sentiment.positive}%` }} />}
        {sentiment.neutral > 0 && <div className="bg-gold" style={{ width: `${sentiment.neutral}%` }} />}
        {sentiment.negative > 0 && <div className="bg-danger" style={{ width: `${sentiment.negative}%` }} />}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-success-dark">
          {sentiment.positive}% positive{showCounts ? ` · ${sentiment.positiveCount}` : ""}
        </span>
        <span className="text-slate">
          {sentiment.neutral}% neutral{showCounts ? ` · ${sentiment.neutralCount}` : ""}
        </span>
        <span className="text-danger">
          {sentiment.negative}% negative{showCounts ? ` · ${sentiment.negativeCount}` : ""}
        </span>
      </div>
    </div>
  );
}

/** Top themes from analytics.tagBreakdown — real, already-computed tag-frequency data. */
export function TopThemes({ tagBreakdown, max: maxItems = 4 }: { tagBreakdown: FeedbackAnalytics["tagBreakdown"]; max?: number }) {
  const top = [...tagBreakdown].sort((a, b) => b.count - a.count).slice(0, maxItems);
  if (top.length === 0) return null;
  const maxCount = top[0].count;

  return (
    <div className="flex flex-col gap-2">
      {top.map((t) => (
        <div key={t.tag} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-xs text-ink-soft">{t.tag}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
            <div
              className={t.avgRating >= 4 ? "h-full bg-success" : t.avgRating >= 3 ? "h-full bg-gold" : "h-full bg-danger"}
              style={{ width: `${Math.max(8, (t.count / maxCount) * 100)}%` }}
            />
          </div>
          <span className="w-5 shrink-0 text-right text-[11px] text-slate">{t.count}</span>
        </div>
      ))}
    </div>
  );
}

/** Star rating, matching the reference image's recent-reviews treatment, reused by both desktop and mobile. */
export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-xs text-gold" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}
