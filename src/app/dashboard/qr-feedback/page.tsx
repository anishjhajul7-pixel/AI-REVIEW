import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QrFeedbackPanel } from "@/components/dashboard/QrFeedbackPanel";
import { Alert } from "@/components/ui/Alert";
import { isAiConfigured } from "@/lib/ai/reviewDraft";
import { getSegmentConfig, getFeedbackTagsForSegment } from "@/lib/segments/engine";
import { DEFAULT_FEEDBACK_TAGS } from "@/lib/config/tags";
import { getActiveBusiness } from "@/lib/business/activeBusiness";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function QrFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { business } = await getActiveBusiness(supabase);

  if (!business) {
    return (
      <PageContainer width="narrow">
        <PageHeader title="QR Feedback" />
        <div className="mt-4">
          <Alert tone="info">
            Set up your{" "}
            <Link href="/dashboard/profile" className="font-medium text-verified hover:underline">
              business profile
            </Link>{" "}
            first — your feedback link and QR code are tied to it.
          </Alert>
        </div>
      </PageContainer>
    );
  }

  const { data: link } = await supabase
    .from("feedback_links")
    .select("public_code, is_active, tags, created_at")
    .eq("business_id", business.id)
    .maybeSingle();

  // Milestone B: suggest (never silently apply) segment tags for an
  // EXISTING link whose tags still exactly match the generic default —
  // i.e. the owner hasn't customized them. If they've already customized
  // their tags (to anything, segment-derived or not), that's respected and
  // no suggestion is shown — this never overwrites a deliberate choice.
  const segmentConfig =
    business.industry_slug && business.segment_slug
      ? getSegmentConfig(business.industry_slug, business.segment_slug)
      : null;

  let segmentTagSuggestion: { segmentName: string; tags: string[] } | null = null;
  if (segmentConfig && link) {
    const currentSet = new Set(link.tags);
    const defaultSet = new Set(DEFAULT_FEEDBACK_TAGS as readonly string[]);
    const stillGeneric =
      currentSet.size === defaultSet.size && [...currentSet].every((t) => defaultSet.has(t));

    const segmentTags = getFeedbackTagsForSegment(segmentConfig);
    const alreadyMatchesSegment =
      currentSet.size === segmentTags.length && segmentTags.every((t) => currentSet.has(t));

    if (stillGeneric && !alreadyMatchesSegment) {
      segmentTagSuggestion = { segmentName: segmentConfig.displayName, tags: segmentTags };
    }
  }

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="QR Feedback"
        description="One link and QR code your customers can scan to leave feedback — no app, no login for them."
      />

      {!business.google_review_url ? (
        <div className="mt-4">
          <Alert tone="info">
            You haven&rsquo;t added a Google review link yet. Customers will
            still be able to leave feedback, but they won&rsquo;t have anywhere
            to post a public Google review until you{" "}
            <Link href="/dashboard/profile" className="font-medium text-verified hover:underline">
              add one to your business profile
            </Link>
            .
          </Alert>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-verified/25 bg-verified-tint px-4 py-3">
          <p className="text-sm text-verified-dark">Google review link configured.</p>
          <a
            href={business.google_review_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-[var(--radius-sm)] border border-verified/30 px-3 py-1.5 text-xs font-medium text-verified-dark transition-colors hover:border-verified"
          >
            Test link
          </a>
        </div>
      )}

      <div className="mt-6">
        <QrFeedbackPanel
          initialLink={
            link
              ? {
                  publicCode: link.public_code,
                  isActive: link.is_active,
                  tags: link.tags,
                  createdAt: link.created_at,
                }
              : null
          }
          segmentTagSuggestion={segmentTagSuggestion}
        />
      </div>

      <div className="mt-8 rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-5 shadow-xs">
        <p className="font-mono text-[10px] uppercase tracking-wider text-slate">
          AI Review Assistant
        </p>
        <p className="mt-2 text-sm text-ink">
          {isAiConfigured() ? (
            <>
              <span className="text-verified font-medium">Configured.</span>{" "}
              Customer drafts are lightly polished by the model, grounded only
              in what the customer entered.
            </>
          ) : (
            <>
              <span className="text-slate font-medium">Not configured.</span>{" "}
              Customer drafts are still generated — composed directly from
              their star rating, tags, and message — just without model
              polishing. Set <code className="text-xs">AI_PROVIDER_API_KEY</code>{" "}
              to enable that.
            </>
          )}
        </p>
      </div>
    </PageContainer>
  );
}
