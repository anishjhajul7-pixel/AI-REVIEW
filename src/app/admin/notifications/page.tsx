import { listNotifications } from "@/app/admin/notificationActions";
import { NotificationCenter } from "@/components/admin/NotificationCenter";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AdminNotificationsPage() {
  const result = await listNotifications();

  return (
    <PageContainer width="standard">
      <PageHeader
        title="Notifications"
        description="Platform events and entitlements approaching expiry — a shared inbox visible to every admin."
      />

      <div className="mt-6">
        {"error" in result ? (
          <p className="rounded-[var(--radius-md)] border border-danger/20 bg-danger-tint p-4 text-sm text-danger">
            {result.error}
          </p>
        ) : (
          <NotificationCenter initialNotifications={result.data} />
        )}
      </div>
    </PageContainer>
  );
}
