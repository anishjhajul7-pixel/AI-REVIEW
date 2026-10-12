import Link from "next/link";
import { redirect } from "next/navigation";
import { getSettingsSummary } from "@/app/dashboard/settings/actions";
import { BrandSettingsForm } from "@/components/dashboard/BrandSettingsForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function BrandSettingsPage() {
  const summary = await getSettingsSummary();
  if (!summary) redirect("/login");
  if (!summary.businessName) redirect("/dashboard/profile");

  return (
    <PageContainer width="standard">
      <Link href="/dashboard/settings" className="text-xs text-verified hover:underline">
        ← Settings
      </Link>
      <div className="mt-2">
        <PageHeader
          title="Brand & Experience"
          description="Control how customers experience your feedback journey."
        />
      </div>

      <div className="mt-6">
        <BrandSettingsForm
          businessName={summary.businessName}
          initialLogoUrl={summary.logoUrl}
          initialThemeId={summary.brandTheme}
        />
      </div>
    </PageContainer>
  );
}
