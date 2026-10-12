import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/admin/permissions";
import { getPlatformSettings } from "@/app/admin/platformSettingsActions";
import { MultiStoreSettingsPanel } from "@/components/admin/MultiStoreSettingsPanel";
import { getPlatformMetrics } from "@/app/admin/platformIntelligenceActions";
import { OwnerSearchPanel } from "@/components/admin/OwnerSearchPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

/**
 * Visual redesign pass against the approved BD Clarity reference image.
 * The prior version had two genuinely redundant KPI grids (a flat
 * 8-stat row and a separate "Platform Intelligence" grid both showing
 * business/branch counts) — consolidated into one. The "Coming in
 * Milestone 3/5" notes were factually stale: branch management has
 * existed in this data model for a long time (platformMetrics already
 * reads activeBranches/totalBranches) — an honest "not built yet" note
 * left in place after the feature shipped is actively misleading, so
 * it's removed here, not just restyled.
 *
 * Two reference elements were deliberately NOT built as literally shown:
 *  - "Owners by Plan" (Professional/Enterprise/Starter/Trial) — checked
 *    owner_entitlements' actual columns directly; there is no plan-TIER
 *    concept anywhere in this schema, only subscription_status and
 *    plan_duration. Built "Owners by Status" instead — the same donut
 *    *shape*, using a dimension that's actually real.
 *  - "Failed Logins (24h)" — rate_limit_hits records every login
 *    *attempt* (successful and failed alike), not specifically
 *    failures, since the rate-limit check runs before the password is
 *    even verified. Labeled "Login Attempts (24h)" — what is actually
 *    measured, not what the reference happened to call it.
 *  - "Admin Sessions" (a live session count) — not retrievable from
 *    Supabase without deeper session-management APIs not used here.
 *    Shown as "Active Admins" (a real, different, correctly-labeled
 *    count) instead.
 */

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** A real, hand-built SVG donut — multiple stroke-dasharray segments on
 * concentric offsets of the same circle, the same plain-SVG technique
 * already used for the Experience Score ring. No charting library. */
