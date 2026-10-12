import type { ReactNode } from "react";

/**
 * Layout foundation, step 2 of 2 — pairs with PageContainer.tsx.
 * Confirmed by audit that page titles across the dashboard used
 * inconsistent sizes/margins (e.g. "text-[26px] sm:text-3xl" in some
 * places, plain "text-2xl" in others, with no shared spacing rule
 * between the title and what follows it) — this establishes one
 * consistent pattern instead. `actions` renders inline with the title
 * on wider screens and wraps below it on narrow ones, so a primary
 * action never collides with or truncates a long page title.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  /** A plain string covers most pages; a small number of pages genuinely need more than one line/paragraph here (e.g. Customer Actions' business summary + a second clarifying sentence) — ReactNode accepts both without a second header variant. */
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
