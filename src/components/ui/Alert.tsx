import type { ReactNode } from "react";

type Tone = "success" | "error" | "info" | "warning";

// A real, widespread fix: "success" previously used bg-verified-tint /
// text-verified-dark — verified is this project's AI/Indigo semantic
// color, not success. Every "Saved.", "Password updated.", "Thanks for
// your answer!" message across the entire app (10 real call sites,
// including the core auth pages) was rendering in indigo instead of
// emerald, contradicting the established semantic color system
// maintained everywhere else. Fixed once here, correctly cascading to
// every consumer without touching each call site.
const toneStyles: Record<Tone, string> = {
  success: "bg-success-tint text-success-dark border-success/20",
  error: "bg-danger-tint text-danger border-danger/20",
  info: "bg-ink/5 text-ink-soft border-ink/10",
  // Amber — this project's established "attention" semantic color,
  // added because two real call sites (UpgradeContactState,
  // Communications' not-configured notice) were hand-rolling this
  // exact visual pattern because Alert had no warning tone to reuse.
  warning: "bg-gold-tint text-gold border-gold/25",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[var(--radius-sm)] border px-4 py-3 text-sm shadow-xs ${toneStyles[tone]}`}
    >
      {children}
    </div>
  );
}
