import { listMfaFactors } from "@/app/admin/mfaActions";
import { MfaEnrollmentPanel } from "@/components/admin/MfaEnrollmentPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AdminSecurityPage() {
  const result = await listMfaFactors();
  const factors = "data" in result ? result.data : [];
  const loadError = "error" in result ? result.error : null;

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="Account Security"
        description="Two-factor authentication using an authenticator app — no SMS or email required."
      />

      <div className="mt-6">
        {loadError ? (
          <p className="rounded-[var(--radius-md)] border border-danger/20 bg-danger-tint p-4 text-sm text-danger">
            {loadError}
          </p>
        ) : (
          <MfaEnrollmentPanel initialFactors={factors} />
        )}
      </div>

      <p className="mt-6 text-xs text-slate">
        Lost your authenticator? Ask another Super Admin to use the MFA recovery action for your account.
      </p>
    </PageContainer>
  );
}
