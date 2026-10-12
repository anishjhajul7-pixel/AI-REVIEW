import { notFound } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin/permissions";
import { listCommunicationHistory } from "@/app/admin/communicationActions";
import { CommunicationCenter } from "@/components/admin/CommunicationCenter";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";

export default async function AdminCommunicationsPage() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "super_admin") notFound();

  const result = await listCommunicationHistory();
  const history = "data" in result ? result.data : [];

  const providerConfigured = Boolean(process.env.EMAIL_PROVIDER_API_KEY || process.env.SMS_PROVIDER_API_KEY);

  return (
    <PageContainer width="standard">
      <PageHeader title="Communications" description="Admin-initiated email and SMS to owners, with real send history." />

      {!providerConfigured && (
        <div className="mt-4">
          <Alert tone="warning">
            No email or SMS provider is configured in this environment. Messages can be composed and recorded, but
            nothing will actually be delivered until a real provider is configured (see{" "}
            <code className="font-mono text-xs">src/lib/communication/provider.ts</code> for the exact environment
            variables required).
          </Alert>
        </div>
      )}

      <div className="mt-6">
        <CommunicationCenter initialHistory={history} />
      </div>
    </PageContainer>
  );
}
