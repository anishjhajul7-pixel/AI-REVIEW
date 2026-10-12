import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/business/activeBusiness";
import { listBranches, getBranchEntitlementSummary } from "@/app/dashboard/branches/actions";
import { BranchManager } from "@/components/dashboard/BranchManager";
import { getBanaoContactDestination } from "@/lib/config/contact";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function BranchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { business } = await getActiveBusiness(supabase);
  if (!business) redirect("/dashboard/profile");

  const [branchesResult, entitlement] = await Promise.all([listBranches(), getBranchEntitlementSummary()]);
  const branches = "data" in branchesResult ? branchesResult.data : [];
  const contact = getBanaoContactDestination();

  return (
    <PageContainer width="narrow">
      <PageHeader title="Branches" description={`${business.business_name} — locations and branches.`} />

      <div className="mt-8">
        <BranchManager
          initialBranches={branches}
          multiBranchEnabled={entitlement?.multiBranchEnabled ?? false}
          maxBranches={entitlement?.maxBranches ?? 1}
          currentActiveCount={entitlement?.currentActiveBranchCount ?? 0}
          contact={contact}
        />
      </div>
    </PageContainer>
  );
}
