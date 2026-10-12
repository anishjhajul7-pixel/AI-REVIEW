"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/admin/permissions";

/**
 * The real fix for the Batch 3 finding: the dashboard's "Recent Audit
 * Trail → View all" linked to Notifications — an unrelated feature —
 * because no dedicated audit-log browse destination existed anywhere.
 * This reuses the exact same audit_logs table and its existing
 * audit_logs_select_admin RLS policy (is_admin(), the same read access
 * every admin role already had) — not a new table, not a new policy,
 * not a parallel audit system.
 */

export interface AuditLogRow {
  id: string;
  adminUserId: string | null;
  adminEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  result: "success" | "failure";
  createdAt: string;
}

const PAGE_SIZE = 25;

export async function searchAuditLogs(
  query: string,
  resultFilter: "all" | "success" | "failure",
  page: number
): Promise<{ data: AuditLogRow[]; page: number; totalPages: number } | { error: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Not authorized." };

  const supabase = await createClient();
  const trimmed = query.trim();
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let builder = supabase
    .from("audit_logs")
    .select("id, admin_user_id, action, target_type, target_id, result, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (resultFilter !== "all") builder = builder.eq("result", resultFilter);
  if (trimmed) builder = builder.or(`action.ilike.%${trimmed}%,target_type.ilike.%${trimmed}%`);

  const { data, error, count } = await builder.range(from, to);
  if (error) return { error: error.message };

  // Resolve admin emails in one batch, not per-row — same pattern as
  // the existing AdminManagementTable, not a new approach.
  const adminIds = [...new Set((data ?? []).map((r) => r.admin_user_id).filter((id): id is string => Boolean(id)))];
  const emailByAdminId = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, email").in("user_id", adminIds);
    for (const p of profiles ?? []) {
      if (p.email) emailByAdminId.set(p.user_id, p.email);
    }
  }

  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      adminUserId: r.admin_user_id,
      adminEmail: r.admin_user_id ? (emailByAdminId.get(r.admin_user_id) ?? null) : null,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      result: r.result as "success" | "failure",
      createdAt: r.created_at,
    })),
    page: safePage,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
}
