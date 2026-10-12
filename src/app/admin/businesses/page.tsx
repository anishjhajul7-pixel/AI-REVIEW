import Link from "next/link";
import { searchBusinesses } from "@/app/admin/businesses/actions";
import { maskEmail } from "@/lib/admin/mask";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

/** ACTIVE -> Emerald, SUSPENDED -> Red, per the approved semantic status colors. */
const STATUS_TONE: Record<string, string> = {
  active: "bg-success-tint text-success-dark",
  inactive: "bg-ink/5 text-slate",
  suspended: "bg-danger-tint text-danger",
};

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; expiring?: string }>;
}) {
  const { q, expiring } = await searchParams;
  const entitlementExpiry = expiring === "7" || expiring === "30" ? expiring : undefined;
  const result = await searchBusinesses(q, entitlementExpiry);

  // Smallest possible way to make multi-business ownership visible
  // without restructuring this list into a grouped view: a per-owner
  // count computed from the data already fetched above, no new query.
  const ownerBusinessCounts = new Map<string, number>();
  if ("data" in result) {
    for (const b of result.data) {
      if (!b.ownerEmail) continue;
      ownerBusinessCounts.set(b.ownerEmail, (ownerBusinessCounts.get(b.ownerEmail) ?? 0) + 1);
    }
  }

  return (
    <PageContainer width="wide">
      <div className="flex flex-col gap-6">
      <PageHeader
        title="Business Accounts"
        description={"data" in result ? `${result.data.length} account${result.data.length === 1 ? "" : "s"}` : ""}
      />

      <form className="flex gap-2">
        {/* Preserve the active expiry filter across a search submit —
            otherwise searching while filtered would silently drop the
            filter, a real usability gap, not just styling. */}
        {entitlementExpiry && <input type="hidden" name="expiring" value={entitlementExpiry} />}
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by business name…"
          className="w-full max-w-sm rounded-[var(--radius-sm)] border border-border-strong bg-paper-raised px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-verified/30"
        />
        <button
          type="submit"
          className="rounded-[var(--radius-sm)] border border-border-strong px-4 py-2 text-sm text-ink-soft transition-colors hover:border-ink"
        >
          Search
        </button>
      </form>

      {entitlementExpiry && (
        <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-gold/25 bg-gold-tint px-4 py-2.5 text-sm text-ink">
          <span>
            Showing owners whose active subscription expires within {entitlementExpiry} days.
          </span>
          <Link href="/admin/businesses" className="font-medium text-verified">
            Clear filter
          </Link>
        </div>
      )}

      {"error" in result ? (
        <div className="rounded-lg border border-danger/25 bg-danger-tint p-4 text-sm text-danger">
          {result.error}
        </div>
      ) : result.data.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border-strong bg-ink/[0.015] p-8 text-center text-sm text-slate">
          No businesses found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border-strong">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-ink/[0.02] text-left font-mono text-[10px] uppercase tracking-wider text-slate">
                <th className="px-4 py-2.5">Business</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Status</th>
                {entitlementExpiry && <th className="px-4 py-2.5">Expires</th>}
                <th className="px-4 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/businesses/${b.id}`}
                      className="font-medium text-ink hover:text-verified hover:underline"
                    >
                      {b.businessName}
                    </Link>
                    {(b.category || b.city) && (
                      <p className="text-xs text-slate">
                        {[b.category, b.city].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {maskEmail(b.ownerEmail)}
                    {b.ownerEmail && (ownerBusinessCounts.get(b.ownerEmail) ?? 0) > 1 && (
                      <span className="ml-1.5 rounded-full bg-verified-tint px-1.5 py-0.5 font-mono text-[9px] text-verified-dark">
                        {ownerBusinessCounts.get(b.ownerEmail)} businesses
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_TONE[b.status]}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  {entitlementExpiry && (
                    <td className="px-4 py-3 text-xs text-gold">
                      {b.entitlementExpiresAt ? new Date(b.entitlementExpiresAt).toLocaleDateString() : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs text-slate">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </PageContainer>
  );
}
