import type { ReactNode } from "react";

/**
 * Layout foundation, step 1 of 2 — see PageHeader.tsx for the other
 * half. Confirmed by direct audit that no shared container existed:
 * branches/page.tsx, feedback/page.tsx, and intelligence/page.tsx each
 * used a different, seemingly arbitrary max-width (2xl, lg, 3xl, 4xl)
 * with no documented rationale, causing the content edge to visibly
 * shift between routes — exactly the "shifting unpredictably between
 * routes" problem this fixes.
 *
 * Three tiers, chosen to match what the content on each page genuinely
 * needs, not an arbitrary number of options:
 *   narrow   (max-w-2xl,  ~672px)  — a single form or a short, focused page (e.g. Branches)
 *   standard (max-w-4xl,  ~896px)  — most content pages: cards, moderate density (e.g. Intelligence, Settings)
 *   wide     (max-w-6xl, ~1152px)  — data-table-heavy pages; also what the existing
 *                                    dashboard shell (dashboard/layout.tsx) already
 *                                    uses for its own outer frame, so "wide" pages
 *                                    use the full available shell width rather than
 *                                    constraining further
 *
 * Horizontal page padding is NOT applied here — the dashboard shell
 * (dashboard/layout.tsx) already applies it once, around all page
 * content; adding it again here would double it. This component
 * handles width/centering only. The shell's own padding was adjusted
 * alongside this component (see its own comment) to step responsively
 * — 16px mobile / 24px tablet / 32px desktop — matching the brief's
 * exact targets, expressed via Tailwind's default spacing scale, which
 * already numerically matches the requested token values, so no
 * second, parallel spacing-token system was introduced alongside it.
 */

const WIDTH: Record<"narrow" | "standard" | "wide", string> = {
  narrow: "max-w-2xl",
  standard: "max-w-4xl",
  wide: "max-w-6xl",
};

export function PageContainer({
  width = "standard",
  children,
  className = "",
}: {
  width?: "narrow" | "standard" | "wide";
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full ${WIDTH[width]} ${className}`}>{children}</div>;
}
