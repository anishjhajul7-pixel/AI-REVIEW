import { redirect } from "next/navigation";
import { getCurrentAdmin, hasCapability } from "@/lib/admin/permissions";
import { listAdmins } from "@/app/admin/admins/actions";
import { AdminManagementTable } from "@/components/admin/AdminManagementTable";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AdminManagementPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/dashboard");
  if (!hasCapability(admin.role, "manage_admin_roles")) {
    return (
      <PageContainer width="standard">
        <PageHeader title="Admin Management" />
        <p className="mt-3 text-sm text-slate">
          You don&rsquo;t have permission to view platform administrators.
        </p>
      </PageContainer>
    );
  }

  const result = await listAdmins();
  const admins = "data" in result ? result.data : [];

  return (
    // Wide, not standard — AdminManagementTable is a real data table
    // (desktop table + mobile card fallback), genuinely table-heavy
    // content, the same reasoning already applied to the Owner
    // Overview's own wide exception, not an arbitrary inconsistency.
    <PageContainer width="wide">
      <PageHeader title="Admin Management" description="Manage platform administrators and their roles." />

      <div className="mt-6">
        <AdminManagementTable initialAdmins={admins} currentUserId={admin.userId} />
      </div>
    </PageContainer>
  );
}
