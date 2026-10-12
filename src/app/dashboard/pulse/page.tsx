import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/Alert";
import { PulseManager } from "@/components/dashboard/pulse/PulseManager";
import type { PollWithResults } from "@/app/dashboard/pulse/actions";
import { getSegmentConfig, generateSegmentPulseQuestions } from "@/lib/segments/engine";
import { getActiveBusiness } from "@/lib/business/activeBusiness";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

const RESPONSE_SCAN_LIMIT = 5000;

export default async function CustomerPulsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { business } = await getActiveBusiness(supabase);

  if (!business) {
    return (
      <PageContainer width="narrow">
        <PageHeader title="Customer Pulse" />
        <div className="mt-4">
          <Alert tone="info">
            Set up your{" "}
            <Link href="/dashboard/profile" className="font-medium text-verified hover:underline">
              business profile
            </Link>{" "}
            first — polls are tied to it.
          </Alert>
        </div>
      </PageContainer>
    );
  }

  const { data: polls } = await supabase
    .from("customer_pulse_polls")
    .select("id, public_code, question, options, is_active, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const pollIds = (polls ?? []).map((p) => p.id);

  const responseCounts = new Map<string, number[]>();
  if (pollIds.length > 0) {
    const { data: responses } = await supabase
      .from("customer_pulse_responses")
      .select("poll_id, option_index")
      .in("poll_id", pollIds)
      .limit(RESPONSE_SCAN_LIMIT);

    for (const poll of polls ?? []) {
      responseCounts.set(poll.id, new Array(poll.options.length).fill(0));
    }
    for (const r of responses ?? []) {
      const counts = responseCounts.get(r.poll_id);
      if (counts && r.option_index >= 0 && r.option_index < counts.length) {
        counts[r.option_index] += 1;
      }
    }
  }

  const pollsWithResults: PollWithResults[] = (polls ?? []).map((p) => {
    const optionCounts = responseCounts.get(p.id) ?? new Array(p.options.length).fill(0);
    return {
      id: p.id,
      publicCode: p.public_code,
      question: p.question,
      options: p.options,
      isActive: p.is_active,
      createdAt: p.created_at,
      totalResponses: optionCounts.reduce((sum, c) => sum + c, 0),
      optionCounts,
    };
  });

  const segmentConfig =
    business.industry_slug && business.segment_slug
      ? getSegmentConfig(business.industry_slug, business.segment_slug)
      : null;
  const suggestedQuestions = segmentConfig ? generateSegmentPulseQuestions(segmentConfig) : [];

  return (
    <PageContainer width="narrow">
      <PageHeader title="Customer Pulse" description="Ask a quick one-question poll and get a real answer, fast." />

      <div className="mt-6">
        <PulseManager
          initialPolls={pollsWithResults}
          suggestedQuestions={suggestedQuestions}
          segmentName={segmentConfig?.displayName ?? null}
        />
      </div>
    </PageContainer>
  );
}
