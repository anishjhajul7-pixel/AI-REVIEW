import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { BanaoAttribution } from "@/components/ui/BanaoAttribution";
import { getUnreadNotificationCount } from "@/app/dashboard/notifications/actions";
import { getActiveBusiness } from "@/lib/business/activeBusiness";
import { BusinessSwitcher } from "@/components/dashboard/BusinessSwitcher";
import { getBanaoContactDestination } from "@/lib/config/contact";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  // Defense in depth: middleware already redirects unauthenticated requests
  // away from /dashboard, but every server entry point should verify the
  // session independently rather than trusting the client.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { business, availableBusinesses, multistoreEnabled, maxBusinesses, subscriptionBlocked, subscriptionStatus } =
    await getActiveBusiness(supabase);
  const unreadNotificationCount = await getUnreadNotificationCount();
  const contact = getBanaoContactDestination();

  const header = (
    <DashboardHeader
      businessName={business?.business_name ?? null}
      email={user.email ?? ""}
      unreadNotificationCount={unreadNotificationCount}
      switcher={
        <BusinessSwitcher
          activeBusinessId={business?.id ?? null}
          businesses={availableBusinesses}
          multistoreEnabled={multistoreEnabled}
          maxBusinesses={maxBusinesses}
          subscriptionBlocked={subscriptionBlocked}
          contact={contact}
        />
      }
    />
  );

  // The real fix for the audit's primary finding: subscriptionBlocked
  // was being computed correctly but only ever consulted by
  // BusinessSwitcher to grey out "Add Business" — every other part of
  // the dashboard remained fully usable for a suspended/disabled owner.
  // This blocks the entire dashboard body (not just one action),
  // server-side, on every request — not a client-side redirect that a
  // stale tab could race past. The header still renders so the owner
  // can sign out and isn't trapped with no way out of the app.
  if (subscriptionBlocked) {
    return (
      <div className="flex min-h-screen flex-col">
        {header}
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <div className="rounded-[var(--radius-lg)] border border-danger/20 bg-danger-tint p-6 shadow-sm">
            <p className="font-display text-lg font-semibold text-danger">Account access restricted</p>
            <p className="mt-2 text-sm text-ink-soft">
              {subscriptionStatus === "expired"
                ? "Your subscription has expired. Contact Banao Digital to renew access to your dashboard."
                : "Your account access is currently restricted. Contact Banao Digital for assistance."}
            </p>
            {(contact.whatsappUrl || contact.contactUrl) && (
              <a
                href={contact.whatsappUrl ?? contact.contactUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-verified px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                Contact Banao Digital
              </a>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      {/* Responsive horizontal inset — 16px mobile / 24px tablet / 32px
          desktop, matching the layout system's specified targets
          exactly (was a flat px-6/24px at every width before). Applied
          once here, at the shell; PageContainer (used inside individual
          pages) intentionally does not re-apply its own horizontal
          padding to avoid doubling it. */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6 lg:px-8 md:flex-row">
        <Sidebar />
        {/* Extra bottom padding on mobile only — clears the fixed
            MobileBottomNav so content is never hidden behind it. */}
        <main className="min-w-0 flex-1 py-6 pb-24 md:py-8 md:pb-8 md:pl-8">{children}</main>
      </div>
      <footer className="hidden border-t border-border px-6 py-5 md:block">
        <div className="mx-auto flex w-full max-w-6xl justify-center md:justify-start">
          <BanaoAttribution />
        </div>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
