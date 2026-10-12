import "server-only";
import type { createClient } from "@/lib/supabase/server";

/**
 * The real gap found during the master integration audit: Super
 * Admin's owner-level suspension (owner_entitlements.subscription_status)
 * was computed everywhere via computeEffectiveEntitlement() but only
 * ever actually ENFORCED in one place — createBusiness(), blocking new
 * workspace creation. Nothing stopped a suspended/disabled owner from
 * continuing to use their existing dashboard and mutate existing data.
 *
 * This is the single, shared, server-side guard every mutating
 * dashboard server action should call at its start — not a second,
 * parallel status system, just a reusable wrapper around the exact
 * same owner_entitlements.subscription_status column and the exact
 * same "not 'active'" rule already used by createBusiness() and
 * getActiveBusiness(). A read of this table, not a cached or
 * duplicated value — always current as of the call.
 *
 * Deliberately does NOT block reads/page rendering here — that's the
 * dashboard layout's job (a full blocking screen, see
 * dashboard/layout.tsx), so the owner can actually see *why* they're
 * blocked rather than hitting a silent, confusing failure on their
 * first write attempt. This function is the write-time backstop for
 * any request that reaches a server action directly — a stale tab
 * still showing the dashboard from before suspension, for instance.
 */
export async function requireActiveOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: entitlement } = await supabase
    .from("owner_entitlements")
    .select("subscription_status")
    .eq("owner_id", ownerId)
    .maybeSingle();

  // No entitlement row at all is the existing, documented Phase 1
  // compatibility state ("not yet individually configured") — not a
  // restriction, matching computeEffectiveEntitlement()'s own rule
  // exactly, not a second, drifting copy of it.
  if (!entitlement || entitlement.subscription_status === "active") {
    return { ok: true };
  }

  return {
    ok: false,
    error:
      entitlement.subscription_status === "expired"
        ? "Your subscription has expired. Contact Banao Digital to renew."
        : "Your account access is currently restricted. Contact Banao Digital for assistance.",
  };
}

/**
 * Convenience wrapper for the common case at the top of a mutating
 * action: resolve the current user, then check them. Reduces each call
 * site to one line instead of repeating supabase.auth.getUser() plus
 * the check every time — same underlying logic, not a different rule.
 * Returns ok: true when there's no signed-in user too (an action with
 * no user will fail its own auth check immediately after anyway; this
 * helper's only job is the subscription check, not re-implementing
 * authentication).
 */
export async function guardActiveOwnerWrite(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: true };
  return requireActiveOwner(supabase, user.id);
}