function StatusDonut({
  segments,
}: {
  segments: { label: string; value: number; colorVar: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <p className="text-sm text-slate">No owners configured yet.</p>;

  const circumference = 2 * Math.PI * 34;
  const arcs = segments
    .filter((s) => s.value > 0)
    .reduce<{ label: string; value: number; colorVar: string; dash: number; offset: number }[]>((acc, s) => {
      const dash = (s.value / total) * circumference;
      const offset = acc.reduce((sum, a) => sum + a.dash, 0);
      return [...acc, { ...s, dash, offset }];
    }, []);

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
          <circle cx="40" cy="40" r="34" strokeWidth="10" className="stroke-ink/[0.06]" fill="none" />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx="40"
              cy="40"
              r="34"
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${a.dash} ${circumference - a.dash}`}
              strokeDashoffset={-a.offset}
              style={{ stroke: `var(${a.colorVar})` }}
            />
          ))}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-semibold text-ink">{total}</span>
          <span className="text-[9px] text-slate">Total</span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(${s.colorVar})` }} />
            <span className="text-ink-soft">{s.label}</span>
            <span className="font-medium text-ink">{s.value}</span>
            <span className="text-slate">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-5 shadow-xs">
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-ink">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate">{sublabel}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();
  const supabase = await createClient();

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [recentAuditLogs, platformSettings, platformMetricsResult, loginAttempts24h, activeAdmins, communications24h] =
    await Promise.all([
      supabase
        .from("audit_logs")
        .select("action, target_type, result, created_at, admin_user_id")
        .order("created_at", { ascending: false })
        .limit(8),
      getPlatformSettings(),
      getPlatformMetrics(),
      supabase
        .from("rate_limit_hits")
        .select("id", { count: "exact", head: true })
        .eq("scope", "login_attempt_email")
        .gte("created_at", since24h),
      supabase.from("admin_role_assignments").select("id", { count: "exact", head: true }).is("revoked_at", null),
      supabase.from("communication_history").select("channel, status").gte("created_at", since24h),
    ]);

  const platformMetrics = "data" in platformMetricsResult ? platformMetricsResult.data : null;

  const commCounts = { emails: 0, sms: 0, failed: 0 };
  for (const row of communications24h.data ?? []) {
    if (row.channel === "email") commCounts.emails++;
    if (row.channel === "sms") commCounts.sms++;
    if (row.status === "failed") commCounts.failed++;
  }

  return (
    <PageContainer width="wide">
      <div className="flex flex-col gap-8">
        <PageHeader title="Platform Overview" description="Real-time insights across the platform." />

        {platformMetrics ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Owners" value={platformMetrics.totalOwners} />
              <KpiCard
                label="Businesses"
                value={platformMetrics.activeBusinesses}
                sublabel={`of ${platformMetrics.totalBusinesses} total active`}
              />
              <KpiCard
                label="Branches"
                value={platformMetrics.activeBranches}
                sublabel={`of ${platformMetrics.totalBranches} total active`}
              />
              <KpiCard label="Active Entitlements" value={platformMetrics.entitlement.active} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-5 shadow-xs">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate">Owners by Status</p>
                <div className="mt-3">
                  <StatusDonut
                    segments={[
                      { label: "Active", value: platformMetrics.entitlement.active, colorVar: "--color-success" },
                      { label: "Expired", value: platformMetrics.entitlement.expired, colorVar: "--color-danger" },
                      { label: "Suspended", value: platformMetrics.entitlement.suspended, colorVar: "--color-gold" },
                      { label: "Disabled", value: platformMetrics.entitlement.disabled, colorVar: "--color-slate" },
                    ]}
                  />
                </div>
                {platformMetrics.entitlement.notConfigured > 0 && (
                  <p className="mt-3 text-xs text-slate">
                    {platformMetrics.entitlement.notConfigured} owner(s) use the platform default, not shown above.
                  </p>
                )}
              </div>

              <div className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-5 shadow-xs">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate">Entitlements Expiring</p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {/* Each row links to the real, correctly-scoped filter
                      using the exact same "active + expiry within N
                      days" definition computed just above — not a
                      generic unfiltered list. "Already expired" is a
                      different status entirely (already reflected in
                      the Owners by Status donut above), so it's left as
                      plain data here rather than wired to a filter this
                      page doesn't actually implement. */}
                  <Link
                    href="/admin/businesses?expiring=7"
                    className="flex items-center justify-between text-sm hover:underline"
                  >
                    <span className="text-ink-soft">In 7 days</span>
                    <span className="font-semibold text-danger">{platformMetrics.entitlement.expiringWithin7Days}</span>
                  </Link>
                  <Link
                    href="/admin/businesses?expiring=30"
                    className="flex items-center justify-between text-sm hover:underline"
                  >
                    <span className="text-ink-soft">In 30 days</span>
                    <span className="font-semibold text-gold">{platformMetrics.entitlement.expiringWithin30Days}</span>
                  </Link>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">Already expired</span>
                    <span className="font-semibold text-danger">{platformMetrics.entitlement.expired}</span>
                  </div>
                </div>
                <Link href="/admin/businesses" className="mt-3 inline-block text-xs font-medium text-verified">
                  View all owners →
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-4 shadow-xs">
                <p className="text-xl font-semibold text-ink">
                  {platformMetrics.multiBusinessOwners} <span className="text-sm text-slate">/ {platformMetrics.multiBranchOwners}</span>
                </p>
                <p className="text-xs text-slate">Multi-Business / Multi-Branch Owners</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-4 shadow-xs">
                <p className="text-xl font-semibold text-ink">{platformMetrics.totalBranches}</p>
                <p className="text-xs text-slate">Total Branches on Platform</p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-border-strong bg-ink/[0.015] p-6 text-center text-sm text-slate">
            Platform metrics are temporarily unavailable.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-5 shadow-xs">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate">Security</p>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">MFA enforcement</span>
                <span className="font-medium text-ink">Optional, per admin</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Active admins</span>
                <span className="font-medium text-ink">{activeAdmins.count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Login attempts (24h)</span>
                <span className="font-medium text-ink">{loginAttempts24h.count ?? 0}</span>
              </div>
            </div>
            {/* No separate platform-wide security settings feature
                exists in this app — confirmed by inspecting what's
                actually built before linking anywhere. The closest
                real destination is Admin Management, where platform-
                level access (who has admin rights, at what role) is
                actually controlled. /admin/security is deliberately
                NOT linked here — that page is confirmed to be one
                admin's own personal MFA setup, not platform security. */}
            <Link href="/admin/admins" className="mt-3 inline-block text-xs font-medium text-verified">
              Manage admin access →
            </Link>
          </div>

          <div className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-5 shadow-xs">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate">Communications (24h)</p>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Emails sent</span>
                <span className="font-medium text-ink">{commCounts.emails}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">SMS sent</span>
                <span className="font-medium text-ink">{commCounts.sms}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Failed</span>
                <span className={`font-medium ${commCounts.failed > 0 ? "text-danger" : "text-ink"}`}>{commCounts.failed}</span>
              </div>
            </div>
            <Link href="/admin/communications" className="mt-3 inline-block text-xs font-medium text-verified">
              View all communications →
            </Link>
          </div>

          <div className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate">Recent Audit Trail</p>
              <Link href="/admin/audit-log" className="text-xs font-medium text-verified">
                View all →
              </Link>
            </div>
            {recentAuditLogs.data && recentAuditLogs.data.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2.5">
                {recentAuditLogs.data.slice(0, 4).map((log, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {log.action}
                        {log.target_type && <span className="font-normal text-slate"> · {log.target_type}</span>}
                      </p>
                      <p className="text-slate">{timeAgo(log.created_at)}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                        log.result === "success" ? "bg-success-tint text-success-dark" : "bg-danger-tint text-danger"
                      }`}
                    >
                      {log.result}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate">No admin activity recorded yet.</p>
            )}
          </div>
        </div>

        {platformSettings && (
          <MultiStoreSettingsPanel
            initialEnabled={platformSettings.multistoreEnabled}
            initialMax={platformSettings.maxBusinessesPerOwner}
            canEdit={admin?.role === "super_admin"}
          />
        )}

        <OwnerSearchPanel />
      </div>
    </PageContainer>
  );
}
