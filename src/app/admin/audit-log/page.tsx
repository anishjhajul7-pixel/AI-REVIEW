import { getCurrentAdmin } from "@/lib/admin/permissions";
import { searchAuditLogs } from "@/app/admin/auditLogActions";
import { AuditLogPanel } from "@/components/admin/AuditLogPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AuditLogPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return (
      <PageContainer width="standard">
        <PageHeader title="Audit Log" />
        <p className="mt-3 text-sm text-slate">You don&rsquo;t have permission to view this.</p>
      </PageContainer>
    );
  }

  const result = await searchAuditLogs("", "all", 1);
  const rows = "data" in result ? result.data : [];
  const totalPages = "totalPages" in result ? result.totalPages : 1;

  return (
    <PageContainer width="wide">
      <PageHeader title="Audit Log" description="Every recorded administrator action on the platform, searchable." />
      <div className="mt-6">
        <AuditLogPanel initialRows={rows} initialTotalPages={totalPages} />
      </div>
    </PageContainer>
  );
}
